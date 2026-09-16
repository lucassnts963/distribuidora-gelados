"use client";

import { useActionState } from "react";
import { createExternalPurchaseAction } from "./actions";
import { ItemsForm } from "@/components/ItemsForm";

type Variant = { id: string; name: string; products?: { name: string } | null };

export function NewExternalPurchaseForm({ variants }: { variants: Variant[] }) {
  const [state, action, pending] = useActionState(createExternalPurchaseAction, null);
  return (
    <form action={action} className="card space-y-4 p-4">
      <div className="flex gap-2">
        <input name="supplier_name" className="inp" placeholder="Fornecedor (opcional)" />
        <input name="occurred_on" type="date" className="inp" />
      </div>
      <input name="note" className="inp" placeholder="Observação (opcional)" />
      <ItemsForm variants={variants} priceFieldName="unit_cost" priceLabel="Custo un." />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Registrando…" : "Registrar compra"}
      </button>
    </form>
  );
}
