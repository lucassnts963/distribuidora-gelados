import { getSessionProfile } from "@/lib/auth";
import {
  periodSummary,
  channelBreakdown,
  stockValue,
  listActiveSuppliers,
  supplierAvailableStock,
  reorderSuggestions,
  breakEven,
  listReceivables,
  listPayables,
  type Payable,
} from "@/lib/queries";
import { Section, Empty, Stat, Money } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { monthOf, monthStart, monthEnd, fmtMonth, fmtDate, daysUntil } from "@/lib/format";
import { markOrderPaidAction } from "./actions";
import { markPurchasePaidAction } from "../compras/actions";
import { markExpensePaidAction } from "../despesas/actions";

const PAYABLE_KIND_LABEL: Record<Payable["kind"], string> = {
  pedido: "Pedido",
  compra: "Compra",
  despesa: "Despesa",
};

function payablePaidAction(kind: Payable["kind"]) {
  if (kind === "compra") return markPurchasePaidAction;
  if (kind === "despesa") return markExpensePaidAction;
  return markOrderPaidAction;
}

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const month = monthOf();
  const from = monthStart(month);
  const to = monthEnd(month);

  const [summary, channels, stock, suppliers, reorders, equilibrium, receivables, payables] = await Promise.all([
    periodSummary(profile.org.id, from, to),
    channelBreakdown(profile.org.id, from, to),
    stockValue(profile.org.id),
    listActiveSuppliers(profile.org.id),
    reorderSuggestions(profile.org.id),
    breakEven(profile.org.id, from, to),
    listReceivables(profile.org.id),
    listPayables(profile.org.id),
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
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="h1">Relatórios</h1>
          <p className="text-sm muted">Mês atual ({fmtMonth(month)})</p>
        </div>
        <a href={`/relatorios/export?month=${month}`} className="btn-ghost shrink-0 text-sm">
          Exportar CSV
        </a>
      </div>

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

      <Section title="Ponto de equilíbrio">
        {equilibrium.revenue === 0 && equilibrium.fixedCostsTotal === 0 ? (
          <Empty>Sem vendas ou custos fixos lançados neste mês ainda.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Custos fixos do mês" value={fmt(equilibrium.fixedCostsTotal)} />
              <Stat label="Margem de contribuição" value={fmt(equilibrium.contributionMargin)} />
              <Stat label="Margem (%)" value={`${(equilibrium.contributionMarginRatio * 100).toFixed(1)}%`} />
              <Stat
                label="Receita de equilíbrio"
                value={equilibrium.breakEvenRevenue !== null ? fmt(equilibrium.breakEvenRevenue) : "—"}
              />
            </div>
            {equilibrium.breakEvenRevenue === null ? (
              <p className="mt-2 text-xs text-amber-600">
                Margem de contribuição zero ou negativa neste mês — não dá pra calcular um ponto de
                equilíbrio em receita (o custo variável já come tudo que entra).
              </p>
            ) : (
              <p className="mt-2 text-xs muted">
                {equilibrium.distanceToBreakEven! >= 0
                  ? `Já passou do ponto de equilíbrio em ${fmt(equilibrium.distanceToBreakEven!)}.`
                  : `Falta ${fmt(-equilibrium.distanceToBreakEven!)} de receita pra bater o ponto de equilíbrio do mês.`}
              </p>
            )}
          </>
        )}
      </Section>

      <Section title="Contas a pagar e a receber">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">A receber</h3>
            {!receivables.length ? (
              <Empty>Nenhuma venda a prazo em aberto.</Empty>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {receivables.map((r) => {
                  const days = daysUntil(r.dueDate);
                  return (
                    <li key={r.id} className="card space-y-2 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold">{r.who}</div>
                          <div className={`text-xs ${days < 0 ? "text-red-600" : "muted"}`}>
                            Vence {fmtDate(r.dueDate)}
                            {days < 0 ? ` · ${-days} dia(s) em atraso` : ""}
                          </div>
                        </div>
                        <Money cents={r.totalCents} className="font-bold" />
                      </div>
                      <form action={markOrderPaidAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton className="btn-primary w-full" pendingText="Marcando…">
                          Marcar como recebido
                        </SubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">A pagar</h3>
            {!payables.length ? (
              <Empty>Nenhuma conta a pagar em aberto.</Empty>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {payables.map((p) => {
                  const days = daysUntil(p.dueDate);
                  return (
                    <li key={`${p.kind}-${p.id}`} className="card space-y-2 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold">{p.who}</div>
                          <div className={`text-xs ${days < 0 ? "text-red-600" : "muted"}`}>
                            {PAYABLE_KIND_LABEL[p.kind]} · vence {fmtDate(p.dueDate)}
                            {days < 0 ? ` · ${-days} dia(s) em atraso` : ""}
                          </div>
                        </div>
                        <Money cents={p.totalCents} className="font-bold" />
                      </div>
                      <form action={payablePaidAction(p.kind)}>
                        <input type="hidden" name="id" value={p.id} />
                        <SubmitButton className="btn-primary w-full" pendingText="Marcando…">
                          Marcar como pago
                        </SubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
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
