"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function signUpAction(_: unknown, form: FormData) {
  const email = s(form, "email");
  const password = s(form, "password");
  if (!email || !password) return { error: "Preencha email e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  redirect("/onboarding");
}

export async function signInAction(_: unknown, form: FormData) {
  const email = s(form, "email");
  const password = s(form, "password");
  if (!email || !password) return { error: "Preencha email e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email ou senha incorretos." };
  redirect("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createOrganizationAction(_: unknown, form: FormData) {
  const name = s(form, "name");
  const document = s(form, "document");
  if (!name) return { error: "Informe o nome da organização." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gera o id aqui e não pede a linha de volta (sem .select()): logo após o
  // insert, o usuário ainda não tem profile, e a policy de SELECT de
  // organizations depende de my_org_id() (por sua vez de profiles) — pedir a
  // linha de volta faria o Postgres tentar reler sob RLS e falhar com "new
  // row violates row-level security policy", mesmo o INSERT sendo válido.
  const orgId = crypto.randomUUID();
  const { error: orgError } = await supabase
    .from("organizations")
    .insert({ id: orgId, name, document: document || null });
  if (orgError) return { error: "Não deu pra criar a organização: " + orgError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: user!.id, org_id: orgId, role: "admin", full_name: user!.email });
  if (profileError) return { error: "Não deu pra criar o perfil: " + profileError.message };

  redirect("/");
}

export async function proposePartnershipAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const inviteCode = s(form, "invite_code");
  const role = s(form, "role"); // "supplier" ou "buyer" - o papel do ALVO na relação
  if (!inviteCode) return { error: "Informe o código de convite." };

  const supabase = await createClient();
  const { data: target, error: lookupError } = await supabase
    .rpc("lookup_org_by_invite_code", { p_code: inviteCode })
    .maybeSingle();
  if (lookupError || !target) return { error: "Código não encontrado." };

  const isTargetSupplier = role === "supplier";
  const supplier_org_id = isTargetSupplier ? (target as { id: string }).id : profile.org.id;
  const buyer_org_id = isTargetSupplier ? profile.org.id : (target as { id: string }).id;

  const { error } = await supabase
    .from("partnerships")
    .insert({ supplier_org_id, buyer_org_id, status: "pending" });
  if (error) return { error: "Não deu pra propor a parceria: " + error.message };

  revalidatePath("/parcerias");
  return { ok: true };
}

export async function decidePartnershipAction(form: FormData) {
  const id = s(form, "id");
  const status = s(form, "status"); // "active" ou "revoked"
  const supabase = await createClient();
  await supabase
    .from("partnerships")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/parcerias");
}
