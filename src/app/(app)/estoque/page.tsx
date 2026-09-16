import { getSessionProfile } from "@/lib/auth";
import { listInventoryLots, openStagesByLot, orgStock, listProducts } from "@/lib/queries";
import { Section } from "@/components/ui";
import { LossForm } from "./LossForm";
import { EstoqueList } from "./EstoqueList";

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

  const lotRows = lots.map((l) => {
    const variant = l.product_variants as unknown as { name: string; products: { name: string } } | null;
    const stage = stages.get(l.id);
    const stageIdx = stage ? STAGES.indexOf(stage.stage) : -1;
    const next = STAGES[stageIdx + 1];
    const days = l.expires_on ? daysUntil(l.expires_on) : null;
    return {
      id: l.id,
      productName: variant?.products?.name ?? "—",
      variantName: variant?.name ?? "—",
      lotNumber: l.lot_number,
      qtyRemaining: l.qty_remaining,
      expiresOn: l.expires_on,
      days,
      stageKey: stage?.stage,
      stageLabel: stage ? stageLabel[stage.stage] : null,
      nextLabel: next ? stageLabel[next] : null,
      nextKey: next,
    };
  });

  return (
    <main>
      <h1 className="h1">Estoque</h1>

      <EstoqueList stock={stock} lots={lotRows} />

      <Section title="Lançar perda">
        <LossForm products={products} lots={lots} />
      </Section>
    </main>
  );
}
