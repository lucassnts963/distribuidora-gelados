import { getSessionProfile } from "@/lib/auth";
import { Section } from "@/components/ui";
import { signOutAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

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
