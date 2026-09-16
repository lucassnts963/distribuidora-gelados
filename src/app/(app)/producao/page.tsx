import { getSessionProfile } from "@/lib/auth";
import { listProducts, listProductionBatches, listCapacityPlans, listVariantIdsWithRecipe } from "@/lib/queries";
import { Section, Empty } from "@/components/ui";
import { startBatchAction, cancelBatchAction } from "./actions";
import { NewBatchForm } from "./NewBatchForm";
import { CompleteBatchForm } from "./CompleteBatchForm";
import { CapacityPlanForm } from "./CapacityPlanForm";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  planned: "Planejado",
  in_progress: "Em produção",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default async function ProducaoPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [products, batches, plans, variantsWithRecipe] = await Promise.all([
    listProducts(profile.org.id),
    listProductionBatches(profile.org.id),
    listCapacityPlans(profile.org.id),
    listVariantIdsWithRecipe(profile.org.id),
  ]);

  return (
    <main>
      <h1 className="h1">Produção</h1>

      <Section title="Lotes de produção">
        {!batches.length ? (
          <Empty>Nenhum lote de produção ainda.</Empty>
        ) : (
          <ul className="space-y-2">
            {batches.map((b) => {
              const product = b.products as unknown as { name: string } | null;
              const variant = b.product_variants as unknown as { name: string } | null;
              return (
                <li key={b.id} className="card space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        {product?.name}
                        {variant ? ` · ${variant.name}` : ""}
                        {b.batch_number ? ` · ${b.batch_number}` : ""}
                      </div>
                      <div className="text-xs muted">
                        {statusLabel[b.status]}
                        {b.planned_qty ? ` · planejado ${b.planned_qty}` : ""}
                        {b.produced_qty ? ` · produzido ${b.produced_qty}` : ""}
                      </div>
                    </div>
                    {b.status === "planned" && (
                      <div className="flex gap-2">
                        <form action={startBatchAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <button className="btn-primary">Iniciar</button>
                        </form>
                        <form action={cancelBatchAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <button className="btn-ghost">Cancelar</button>
                        </form>
                      </div>
                    )}
                  </div>
                  {b.status === "in_progress" && (
                    <CompleteBatchForm
                      batchId={b.id}
                      products={products}
                      defaultVariantId={b.variant_id}
                      batchNumber={b.batch_number}
                      plannedQty={b.planned_qty}
                      variantsWithRecipe={variantsWithRecipe}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3">
          <NewBatchForm products={products} />
        </div>
      </Section>

      <Section title="Capacidade produtiva">
        {!plans.length ? (
          <Empty>Nenhum plano de capacidade ainda.</Empty>
        ) : (
          <ul className="space-y-2">
            {plans.map((p) => {
              const variant = p.product_variants as unknown as { name: string } | null;
              return (
                <li key={p.id} className="card p-3 text-sm">
                  <div className="font-semibold">
                    {variant?.name ?? "Geral"} · {p.planned_qty} un
                  </div>
                  <div className="text-xs muted">
                    {new Date(p.period_start).toLocaleDateString("pt-BR")} –{" "}
                    {new Date(p.period_end).toLocaleDateString("pt-BR")}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3">
          <CapacityPlanForm products={products} />
        </div>
      </Section>
    </main>
  );
}
