"use client";

import { useActionState } from "react";
import { createSaleAction } from "./actions";
import { ItemsForm } from "@/components/ItemsForm";

type Variant = { id: string; name: string; products?: { name: string } | null };
type Contact = { id: string; name: string };

export function NewSaleForm({ variants, contacts }: { variants: Variant[]; contacts: Contact[] }) {
  const [state, action, pending] = useActionState(createSaleAction, null);
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
        <select name="channel" className="inp">
          <option value="retail">Varejo</option>
          <option value="wholesale">Atacado</option>
        </select>
      </div>
      <ItemsForm variants={variants} priceFieldName="unit_price" priceLabel="Preço un." />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Registrando…" : "Registrar venda"}
      </button>
    </form>
  );
}
