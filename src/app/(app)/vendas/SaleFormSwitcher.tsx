"use client";

import { useState } from "react";
import { NewSaleForm } from "./NewSaleForm";
import { PDVForm } from "./PDVForm";

type Variant = { id: string; name: string; products?: { name: string } | null; photoUrl?: string | null };
type Contact = { id: string; name: string };
type Price = { wholesale_cents: number | null; retail_cents: number | null };
type PaymentMethod = { id: string; name: string; fee_percent: number };

export function SaleFormSwitcher({
  variants,
  contacts,
  prices,
  costs,
  paymentMethods,
}: {
  variants: Variant[];
  contacts: Contact[];
  prices: Record<string, Price>;
  costs: Record<string, number>;
  paymentMethods: PaymentMethod[];
}) {
  const [mode, setMode] = useState<"pdv" | "lista">("pdv");

  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border border-stone-200 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("pdv")}
          className={mode === "pdv" ? "btn-primary px-3 py-1" : "btn-ghost px-3 py-1"}
        >
          PDV
        </button>
        <button
          type="button"
          onClick={() => setMode("lista")}
          className={mode === "lista" ? "btn-primary px-3 py-1" : "btn-ghost px-3 py-1"}
        >
          Lista
        </button>
      </div>
      {mode === "pdv" ? (
        <PDVForm variants={variants} contacts={contacts} prices={prices} costs={costs} paymentMethods={paymentMethods} />
      ) : (
        <NewSaleForm variants={variants} contacts={contacts} prices={prices} costs={costs} paymentMethods={paymentMethods} />
      )}
    </div>
  );
}
