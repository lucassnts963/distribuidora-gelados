"use client";
import { useMemo, useState } from "react";
import type { StockRow, Customer } from "@/lib/types";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export default function SaleForm({
  rows, customers, action, today,
}: { rows: StockRow[]; customers: Customer[]; action: (f: FormData) => void; today: string }) {
  const [channel, setChannel] = useState<"atacado" | "varejo">("atacado");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [price, setPrice] = useState<Record<number, string>>({});

  const priceFor = (r: StockRow) =>
    price[r.flavor_id] ?? fmt(channel === "atacado" ? r.wholesale_cents : r.retail_cents);

  const cents = (s: string) => Math.round(Number(s.replace(",", ".")) * 100) || 0;

  const totals = useMemo(() => {
    let units = 0, total = 0, cost = 0;
    for (const r of rows) {
      const q = qty[r.flavor_id] || 0;
      if (q <= 0) continue;
      units += q;
      total += q * cents(priceFor(r));
      cost += q * r.cost_cents;
    }
    return { units, total, cost, profit: total - cost };
  }, [rows, qty, price, channel]);

  const groups = useMemo(() => {
    const m = new Map<string, StockRow[]>();
    for (const r of rows) {
      if (!m.has(r.product_name)) m.set(r.product_name, []);
      m.get(r.product_name)!.push(r);
    }
    return [...m.entries()];
  }, [rows]);

  const bump = (id: number, d: number) =>
    setQty((p) => ({ ...p, [id]: Math.max(0, (p[id] || 0) + d) }));

  return (
    <form action={action} className="pb-32">
      <div className="card mb-4 space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setChannel("atacado")}
            className={channel === "atacado" ? "btn-primary" : "btn-ghost"}>Atacado</button>
          <button type="button" onClick={() => setChannel("varejo")}
            className={channel === "varejo" ? "btn-primary" : "btn-ghost"}>Varejo</button>
        </div>
        <input type="hidden" name="channel" value={channel} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="lbl">Data</label>
            <input name="occurred_on" type="date" defaultValue={today} className="inp" />
          </div>
          <div>
            <label className="lbl">Pagamento</label>
            <select name="payment" className="inp">
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
            </select>
          </div>
        </div>

        <div>
          <label className="lbl">Cliente (opcional, mas ajuda no relatório)</label>
          <select name="customer_id" className="inp">
            <option value="">— sem cadastro —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {groups.map(([product, items]) => (
        <div key={product} className="card mb-4 overflow-hidden">
          <div className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-500">
            {product}
          </div>
          <div className="divide-y divide-stone-100">
            {items.map((r) => {
              const q = qty[r.flavor_id] || 0;
              const over = q > r.qty;
              return (
                <div key={r.flavor_id} className={`p-3 ${q > 0 ? "bg-brand-50/50" : ""}`}>
                  <input type="hidden" name="flavor_id" value={r.flavor_id} />
                  <input type="hidden" name="qty" value={q} />
                  <input type="hidden" name="price" value={priceFor(r)} />
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{r.flavor_name}</div>
                      <div className={`text-xs ${r.qty <= 0 ? "text-red-600" : "muted"}`}>
                        estoque {r.qty} un
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => bump(r.flavor_id, -1)}
                        className="h-10 w-10 rounded-xl bg-stone-100 text-lg font-bold text-stone-600">−</button>
                      <input inputMode="numeric" value={q || ""} placeholder="0"
                        onChange={(e) => setQty((p) => ({ ...p, [r.flavor_id]: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) }))}
                        className="h-10 w-14 rounded-xl border border-stone-300 text-center text-base tabular outline-none focus:border-brand-500" />
                      <button type="button" onClick={() => bump(r.flavor_id, +1)}
                        className="h-10 w-10 rounded-xl bg-brand-100 text-lg font-bold text-brand-700">＋</button>
                    </div>
                  </div>
                  {q > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs muted">preço un</span>
                      <input inputMode="decimal" value={priceFor(r)}
                        onChange={(e) => setPrice((p) => ({ ...p, [r.flavor_id]: e.target.value }))}
                        className="h-9 w-20 rounded-lg border border-stone-300 px-2 text-center text-sm tabular outline-none focus:border-brand-500" />
                      <span className="text-[11px] text-emerald-700 tabular">
                        +{brl(cents(priceFor(r)) - r.cost_cents)}/un
                      </span>
                      <span className="ml-auto text-sm font-bold tabular">{brl(q * cents(priceFor(r)))}</span>
                      {over && <span className="chip bg-amber-100 text-amber-800">acima do estoque</span>}
                      {cents(priceFor(r)) === 0 && (
                        <span className="chip bg-red-100 text-red-700">preço não definido</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <label className="lbl">Observação</label>
        <input name="note" className="inp" placeholder="ex.: entregue na feira" />
      </div>

      <div className="fixed bottom-[62px] left-0 right-0 z-30 border-t border-stone-200 bg-white/95 p-3 backdrop-blur
                      pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="muted">{totals.units} un</span>
            <span className="font-bold tabular">{brl(totals.total)}</span>
            <span className="tabular text-emerald-700">lucro {brl(totals.profit)}</span>
          </div>
          <button className="btn-primary w-full" disabled={totals.units === 0}>Registrar venda</button>
        </div>
      </div>
    </form>
  );
}
