import { getSessionProfile } from "@/lib/auth";
import { listRawMaterials, rawMaterialBalance, listRawMaterialMovements } from "@/lib/queries";
import { Section, Empty } from "@/components/ui";
import { MovementForm } from "./MovementForm";

export const dynamic = "force-dynamic";

export default async function RawMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getSessionProfile();
  if (!profile) return null;

  const materials = await listRawMaterials(profile.org.id);
  const material = materials.find((m) => m.id === id);
  if (!material) return <main><Empty>Insumo não encontrado.</Empty></main>;

  const [balance, movements] = await Promise.all([
    rawMaterialBalance(id),
    listRawMaterialMovements(id),
  ]);

  return (
    <main>
      <h1 className="h1">{material.name}</h1>
      <p className="tabular text-sm muted">
        Saldo atual: {balance} {material.unit}
      </p>

      <Section title="Lançar movimento">
        <MovementForm rawMaterialId={id} />
      </Section>

      <Section title="Histórico">
        {!movements.length ? (
          <Empty>Nenhum movimento ainda.</Empty>
        ) : (
          <ul className="space-y-2">
            {movements.map((m) => (
              <li key={m.id} className="card flex items-center justify-between p-3 text-sm">
                <div>
                  <div className={m.direction === "in" ? "text-emerald-700" : "text-red-700"}>
                    {m.direction === "in" ? "Entrada" : "Saída"}: {m.qty} {material.unit}
                  </div>
                  <div className="text-xs muted">
                    {new Date(m.occurred_at).toLocaleDateString("pt-BR")}
                    {m.batch_number ? ` · lote ${m.batch_number}` : ""}
                    {m.expires_on ? ` · vence ${new Date(m.expires_on).toLocaleDateString("pt-BR")}` : ""}
                    {m.reason ? ` · ${m.reason}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
  );
}
