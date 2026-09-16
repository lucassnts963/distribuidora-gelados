import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { Modal } from "@/components/Modal";
import { toggleOrgAccessAction } from "./actions";
import { TransferOrgForm } from "./TransferOrgForm";

export const dynamic = "force-dynamic";

async function listOrgs() {
  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name, document, plan, active, created_at")
    .order("created_at", { ascending: false });
  if (!orgs) return [];

  const { data: profiles } = await admin.from("profiles").select("org_id");
  const memberCountByOrg = new Map<string, number>();
  for (const p of profiles ?? []) {
    memberCountByOrg.set(p.org_id, (memberCountByOrg.get(p.org_id) ?? 0) + 1);
  }

  return orgs.map((o) => ({ ...o, memberCount: memberCountByOrg.get(o.id) ?? 0 }));
}

export default async function AdminPage() {
  if (!(await isSuperAdmin())) redirect("/");

  const orgs = await listOrgs();

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="h1">Painel da plataforma</h1>
      <p className="muted mt-1 text-sm">
        Todas as organizações cadastradas. Desativar bloqueia o acesso ao app pra quem está nela.
      </p>

      <div className="card mt-4 divide-y p-0">
        {orgs.map((org) => (
          <div key={org.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="truncate font-medium">{org.name}</div>
              <div className="muted text-xs">
                {org.document || "sem documento"} · {org.memberCount}{" "}
                {org.memberCount === 1 ? "membro" : "membros"} · plano {org.plan}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Modal triggerLabel="Transferir" triggerClassName="btn-ghost" title={`Transferir "${org.name}"`}>
                <TransferOrgForm orgId={org.id} memberCount={org.memberCount} />
              </Modal>
              <form action={toggleOrgAccessAction}>
                <input type="hidden" name="id" value={org.id} />
                <input type="hidden" name="active" value={String(!org.active)} />
                <SubmitButton className={org.active ? "btn-danger" : "btn-primary"} pendingText="...">
                  {org.active ? "Desativar" : "Ativar"}
                </SubmitButton>
              </form>
            </div>
          </div>
        ))}
        {orgs.length === 0 && <div className="p-4 text-sm muted">Nenhuma organização ainda.</div>}
      </div>
    </main>
  );
}
