import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Section, Empty } from "@/components/ui";
import { decidePartnershipAction } from "@/app/actions";
import { PartnershipForm } from "./PartnershipForm";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  revoked: "Encerrada",
};
const statusTone: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-giroteal-100 text-giroteal-700",
  revoked: "bg-stone-100 text-stone-500",
};

function StatusChip({ status }: { status: string }) {
  return <span className={`chip ${statusTone[status]}`}>{statusLabel[status]}</span>;
}

export default async function ParceriasPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const supabase = await createClient();

  const [{ data: asSupplier }, { data: asBuyer }] = await Promise.all([
    supabase
      .from("partnerships")
      .select("id, status, created_at, buyer:organizations!buyer_org_id(id, name)")
      .eq("supplier_org_id", profile.org.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("partnerships")
      .select("id, status, created_at, supplier:organizations!supplier_org_id(id, name)")
      .eq("buyer_org_id", profile.org.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main>
      <h1 className="h1">Parcerias</h1>
      <p className="text-sm muted">
        Seu código de convite: <span className="chip font-mono">{profile.org.inviteCode}</span>{" "}
        (compartilhe com quem vai propor parceria com você)
      </p>

      <Section title="Meus clientes (eu sou o fornecedor)">
        {!asSupplier?.length ? (
          <Empty>Ninguém propôs comprar de você ainda.</Empty>
        ) : (
          <ul className="space-y-2">
            {asSupplier.map((row) => {
              const buyer = row.buyer as unknown as { id: string; name: string } | null;
              return (
                <li key={row.id} className="card flex items-center justify-between gap-2 p-3">
                  <div>
                    <div className="font-semibold">{buyer?.name ?? "—"}</div>
                    <StatusChip status={row.status} />
                  </div>
                  {row.status === "pending" && (
                    <div className="flex gap-2">
                      <form action={decidePartnershipAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="status" value="active" />
                        <button className="btn-primary">Aceitar</button>
                      </form>
                      <form action={decidePartnershipAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="status" value="revoked" />
                        <button className="btn-ghost">Recusar</button>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Meus fornecedores (eu sou o comprador)">
        {!asBuyer?.length ? (
          <Empty>Você ainda não propôs comprar de ninguém.</Empty>
        ) : (
          <ul className="space-y-2">
            {asBuyer.map((row) => {
              const supplier = row.supplier as unknown as { id: string; name: string } | null;
              return (
                <li key={row.id} className="card flex items-center justify-between gap-2 p-3">
                  <div>
                    <div className="font-semibold">{supplier?.name ?? "—"}</div>
                    <StatusChip status={row.status} />
                  </div>
                  {row.status !== "revoked" && (
                    <form action={decidePartnershipAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="status" value="revoked" />
                      <button className="btn-ghost">Cancelar</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Propor nova parceria">
        <PartnershipForm />
      </Section>
    </main>
  );
}
