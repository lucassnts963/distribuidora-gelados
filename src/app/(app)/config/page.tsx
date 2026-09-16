import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { getLoyaltySettings } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { Section } from "@/components/ui";
import { signOutAction } from "@/app/actions";
import { InviteMemberForm } from "./InviteMemberForm";
import { CommissionForm } from "./CommissionForm";
import { LogoUploadForm } from "./LogoUploadForm";
import { CatalogSlugForm } from "./CatalogSlugForm";
import { LoyaltySettingsForm } from "./LoyaltySettingsForm";
import { InviteQRCode } from "./InviteQRCode";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  staff: "Operador",
  vendedor: "Vendedor",
};

async function listMembers(orgId: string) {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role, commission_rate_bp")
    .eq("org_id", orgId);
  if (!profiles || profiles.length === 0) return [];

  const { data: usersPage } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email]) ?? []);
  return profiles.map((p) => ({ ...p, email: emailById.get(p.id) ?? "" }));
}

export default async function ConfigPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [members, loyaltySettings] = await Promise.all([
    listMembers(profile.org.id),
    getLoyaltySettings(profile.org.id),
  ]);

  return (
    <main>
      <h1 className="h1">Config</h1>

      <Section title="Organização">
        <div className="card space-y-2 p-4 text-sm">
          <div>
            <span className="muted">Nome:</span> {profile.org.name}
          </div>
          {profile.org.document && (
            <div>
              <span className="muted">Documento:</span> {profile.org.document}
            </div>
          )}
          <div>
            <span className="muted">Código de convite:</span>{" "}
            <span className="chip font-mono">{profile.org.inviteCode}</span>
          </div>
          <div className="flex items-center gap-3">
            <InviteQRCode inviteCode={profile.org.inviteCode} />
            <p className="text-xs muted">
              Mostre esse QR code pra quem for propor parceria com você — evita digitar o
              código errado.
            </p>
          </div>
        </div>
        {profile.role === "admin" && (
          <div className="card mt-3 space-y-4 p-4 text-sm">
            <div>
              <div className="lbl mb-1">Logo</div>
              <LogoUploadForm orgId={profile.org.id} logoUrl={profile.org.logoUrl} />
            </div>
            <CatalogSlugForm currentSlug={profile.org.catalogSlug} />
          </div>
        )}
      </Section>

      <Section title="Equipe">
        <div className="space-y-3">
          <div className="card divide-y p-0 text-sm">
            {members.map((m) => (
              <div key={m.id} className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.full_name || m.email}</div>
                    <div className="muted">{m.email}</div>
                  </div>
                  <span className="chip">{roleLabel[m.role] ?? m.role}</span>
                </div>
                {m.role === "vendedor" && profile.role === "admin" && (
                  <CommissionForm memberId={m.id} currentRateBp={m.commission_rate_bp} />
                )}
                {m.role === "vendedor" && profile.role !== "admin" && (
                  <p className="text-xs muted">
                    Comissão: {m.commission_rate_bp ? (m.commission_rate_bp / 100).toFixed(2) + "%" : "não definida"}
                  </p>
                )}
              </div>
            ))}
          </div>
          {profile.role === "admin" && members.some((m) => m.role === "vendedor") && (
            <Link href="/comissoes" className="card block p-3 text-sm font-semibold text-brand-600">
              Ver comissões do mês →
            </Link>
          )}
          {profile.role === "admin" && <InviteMemberForm />}
        </div>
      </Section>

      {profile.role === "admin" && (
        <Section title="Fidelidade">
          <div className="card p-4">
            <LoyaltySettingsForm settings={loyaltySettings} />
          </div>
        </Section>
      )}

      <Section title="Conta">
        <div className="card space-y-3 p-4 text-sm">
          <div>
            <span className="muted">Email:</span> {profile.email}
          </div>
          <div>
            <span className="muted">Papel:</span> {roleLabel[profile.role] ?? profile.role}
          </div>
          <form action={signOutAction}>
            <button className="btn-danger w-full">Sair</button>
          </form>
        </div>
      </Section>
    </main>
  );
}
