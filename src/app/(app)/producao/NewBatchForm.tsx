"use client";

import { useActionState, useState } from "react";
import { createProductionBatchAction } from "./actions";

type Product = { id: string; name: string; product_variants?: { id: string; name: string; active: boolean }[] };

export function NewBatchForm({ products }: { products: Product[] }) {
  const [state, action, pending] = useActionState(createProductionBatchAction, null);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const variants = products.find((p) => p.id === productId)?.product_variants?.filter((v) => v.active) ?? [];

  if (!products.length) {
    return <p className="text-sm muted">Cadastre um produto antes de planejar produção.</p>;
  }

  return (
    <form action={action} className="card space-y-3 p-4">
      <div>
        <label className="lbl">Produto</label>
        <select
          name="product_id"
          className="inp"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {variants.length > 0 && (
        <div>
          <label className="lbl">Variação (opcional)</label>
          <select name="variant_id" className="inp">
            <option value="">—</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <input name="batch_number" className="inp" placeholder="Nº do lote (opcional)" />
        <input name="planned_qty" className="inp" inputMode="decimal" placeholder="Qtd. planejada" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Criando…" : "Planejar produção"}
      </button>
    </form>
  );
}
