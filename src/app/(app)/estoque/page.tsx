import { getSessionProfile } from "@/lib/auth";
import { listInventoryLots, openStagesByLot, orgStock, listProducts } from "@/lib/queries";
import { Section, Empty } from "@/components/ui";
import { advanceLotStageAction } from "./actions";
import { LossForm } from "./LossForm";

export const dynamic = "force-dynamic";

const stageLabel: Record<string, string> = {
  raw_material_reserved: "Insumo reservado",
  in_production: "Em produção",
  finished_goods: "Produto acabado",
  in_transit: "Em trânsito",
  distributor_stock: "Estoque do distribuidor",
  sold: "Vendido",
};
const STAGES = Object.keys(stageLabel);

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default async function EstoquePage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [stock, lots, products] = await Promise.all([
    orgStock(profile.org.id),
    listInventoryLots(profile.org.id),
    listProducts(profile.org.id),
  ]);
  const stages = await openStagesByLot(lots.map((l) => l.id));

  return (
    <main>
      <h1 className="h1">Estoque</h1>

      <Section title="Saldo por variação">
        {!stock.length ? (
          <Empty>Nenhum movimento de estoque ainda.</Empty>
        ) : (
          <ul className="space-y-2">
            {stock.map((s) => (
              <li key={s.variantId} className="card flex items-center justify-between p-3">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs muted">{s.product}</div>
                </div>
                <div className="tabular font-bold">{s.qty}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Lotes (validade e etapa)">
        {!lots.length ? (
          <Empty>Nenhum lote com controle de validade ainda — lote é opcional.</Empty>
        ) : (
          <ul className="space-y-2">
            {lots.map((l) => {
              const variant = l.product_variants as unknown as { name: string; products: { name: string } } | null;
              const stage = stages.get(l.id);
              const stageIdx = stage ? STAGES.indexOf(stage.stage) : -1;
              const next = STAGES[stageIdx + 1];
              const days = l.expires_on ? daysUntil(l.expires_on) : null;
              return (
                <li key={l.id} className="card space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        {variant?.products?.name} · {variant?.name}
                        {l.lot_number ? ` · lote ${l.lot_number}` : ""}
                      </div>
                      <div className="text-xs muted">
                        {l.qty_remaining} un restantes
                        {l.expires_on &&
                          ` · vence em ${new Date(l.expires_on).toLocaleDateString("pt-BR")}` +
                          (days !== null ? ` (${days >= 0 ? `${days}d` : "vencido"})` : "")}
                      </div>
                    </div>
                    {days !== null && days <= 7 && (
                      <span className={`chip ${days < 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {days < 0 ? "vencido" : "vence logo"}
                      </span>
                    )}
                  </div>
                  {stage && (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="muted">Etapa: {stageLabel[stage.stage]}</span>
                      {next && (
                        <form action={advanceLotStageAction}>
                          <input type="hidden" name="lot_id" value={l.id} />
                          <input type="hidden" name="current_stage" value={stage.stage} />
                          <button className="btn-ghost">Avançar para {stageLabel[next]} →</button>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Lançar perda">
        <LossForm products={products} lots={lots} />
      </Section>
    </main>
  );
}
