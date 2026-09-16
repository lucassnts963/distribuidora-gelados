"use client";

import { useActionState, useState } from "react";
import { createSaleAction } from "./actions";
import { ItemsForm } from "@/components/ItemsForm";

type Variant = { id: string; name: string; products?: { name: string } | null };
type Contact = { id: string; name: string };
type Price = { wholesale_cents: number | null; retail_cents: number | null };
type PaymentMethod = { id: string; name: string; fee_percent: number };

export function NewSaleForm({
  variants,
  contacts,
  prices,
  costs,
  paymentMethods,
  loyaltyEnabled,
}: {
  variants: Variant[];
  contacts: Contact[];
  prices: Record<string, Price>;
  costs: Record<string, number>;
  paymentMethods: PaymentMethod[];
  loyaltyEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(createSaleAction, null);
  const [channel, setChannel] = useState<"retail" | "wholesale">("wholesale");
  const priceMap = new Map(Object.entries(prices));
  const costMap = new Map(Object.entries(costs));

  return (
    <form action={action} className="card space-y-4 p-4">
      <div className="flex gap-2">
        <select name="contact_id" className="inp">
          <option value="">Venda avulsa (sem contato)</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
        {paymentMethods.length > 0 && (
          <select name="payment_method_id" className="inp">
            <option value="">Sem forma de pagamento</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
                {pm.fee_percent ? ` (${pm.fee_percent}%)` : ""}
              </option>
            ))}
          </select>
        )}
      </div>
      <ItemsForm
        variants={variants}
        priceFieldName="unit_price"
        priceLabel="Preço un."
        channel={channel}
        prices={priceMap}
        costs={costMap}
      />
      {loyaltyEnabled && (
        <input
          name="redeem_points"
          className="inp"
          inputMode="numeric"
          placeholder="Usar pontos de fidelidade (opcional)"
        />
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Registrando…" : "Registrar venda"}
      </button>
    </form>
  );
}
