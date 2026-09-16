"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toCents } from "@/lib/format";

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

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * organizations_update (RLS) já libera isso pra admin da própria
 * organização — sem precisar de service role aqui.
 */
export async function saveCatalogSlugAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") return { error: "Só um administrador pode mudar isso." };

  const raw = s(form, "catalog_slug");
  const slug = raw ? slugify(raw) : null;

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ catalog_slug: slug }).eq("id", profile.org.id);
  if (error) {
    if (error.code === "23505") return { error: "Esse endereço já está em uso por outra organização." };
    return { error: "Não deu pra salvar: " + error.message };
  }

  revalidatePath("/config");
  return { ok: true, slug };
}

export async function setOrgLogoAction(form: FormData) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") return;

  const logoUrl = s(form, "logo_url");
  const supabase = await createClient();
  await supabase.from("organizations").update({ logo_url: logoUrl || null }).eq("id", profile.org.id);
  revalidatePath("/config");
}

function toNumber(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function saveLoyaltySettingsAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") return { error: "Só um administrador pode mudar isso." };

  const enabled = s(form, "enabled") === "on";
  const pointsWholesale = toNumber(s(form, "points_per_100_wholesale"));
  const pointsRetail = toNumber(s(form, "points_per_100_retail"));
  // Campo no formulário é em reais (ex: "0,50"); a coluna guarda em centavos,
  // mesmo padrão de todo valor monetário no resto do app.
  const redeemCentsPerPoint = toCents(s(form, "redeem_cents_per_point"));

  const supabase = await createClient();
  const { error } = await supabase.from("loyalty_settings").upsert(
    {
      org_id: profile.org.id,
      enabled,
      points_per_100_wholesale: pointsWholesale,
      points_per_100_retail: pointsRetail,
      redeem_cents_per_point: redeemCentsPerPoint,
    },
    { onConflict: "org_id" }
  );
  if (error) return { error: "Não deu pra salvar: " + error.message };

  revalidatePath("/config");
  revalidatePath("/vendas");
  return { ok: true };
}
