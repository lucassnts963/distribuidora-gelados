import { getSessionProfile } from "@/lib/auth";
import {
  periodSummary,
  channelBreakdown,
  stockValue,
  listActiveSuppliers,
  supplierAvailableStock,
  reorderSuggestions,
} from "@/lib/queries";
import { Section, Empty, Stat } from "@/components/ui";
import { monthOf, monthStart, monthEnd, fmtMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const month = monthOf();
  const from = monthStart(month);
  const to = monthEnd(month);

  const [summary, channels, stock, suppliers, reorders] = await Promise.all([
    periodSummary(profile.org.id, from, to),
    channelBreakdown(profile.org.id, from, to),
    stockValue(profile.org.id),
    listActiveSuppliers(profile.org.id),
    reorderSuggestions(profile.org.id),
  ]);

  const supplierStocks = await Promise.all(
    suppliers.map(async (s) => {
      const supplier = s.supplier as unknown as { id: string; name: string };
      return { supplier, stock: await supplierAvailableStock(supplier.id) };
    })
  );
  const reordersBySupplier = new Map(reorders.map((r) => [r.supplier.id, r]));

  return (
    <main>
      <h1 className="h1">Relatórios</h1>
      <p className="text-sm muted">Mês atual ({fmtMonth(month)})</p>

      <Section title="Resumo do mês">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          <Stat label="Receita" value={fmt(summary.revenue)} tone="brand" />
          <Stat label="CMV" value={fmt(summary.cmv)} />
          <Stat label="Lucro bruto" value={fmt(summary.grossProfit)} tone={summary.grossProfit >= 0 ? "good" : "bad"} />
          <Stat label="Lucro líquido" value={fmt(summary.netProfit)} tone={summary.netProfit >= 0 ? "good" : "bad"} />
          <Stat label="Taxas de pagamento" value={fmt(summary.feesTotal)} />
          <Stat label="Caixa (entrou)" value={fmt(summary.cashIn)} />
          <Stat label="Caixa (saiu)" value={fmt(summary.cashOut)} />
        </div>
      </Section>

      <Section title="Atacado x Varejo">
        <div className="grid max-w-xl grid-cols-2 gap-3">
          <Stat label="Atacado" value={fmt(channels.wholesale.revenue)} sub={`${channels.wholesale.orders} venda(s)`} />
          <Stat label="Varejo" value={fmt(channels.retail.revenue)} sub={`${channels.retail.orders} venda(s)`} />
        </div>
      </Section>

      <Section title="Estoque">
        <div className="max-w-xs">
          <Stat label="Valor em estoque (custo)" value={fmt(stock)} />
        </div>
      </Section>

      {supplierStocks.length > 0 && (
        <Section title="Disponibilidade dos fornecedores">
          {supplierStocks.map(({ supplier, stock: s }) => {
            const reorder = reordersBySupplier.get(supplier.id);
            return (
              <div key={supplier.id} className="card mb-2 space-y-3 p-3">
                <div>
                  <div className="mb-2 font-semibold">{supplier.name}</div>
                  {!s.length ? (
                    <p className="text-xs muted">Sem estoque disponível no momento.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {s.map((item) => (
                        <li key={item.variant_id} className="flex justify-between">
                          <span>
                            {item.product} · {item.name}
                          </span>
                          <span className="tabular font-semibold">{item.qty_available}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {reorder && (
                  <div className="border-t border-stone-200 pt-2">
                    <div className="mb-1 text-xs font-semibold muted">
                      Sugestão de reposição (lead time: {reorder.leadTimeDays} dia(s))
                    </div>
                    <ul className="space-y-1 text-sm">
                      {reorder.items.map((item) => (
                        <li key={item.variantId} className="flex items-center justify-between gap-2">
                          <span>
                            {item.product} · {item.name}
                            <span className="ml-1 text-xs muted">
                              ({item.avgDaily.toFixed(1)}/dia)
                            </span>
                          </span>
                          <span
                            className={`tabular font-semibold ${item.belowReorderPoint ? "text-amber-600" : ""}`}
                          >
                            {item.currentStock} / {Math.ceil(item.reorderPoint)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </Section>
      )}

      {!supplierStocks.length && (
        <Section title="Disponibilidade dos fornecedores">
          <Empty>Nenhum fornecedor parceiro ativo ainda.</Empty>
        </Section>
      )}
    </main>
  );
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
