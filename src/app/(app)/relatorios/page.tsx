import { getSessionProfile } from "@/lib/auth";
import {
  periodSummary,
  channelBreakdown,
  stockValue,
  listActiveSuppliers,
  supplierAvailableStock,
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

  const [summary, channels, stock, suppliers] = await Promise.all([
    periodSummary(profile.org.id, from, to),
    channelBreakdown(profile.org.id, from, to),
    stockValue(profile.org.id),
    listActiveSuppliers(profile.org.id),
  ]);

  const supplierStocks = await Promise.all(
    suppliers.map(async (s) => {
      const supplier = s.supplier as unknown as { id: string; name: string };
      return { supplier, stock: await supplierAvailableStock(supplier.id) };
    })
  );

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
          {supplierStocks.map(({ supplier, stock: s }) => (
            <div key={supplier.id} className="card mb-2 p-3">
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
          ))}
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
