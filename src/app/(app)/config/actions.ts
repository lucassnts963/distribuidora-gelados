"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function inviteMemberAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };
  if (profile.role !== "admin") return { error: "Só um administrador pode convidar." };

  const email = s(form, "email");
  const fullName = s(form, "full_name");
  const roleInput = s(form, "role");
  const role = roleInput === "admin" || roleInput === "vendedor" ? roleInput : "staff";
  if (!email) return { error: "Informe o email." };

  const admin = createAdminClient();

  let userId: string | null = null;
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
  if (invited?.user) {
    userId = invited.user.id;
  } else {
    // provavelmente já existe uma conta com esse email
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) return { error: "Não deu pra convidar: " + (inviteError?.message ?? listError.message) };
    const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) return { error: "Não deu pra convidar: " + (inviteError?.message ?? "erro desconhecido") };
    userId = existing.id;
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();
  if (existingProfile) {
    if (existingProfile.org_id !== profile.org.id) {
      return { error: "Esse email já está em outra organização." };
    }
    return { error: "Essa pessoa já faz parte da sua organização." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: userId, org_id: profile.org.id, role, full_name: fullName || email });
  if (profileError) return { error: "Não deu pra vincular: " + profileError.message };

  revalidatePath("/config");
  return { ok: true };
}

/**
 * commission_rate_bp não entra no grant restrito da Parte G — mesmo
 * motivo de role/org_id, é algo que só o admin decide sobre outra
 * pessoa, nunca a própria. Escrita sempre pela service role.
 */
export async function setCommissionRateAction(form: FormData) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") return;

  const memberId = s(form, "member_id");
  const rateInput = s(form, "rate_percent").replace(",", ".");
  const ratePercent = rateInput ? Number(rateInput) : null;
  const rateBp = ratePercent !== null && Number.isFinite(ratePercent) ? Math.round(ratePercent * 100) : null;

  const admin = createAdminClient();
  const { data: member } = await admin.from("profiles").select("org_id").eq("id", memberId).maybeSingle();
  if (!member || member.org_id !== profile.org.id) return;

  await admin.from("profiles").update({ commission_rate_bp: rateBp }).eq("id", memberId);
  revalidatePath("/config");
}
