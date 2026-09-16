"use client";

import { useActionState } from "react";
import { createCapacityPlanAction } from "./actions";

type Product = { id: string; name: string; product_variants?: { id: string; name: string; active: boolean }[] };

export function CapacityPlanForm({ products }: { products: Product[] }) {
  const [state, action, pending] = useActionState(createCapacityPlanAction, null);
  const allVariants = products.flatMap((p) => p.product_variants ?? []);

  return (
    <form action={action} className="card space-y-3 p-4">
      <select name="variant_id" className="inp">
        <option value="">Geral (todos os produtos)</option>
        {allVariants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input name="period_start" type="date" className="inp" required />
        <input name="period_end" type="date" className="inp" required />
      </div>
      <input name="planned_qty" className="inp" inputMode="decimal" placeholder="Quantidade planejada" required />
      <input name="notes" className="inp" placeholder="Observações (opcional)" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Salvando…" : "Adicionar plano"}
      </button>
    </form>
  );
}
