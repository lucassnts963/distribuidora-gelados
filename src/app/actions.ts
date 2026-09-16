"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, document: document || null })
    .select("id")
    .single();
  if (orgError || !org) return { error: "Não deu pra criar a organização: " + orgError?.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: user!.id, org_id: org.id, role: "admin", full_name: user!.email });
  if (profileError) return { error: "Não deu pra criar o perfil: " + profileError.message };

  redirect("/");
}

export async function proposePartnershipAction(_: unknown, form: FormData) {
  const inviteCode = s(form, "invite_code");
  const role = s(form, "role"); // "supplier" ou "buyer" - o papel do ALVO na relação
  if (!inviteCode) return { error: "Informe o código de convite." };

  const supabase = await createClient();
  const { data: target, error: lookupError } = await supabase
    .rpc("lookup_org_by_invite_code", { p_code: inviteCode })
    .maybeSingle();
  if (lookupError || !target) return { error: "Código não encontrado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .single();
  if (!profile) return { error: "Sessão inválida." };

  const isTargetSupplier = role === "supplier";
  const supplier_org_id = isTargetSupplier ? (target as { id: string }).id : profile.org_id;
  const buyer_org_id = isTargetSupplier ? profile.org_id : (target as { id: string }).id;

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
