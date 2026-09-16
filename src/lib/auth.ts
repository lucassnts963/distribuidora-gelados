import { createClient } from "@/lib/supabase/server";
import { listDisabledModules } from "@/lib/queries";
import type { ModuleKey } from "@/lib/modules";

export type SessionProfile = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: "admin" | "staff";
  notificationsSeenAt: string | null;
  org: { id: string; name: string; document: string | null; inviteCode: string; active: boolean; plan: string };
  capabilities: {
    hasOwnProducts: boolean;
    supplierPartnerCount: number;
    buyerPartnerCount: number;
  };
  disabledModules: Set<ModuleKey>;
};

/**
 * Sessao + perfil + organizacao + um resumo de capacidades calculado na hora
 * (nunca um "tipo" fixo - ver plano). null quando nao ha sessao, ou quando ha
 * sessao mas o usuario ainda nao criou/entrou numa organizacao (onboarding).
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, notifications_seen_at, organizations(id, name, document, invite_code, active, plan)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.organizations) return null;
  const org = profile.organizations as unknown as {
    id: string;
    name: string;
    document: string | null;
    invite_code: string;
    active: boolean;
    plan: string;
  };

  const [{ count: productsCount }, { count: supplierCount }, { count: buyerCount }, disabledModules] =
    await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("owner_org_id", org.id),
      supabase
        .from("partnerships")
        .select("id", { count: "exact", head: true })
        .eq("supplier_org_id", org.id)
        .eq("status", "active"),
      supabase
        .from("partnerships")
        .select("id", { count: "exact", head: true })
        .eq("buyer_org_id", org.id)
        .eq("status", "active"),
      listDisabledModules(org.id),
    ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role as "admin" | "staff",
    notificationsSeenAt: profile.notifications_seen_at,
    org: {
      id: org.id,
      name: org.name,
      document: org.document,
      inviteCode: org.invite_code,
      active: org.active,
      plan: org.plan,
    },
    capabilities: {
      hasOwnProducts: (productsCount ?? 0) > 0,
      supplierPartnerCount: supplierCount ?? 0,
      buyerPartnerCount: buyerCount ?? 0,
    },
    disabledModules,
  };
}

/**
 * Verifica via RLS (policy platform_admins_select_self) se o usuário logado
 * é dono da plataforma. Não confundir com role "admin" de profiles, que é
 * permissão dentro de uma organização.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data;
}
