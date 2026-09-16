import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Section } from "@/components/ui";
import { signOutAction } from "@/app/actions";
import { InviteMemberForm } from "./InviteMemberForm";

export const dynamic = "force-dynamic";

async function listMembers(orgId: string) {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("org_id", orgId);
  if (!profiles || profiles.length === 0) return [];

  const { data: usersPage } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email]) ?? []);
  return profiles.map((p) => ({ ...p, email: emailById.get(p.id) ?? "" }));
}

export default async function ConfigPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const members = await listMembers(profile.org.id);

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
        </div>
      </Section>

      <Section title="Equipe">
        <div className="space-y-3">
          <div className="card divide-y p-0 text-sm">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{m.full_name || m.email}</div>
                  <div className="muted">{m.email}</div>
                </div>
                <span className="chip">{m.role === "admin" ? "Administrador" : "Operador"}</span>
              </div>
            ))}
          </div>
          {profile.role === "admin" && <InviteMemberForm />}
        </div>
      </Section>

      <Section title="Conta">
        <div className="card space-y-3 p-4 text-sm">
          <div>
            <span className="muted">Email:</span> {profile.email}
          </div>
          <div>
            <span className="muted">Papel:</span> {profile.role === "admin" ? "Administrador" : "Operador"}
          </div>
          <form action={signOutAction}>
            <button className="btn-danger w-full">Sair</button>
          </form>
        </div>
      </Section>
    </main>
  );
}
