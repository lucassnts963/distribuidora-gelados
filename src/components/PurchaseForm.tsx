"use client";
import { useMemo, useState } from "react";
import type { StockRow } from "@/lib/types";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export default function PurchaseForm({
  rows, action, today,
}: { rows: StockRow[]; action: (f: FormData) => void; today: string }) {
  const [qty, setQty] = useState<Record<number, number>>({});
  const [cost, setCost] = useState<Record<number, string>>({});
  const cents = (s: string) => Math.round(Number(s.replace(",", ".")) * 100) || 0;
  const costFor = (r: StockRow) => cost[r.flavor_id] ?? fmt(r.last_cost_cents || r.listed_cost_cents);

  const totals = useMemo(() => {
    let units = 0, total = 0;
    for (const r of rows) {
      const q = qty[r.flavor_id] || 0;
      if (q <= 0) continue;
      units += q; total += q * cents(costFor(r));
    }
    return { units, total };
  }, [rows, qty, cost]);

  const groups = useMemo(() => {
    const m = new Map<string, StockRow[]>();
    for (const r of rows) { if (!m.has(r.product_name)) m.set(r.product_name, []); m.get(r.product_name)!.push(r); }
    return [...m.entries()];
  }, [rows]);

  return (
    <form action={action} className="pb-32">
      <div className="card mb-4 grid grid-cols-2 gap-3 p-4">
        <div>
          <label className="lbl">Data</label>
          <input name="occurred_on" type="date" defaultValue={today} className="inp" />
        </div>
        <div>
          <label className="lbl">Fornecedor</label>
          <input name="supplier" className="inp" placeholder="nome" />
        </div>
      </div>

      {groups.map(([product, items]) => (
        <div key={product} className="card mb-4 overflow-hidden">
          <div className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-500">{product}</div>
          <div className="divide-y divide-stone-100">
            {items.map((r) => {
              const q = qty[r.flavor_id] || 0;
              return (
                <div key={r.flavor_id} className={`flex items-center gap-3 p-3 ${q > 0 ? "bg-brand-50/50" : ""}`}>
                  <input type="hidden" name="flavor_id" value={r.flavor_id} />
                  <input type="hidden" name="qty" value={q} />
                  <input type="hidden" name="cost" value={costFor(r)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.flavor_name}</div>
                    <div className="text-xs muted">
                      tem {r.qty} un
                      {r.avg_cost_cents > 0 && <> · médio {brl(r.avg_cost_cents)}</>}
                    </div>
                  </div>
                  <input inputMode="decimal" value={costFor(r)}
                    onChange={(e) => setCost((p) => ({ ...p, [r.flavor_id]: e.target.value }))}
                    className="h-10 w-20 rounded-xl border border-stone-300 px-2 text-center text-sm tabular outline-none focus:border-brand-500"
                    aria-label="custo unitário" />
                  <input inputMode="numeric" value={q || ""} placeholder="qtd"
                    onChange={(e) => setQty((p) => ({ ...p, [r.flavor_id]: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) }))}
                    className="h-10 w-20 rounded-xl border border-stone-300 text-center text-base tabular outline-none focus:border-brand-500" />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <label className="lbl">Observação</label>
        <input name="note" className="inp" placeholder="ex.: nota 112, pago em dinheiro" />
      </div>

      <div className="fixed bottom-[62px] left-0 right-0 z-30 border-t border-stone-200 bg-white/95 p-3 backdrop-blur
                      pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="muted">{totals.units} un</span>
            <span className="font-bold tabular">{brl(totals.total)}</span>
          </div>
          <button className="btn-primary w-full" disabled={totals.units === 0}>Registrar entrada</button>
        </div>
      </div>
    </form>
  );
}
