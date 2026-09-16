import { createClient } from "@/lib/supabase/server";

export type SessionProfile = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: "admin" | "staff";
  org: { id: string; name: string; document: string | null; inviteCode: string };
  capabilities: {
    hasOwnProducts: boolean;
    supplierPartnerCount: number;
    buyerPartnerCount: number;
  };
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
    .select("role, full_name, organizations(id, name, document, invite_code)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.organizations) return null;
  const org = profile.organizations as unknown as {
    id: string;
    name: string;
    document: string | null;
    invite_code: string;
  };

  const [{ count: productsCount }, { count: supplierCount }, { count: buyerCount }] =
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
    ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role as "admin" | "staff",
    org: { id: org.id, name: org.name, document: org.document, inviteCode: org.invite_code },
    capabilities: {
      hasOwnProducts: (productsCount ?? 0) > 0,
      supplierPartnerCount: supplierCount ?? 0,
      buyerPartnerCount: buyerCount ?? 0,
    },
  };
}
