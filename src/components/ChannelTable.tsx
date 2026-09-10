import { BRL } from "@/lib/db";

type Row = {
  channel: string; orders: number; units: number; revenue: number; cost: number;
  profit: number; perUnit: number; marginPct: number; unitsShare: number; profitShare: number;
};

export default function ChannelTable({ rows, gap }: { rows: Row[]; gap?: { gap: number; units: number } }) {
  const any = rows.some((r) => r.units > 0);
  if (!any) return <div className="card p-6 text-center text-sm muted">Sem vendas no período.</div>;

  return (
    <>
      <div className="card divide-y divide-stone-100">
        {rows.map((r) => (
          <div key={r.channel} className="p-4">
            <div className="flex items-baseline justify-between">
              <span className={`chip ${r.channel === "atacado" ? "bg-brand-100 text-brand-800" : "bg-emerald-100 text-emerald-800"}`}>
                {r.channel}
              </span>
              <span className="text-lg font-bold tabular">{BRL(r.perUnit)}<span className="text-xs font-normal muted"> /un</span></span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <Cell k="unidades" v={r.units.toLocaleString("pt-BR")} sub={`${r.unitsShare.toFixed(0)}% do volume`} />
              <Cell k="faturamento" v={BRL(r.revenue)} />
              <Cell k="lucro" v={BRL(r.profit)} sub={`${r.profitShare.toFixed(0)}% do lucro`} tone />
            </div>
            <div className="mt-2 text-[11px] muted">
              margem {r.marginPct.toFixed(1)}% · {r.orders} {r.orders === 1 ? "venda" : "vendas"} ·
              capital parado por venda: {BRL(r.cost)}
            </div>
          </div>
        ))}
      </div>

      {gap && gap.units > 0 && gap.gap > 0 && (
        <p className="mt-2 px-1 text-xs text-amber-700">
          As {gap.units.toLocaleString("pt-BR")} un que saíram no atacado renderiam <b>{BRL(gap.gap)}</b> a
          mais se tivessem sido vendidas no varejo. Isso não é prejuízo — é o preço que você paga pelo volume.
          Só vale se você não conseguiria vender essas unidades sozinho.
        </p>
      )}
    </>
  );
}

function Cell({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{k}</div>
      <div className={`text-sm font-bold tabular ${tone ? "text-emerald-700" : ""}`}>{v}</div>
      {sub && <div className="text-[10px] muted">{sub}</div>}
    </div>
  );
}
