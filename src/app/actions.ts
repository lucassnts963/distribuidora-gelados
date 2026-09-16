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

  // Organização + profile numa função security definer: o client não tem
  // (nem pode ter) permissão de escrever org_id/role em profiles, senão
  // qualquer usuário se moveria pra dentro de outro tenant. A função também
  // resolve o ovo-e-galinha de RLS que existia aqui, já que roda com
  // privilégio próprio em vez de depender de my_org_id().
  const { error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_document: document || null,
  });
  if (error) return { error: "Não deu pra criar a organização: " + error.message };

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

/**
 * Lead time é dado do lado comprador (quanto tempo MEUS pedidos desse
 * fornecedor demoram) — só quem compra edita, nunca o fornecedor.
 */
export async function setLeadTimeAction(form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return;

  const id = s(form, "id");
  const daysInput = s(form, "lead_time_days");
  const days = daysInput ? Number(daysInput) : null;

  const supabase = await createClient();
  await supabase
    .from("partnerships")
    .update({ lead_time_days: days !== null && Number.isFinite(days) ? Math.round(days) : null })
    .eq("id", id)
    .eq("buyer_org_id", profile.org.id);

  revalidatePath("/parcerias");
  revalidatePath("/relatorios");
}
