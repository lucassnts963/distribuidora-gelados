import Link from "next/link";
import { BRL, getSetting, monthEnd, monthOf, today } from "@/lib/db";
import { channelBreakdown, coverage, goalProgress, listStock, periodSummary, stockValue, topFlavors, wholesaleOpportunityCost, costDrift, lossesValue } from "@/lib/queries";
import { Bar, Empty, Section, Stat } from "@/components/ui";
import ChannelTable from "@/components/ChannelTable";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const month = monthOf();
  const from = month + "-01";
  const to = monthEnd(month);

  const sum = periodSummary(from, to);
  const stock = stockValue();
  const target = Number(getSetting("goal_units", "12000"));
  const goal = goalProgress(target, month);
  const profitTarget = Number(getSetting("goal_profit", "6000")) * 100;
  const profitPct = profitTarget ? (sum.grossProfit / profitTarget) * 100 : 0;
  const top = topFlavors(from, to, 5);
  const cov = coverage(30);
  const channels = channelBreakdown(from, to);
  const gap = wholesaleOpportunityCost(from, to);
  const drift = costDrift();
  const losses = lossesValue(from, to);

  const zerados = listStock({ onlyActive: true }).filter((r) => r.qty <= 0);
  const parados = cov.filter((c) => c.qty > 0 && (c.idleDays === null || c.idleDays >= 14));
  const acabando = cov.filter((c) => c.daysLeft !== null && c.daysLeft < 7 && c.qty > 0);

  const mesLabel = new Date(from + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const mesTitulo = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  return (
    <main>
      <header className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="h1">Painel</h1>
          <p className="text-sm muted">{mesTitulo}</p>
        </div>
        <Link href="/config" className="btn-ghost px-3 py-2 text-xs">Ajustes</Link>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/vendas/nova" className="btn-primary flex-col py-4 text-xs">
          <span className="text-xl leading-none">＋</span>Venda
        </Link>
        <Link href="/compras/nova" className="btn-ghost flex-col py-4 text-xs">
          <span className="text-xl leading-none">＋</span>Compra
        </Link>
        <Link href="/despesas" className="btn-ghost flex-col py-4 text-xs">
          <span className="text-xl leading-none">＋</span>Despesa
        </Link>
      </div>

      <Section title="Metas do mês">
        <div className="card space-y-4 p-4">
          {profitTarget > 0 && (
            <div>
              <div className="mb-1 flex items-end justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Lucro bruto</div>
                  <span className="text-2xl font-bold tabular text-emerald-700">{BRL(sum.grossProfit)}</span>
                  <span className="ml-1 text-xs muted">de {BRL(profitTarget)}</span>
                </div>
                <span className="text-sm muted tabular">{profitPct.toFixed(0)}%</span>
              </div>
              <Bar pct={profitPct} tone="emerald" />
            </div>
          )}
          <div>
            <div className="mb-1 flex items-end justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Unidades no atacado</div>
                <span className="text-2xl font-bold tabular">{goal.units.toLocaleString("pt-BR")}</span>
                <span className="ml-1 text-xs muted">de {target.toLocaleString("pt-BR")}</span>
              </div>
              <span className="text-sm muted tabular">{goal.pct.toFixed(0)}%</span>
            </div>
            <Bar pct={goal.pct} />
          </div>
          {goal.units > 0 && (
            <p className="text-xs muted">
              Lucro médio real por unidade (todos os canais): <b>{BRL(Math.round(sum.avgUnitProfit))}</b>.
            </p>
          )}
        </div>
      </Section>

      <Section title="Lucro do mês">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Faturamento" value={BRL(sum.revenue)} sub={`${sum.units.toLocaleString("pt-BR")} un · ${sum.orders} vendas`} />
          <Stat label="Custo da mercadoria" value={BRL(sum.cmv)} />
          <Stat label="Lucro bruto" value={BRL(sum.grossProfit)} sub={`margem ${sum.marginPct.toFixed(1)}%`}
                tone={sum.grossProfit >= 0 ? "good" : "bad"} />
          <Stat label="Lucro líquido" value={BRL(sum.netProfit)} sub={`− ${BRL(sum.expenses)} de despesas`}
                tone={sum.netProfit >= 0 ? "good" : "bad"} />
        </div>
      </Section>

      <Section title="Atacado x varejo">
        <ChannelTable rows={channels} gap={gap} />
      </Section>

      <Section title="Caixa do mês">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Entrou" value={BRL(sum.cashIn)} tone="good" />
          <Stat label="Saiu" value={BRL(sum.cashOut)} sub={`compras ${BRL(sum.purchases)}`} tone="bad" />
        </div>
        <div className="mt-2">
          <Stat label="Saldo do mês" value={BRL(sum.cashFlow)} tone={sum.cashFlow >= 0 ? "good" : "bad"} />
        </div>
        <p className="mt-2 px-1 text-xs muted">
          Caixa negativo com lucro positivo é normal quando você comprou estoque que ainda não vendeu —
          esse dinheiro está no freezer, não perdido.
        </p>
      </Section>

      <Section title="Estoque">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Unidades paradas" value={stock.units.toLocaleString("pt-BR")} />
          <Stat label="Dinheiro no freezer" value={BRL(stock.v)} tone="brand" sub="custo médio" />
        </div>
        {losses.units > 0 && (
          <p className="mt-2 px-1 text-xs text-red-700">
            Perdas, brindes e consumo no mês: {losses.units} un = <b>{BRL(losses.v)}</b> ao custo médio.
          </p>
        )}
      </Section>

      {drift.length > 0 && (
        <Section title="Custo mudou">
          <div className="card divide-y divide-stone-100">
            {drift.slice(0, 6).map((r) => {
              const up = r.avg_cost_cents > r.listed_cost_cents;
              return (
                <div key={r.flavor_id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{r.flavor_name}</div>
                    <div className="text-[11px] muted">{r.product_name} · tabela {BRL(r.listed_cost_cents)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold tabular ${up ? "text-red-700" : "text-emerald-700"}`}>
                      {BRL(r.avg_cost_cents)}
                    </div>
                    <div className="text-[11px] muted">custo médio real</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 px-1 text-xs muted">
            O que você paga não é mais o que está na tabela. Ajuste o preço de venda ou aceite
            a margem menor — mas decida, não descubra no fim do mês.
          </p>
        </Section>
      )}

      {(acabando.length > 0 || zerados.length > 0 || parados.length > 0) && (
        <Section title="Atenção">
          <div className="card divide-y divide-stone-100">
            {zerados.length > 0 && (
              <div className="p-4">
                <div className="mb-1 text-sm font-semibold text-red-700">Zerados ({zerados.length})</div>
                <p className="text-xs muted">{zerados.map((z) => `${z.product_name} ${z.flavor_name}`).join(" · ")}</p>
              </div>
            )}
            {acabando.length > 0 && (
              <div className="p-4">
                <div className="mb-1 text-sm font-semibold text-amber-700">Acabam em menos de 7 dias ({acabando.length})</div>
                <p className="text-xs muted">
                  {acabando.map((a) => `${a.flavor_name} (${a.qty} un, ~${Math.floor(a.daysLeft!)}d)`).join(" · ")}
                </p>
              </div>
            )}
            {parados.length > 0 && (
              <div className="p-4">
                <div className="mb-1 text-sm font-semibold text-stone-700">Parados há 14 dias ou mais ({parados.length})</div>
                <p className="text-xs muted">
                  {parados.map((a) => `${a.flavor_name} (${a.qty} un${a.idleDays !== null ? `, ${a.idleDays}d` : ", nunca vendeu"})`).join(" · ")}
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title="Mais vendidos no mês" action={<Link href="/relatorios" className="text-xs font-semibold text-brand-600">ver tudo</Link>}>
        {top.length === 0 ? <Empty>Nenhuma venda registrada em {mesLabel}.</Empty> : (
          <div className="card divide-y divide-stone-100">
            {top.map((t) => (
              <div key={t.flavor_id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{t.flavor_name}</div>
                  <div className="text-xs muted">{t.product_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular">{t.units} un</div>
                  <div className="text-xs tabular text-emerald-700">{BRL(t.profit)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <p className="mt-8 text-center text-[11px] muted">Hoje: {new Date(today() + "T12:00:00").toLocaleDateString("pt-BR")}</p>
    </main>
  );
}
