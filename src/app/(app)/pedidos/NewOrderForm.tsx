"use client";

import { useActionState, useState } from "react";
import { createOrderAction } from "./actions";

type StockRow = { variant_id: string; qty_available: number; name: string; product: string };
type Price = { wholesale_cents: number | null; retail_cents: number | null };
type Option = { supplier: { id: string; name: string }; stock: StockRow[]; prices: Record<string, Price> };

export function NewOrderForm({ options }: { options: Option[] }) {
  const [state, action, pending] = useActionState(createOrderAction, null);
  const [supplierId, setSupplierId] = useState(options[0]?.supplier.id ?? "");
  const [channel, setChannel] = useState<"retail" | "wholesale">("retail");
  const current = options.find((o) => o.supplier.id === supplierId);

  return (
    <form action={action} className="card space-y-4 p-4">
      <div className="flex gap-2">
        <select
          name="supplier_org_id"
          className="inp"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.supplier.id} value={o.supplier.id}>
              {o.supplier.name}
            </option>
          ))}
        </select>
        <select
          name="channel"
          className="inp"
          value={channel}
          onChange={(e) => setChannel(e.target.value as "retail" | "wholesale")}
        >
          <option value="retail">Varejo</option>
          <option value="wholesale">Atacado</option>
        </select>
      </div>

      {!current?.stock.length ? (
        <p className="text-sm muted">Esse fornecedor não tem estoque disponível no momento.</p>
      ) : (
        <div className="space-y-2">
          {current.stock.map((s) => {
            const price = current.prices[s.variant_id];
            const suggested = channel === "wholesale" ? price?.wholesale_cents : price?.retail_cents;
            return (
              <div key={s.variant_id} className="flex items-center gap-2">
                <input type="hidden" name="variant_id[]" value={s.variant_id} />
                <div className="flex-1 text-sm">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs muted">
                    {s.product} · disponível: {s.qty_available}
                  </div>
                </div>
                <input name="qty[]" className="inp w-16" inputMode="decimal" placeholder="Qtd." />
                <input
                  name="unit_price[]"
                  className="inp w-24"
                  inputMode="decimal"
                  placeholder="Preço un."
                  defaultValue={suggested ? (suggested / 100).toFixed(2) : ""}
                />
              </div>
            );
          })}
        </div>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Enviando…" : "Solicitar pedido"}
      </button>
    </form>
  );
}
