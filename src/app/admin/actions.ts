"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/**
 * Update direto pelo client normal (RLS) — a policy organizations_update já
 * libera isso só pra quem está em platform_admins; sem checagem extra aqui
 * porque, se a policy negar, o update simplesmente afeta 0 linhas.
 */
export async function toggleOrgAccessAction(form: FormData) {
  const id = s(form, "id");
  const active = s(form, "active") === "true";

  const supabase = await createClient();
  await supabase.from("organizations").update({ active }).eq("id", id);

  revalidatePath("/admin");
}

/**
 * Muda o dono de uma organização de uma conta pra outra. Quem estava nela
 * (admin atual e colegas) perde acesso — só a conta de destino fica com a
 * organização. profiles.org_id/role só são graváveis pela service role
 * (Parte G), então isso só existe aqui, atrás do isSuperAdmin().
 */
export async function transferOrganizationAction(_: unknown, form: FormData) {
  if (!(await isSuperAdmin())) return { error: "Sem permissão." };

  const orgId = s(form, "org_id");
  const email = s(form, "email");
  if (!email) return { error: "Informe o email da conta de destino." };

  const admin = createAdminClient();

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) return { error: "Não deu pra buscar o usuário: " + listError.message };
  const target = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!target) return { error: "Não achei nenhuma conta com esse email." };

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("org_id")
    .eq("id", target.id)
    .maybeSingle();

  if (targetProfile) {
    if (targetProfile.org_id === orgId) {
      return { error: "Essa conta já é dona dessa organização." };
    }
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("org_id", targetProfile.org_id);
    if ((count ?? 0) > 1) {
      return {
        error: "Essa conta já pertence a outra organização com mais gente nela — decida isso antes de transferir.",
      };
    }
    const { error: detachError } = await admin.from("profiles").delete().eq("id", target.id);
    if (detachError) return { error: "Não deu pra desvincular a organização antiga: " + detachError.message };
  }

  const { error: clearError } = await admin.from("profiles").delete().eq("org_id", orgId);
  if (clearError) return { error: "Não deu pra remover os membros atuais: " + clearError.message };

  const { error: insertError } = await admin
    .from("profiles")
    .insert({ id: target.id, org_id: orgId, role: "admin", full_name: target.email });
  if (insertError) return { error: "Não deu pra transferir: " + insertError.message };

  revalidatePath("/admin");
  return { ok: true };
}
