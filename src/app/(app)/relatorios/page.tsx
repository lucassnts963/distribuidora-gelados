import Link from "next/link";
import { BRL, monthEnd, monthOf } from "@/lib/db";
import { channelBreakdown, coverage, customerRanking, dailySeries, periodSummary, topFlavors, wholesaleOpportunityCost } from "@/lib/queries";
import { Bar, Empty, Section, Stat } from "@/components/ui";
import ChannelTable from "@/components/ChannelTable";

export const dynamic = "force-dynamic";

function range(key: string) {
  const t = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "7d") return { from: iso(new Date(Date.now() - 6 * 86400000)), to: iso(t), label: "Últimos 7 dias" };
  if (key === "30d") return { from: iso(new Date(Date.now() - 29 * 86400000)), to: iso(t), label: "Últimos 30 dias" };
  if (key === "anterior") {
    const d = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    const m = d.toISOString().slice(0, 7);
    return { from: m + "-01", to: monthEnd(m), label: "Mês anterior" };
  }
  return { from: monthOf() + "-01", to: monthEnd(), label: "Mês atual" };
}

const OPTS = [["mes", "Mês"], ["anterior", "Anterior"], ["7d", "7 dias"], ["30d", "30 dias"]] as const;

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sp = await searchParams;
  const key = sp.p ?? "mes";
  const { from, to, label } = range(key);

  const sum = periodSummary(from, to);
  const top = topFlavors(from, to, 20);
  const clients = customerRanking(from, to, 10);
  const days = dailySeries(from, to);
  const channels = channelBreakdown(from, to);
  const gap = wholesaleOpportunityCost(from, to);
  const cov = coverage(30).filter((c) => c.qty > 0).sort((a, b) => (b.idleDays ?? 9999) - (a.idleDays ?? 9999));

  const maxUnits = Math.max(1, ...top.map((t) => t.units));
  const maxDay = Math.max(1, ...days.map((d) => d.revenue));

  return (
    <main>
      <h1 className="h1 mb-3">Relatórios</h1>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {OPTS.map(([k, lbl]) => (
          <Link key={k} href={`/relatorios?p=${k}`}
            className={`${key === k ? "btn-primary" : "btn-ghost"} px-2 py-2 text-xs`}>{lbl}</Link>
        ))}
      </div>
      <p className="mb-3 text-xs muted">{label}: {new Date(from + "T12:00:00").toLocaleDateString("pt-BR")} a {new Date(to + "T12:00:00").toLocaleDateString("pt-BR")}</p>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Unidades" value={sum.units.toLocaleString("pt-BR")} sub={`${sum.orders} vendas`} />
        <Stat label="Faturamento" value={BRL(sum.revenue)} />
        <Stat label="Lucro bruto" value={BRL(sum.grossProfit)} sub={`margem ${sum.marginPct.toFixed(1)}%`} tone="good" />
        <Stat label="Lucro líquido" value={BRL(sum.netProfit)} sub={`despesas ${BRL(sum.expenses)}`}
              tone={sum.netProfit >= 0 ? "good" : "bad"} />
      </div>

      <Section title="Atacado x varejo">
        <ChannelTable rows={channels} gap={gap} />
      </Section>

      <Section title="Fluxo de caixa">
        <div className="card p-4 text-sm">
          <Row k="Entrou (vendas)" v={BRL(sum.cashIn)} tone="good" />
          <Row k="Saiu (compras)" v={`−${BRL(sum.purchases)}`} tone="bad" />
          <Row k="Saiu (despesas)" v={`−${BRL(sum.expenses)}`} tone="bad" />
          <div className="my-2 border-t border-stone-200" />
          <Row k="Saldo do período" v={BRL(sum.cashFlow)} tone={sum.cashFlow >= 0 ? "good" : "bad"} bold />
        </div>
      </Section>

      {days.length > 0 && (
        <Section title="Por dia">
          <div className="card divide-y divide-stone-100">
            {days.map((d) => (
              <div key={d.day} className="flex items-center gap-3 p-2.5">
                <span className="w-12 shrink-0 text-[11px] muted tabular">
                  {new Date(d.day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
                <div className="flex-1"><Bar pct={(d.revenue / maxDay) * 100} /></div>
                <span className="w-20 shrink-0 text-right text-xs font-semibold tabular">{BRL(d.revenue)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Ranking de sabores">
        {top.length === 0 ? <Empty>Sem vendas no período.</Empty> : (
          <div className="card divide-y divide-stone-100">
            {top.map((t, i) => (
              <div key={t.flavor_id} className="p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-xs font-bold muted tabular">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.flavor_name}</span>
                  <span className="text-sm font-bold tabular">{t.units} un</span>
                  <span className="w-20 text-right text-xs tabular text-emerald-700">{BRL(t.profit)}</span>
                </div>
                <div className="mt-1.5 pl-7"><Bar pct={(t.units / maxUnits) * 100} /></div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Parados há mais tempo">
        {cov.length === 0 ? <Empty>Sem estoque em aberto.</Empty> : (
          <div className="card divide-y divide-stone-100 text-sm">
            {cov.slice(0, 10).map((c) => (
              <div key={c.flavor_id} className="flex items-center justify-between p-3">
                <span className="min-w-0 truncate">{c.flavor_name} <span className="muted">({c.product_name})</span></span>
                <span className="shrink-0 text-xs tabular muted">
                  {c.qty} un · {c.idleDays == null ? "nunca vendeu" : `${c.idleDays} dias`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Clientes">
        {clients.length === 0 ? <Empty>Sem vendas no período.</Empty> : (
          <div className="card divide-y divide-stone-100">
            {clients.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="text-xs muted">{c.orders} compras{c.units ? ` · ${c.units} un` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular">{BRL(c.revenue)}</div>
                  <div className="text-xs tabular text-emerald-700">{BRL(c.profit)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {clients.length > 0 && clients[0].name !== "(sem cadastro)" && clients.length > 1 &&
          clients[0].revenue / Math.max(1, sum.revenue) > 0.5 && (
          <p className="mt-2 px-1 text-xs font-medium text-amber-700">
            Atenção: {clients[0].name} responde por {((clients[0].revenue / sum.revenue) * 100).toFixed(0)}% do seu
            faturamento no período. Se esse cliente achar o seu fornecedor, você perde metade do negócio.
          </p>
        )}
      </Section>
    </main>
  );
}

function Row({ k, v, tone, bold }: { k: string; v: string; tone?: "good" | "bad"; bold?: boolean }) {
  const c = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "";
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-bold" : ""}`}>
      <span className="muted">{k}</span><span className={`tabular ${c}`}>{v}</span>
    </div>
  );
}
