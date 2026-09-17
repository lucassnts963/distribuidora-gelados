"use client";

import { useActionState, useState } from "react";
import { createOrderAction } from "./actions";

type StockRow = { variant_id: string; qty_available: number; name: string; product: string };
type Price = { wholesale_cents: number | null; retail_cents: number | null };
type PaymentMethod = { id: string; name: string; fee_percent: number; is_deferred: boolean };
type Option = {
  supplier: { id: string; name: string };
  stock: StockRow[];
  prices: Record<string, Price>;
  paymentMethods: PaymentMethod[];
};

export function NewOrderForm({ options }: { options: Option[] }) {
  const [state, action, pending] = useActionState(createOrderAction, null);
  const [supplierId, setSupplierId] = useState(options[0]?.supplier.id ?? "");
  const [channel, setChannel] = useState<"retail" | "wholesale">("wholesale");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const current = options.find((o) => o.supplier.id === supplierId);
  const selectedMethod = current?.paymentMethods.find((pm) => pm.id === paymentMethodId);

  return (
    <form action={action} className="card space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        <select
          name="supplier_org_id"
          className="inp"
          value={supplierId}
          onChange={(e) => {
            setSupplierId(e.target.value);
            setPaymentMethodId("");
          }}
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
          <option value="wholesale">Atacado</option>
          <option value="retail">Varejo</option>
        </select>
        {!!current?.paymentMethods.length && (
          <select
            name="payment_method_id"
            className="inp"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
          >
            <option value="">Sem forma de pagamento</option>
            {current.paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
                {pm.fee_percent ? ` (${pm.fee_percent}%)` : ""}
                {pm.is_deferred ? " · a prazo" : ""}
              </option>
            ))}
          </select>
        )}
        {selectedMethod?.is_deferred && (
          <input
            name="due_date"
            type="date"
            className="inp"
            defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
          />
        )}
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
                <div className="w-24 text-right text-sm tabular">
                  {suggested ? (
                    (suggested / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  ) : (
                    <span className="text-red-600">sem preço</span>
                  )}
                </div>
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
