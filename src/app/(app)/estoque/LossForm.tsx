"use client";

import { useActionState, useState } from "react";
import { recordLossAction } from "./actions";

type Product = { id: string; name: string; product_variants?: { id: string; name: string; active: boolean }[] };
type Lot = { id: string; lot_number: string | null; variant_id: string };

export function LossForm({ products, lots }: { products: Product[]; lots: Lot[] }) {
  const [state, action, pending] = useActionState(recordLossAction, null);
  const [variantId, setVariantId] = useState("");
  const allVariants = products.flatMap((p) => p.product_variants ?? []);
  const lotsForVariant = lots.filter((l) => l.variant_id === variantId);

  return (
    <form action={action} className="card space-y-3 p-4">
      <select
        name="variant_id"
        className="inp"
        value={variantId}
        onChange={(e) => setVariantId(e.target.value)}
        required
      >
        <option value="">Selecione a variação</option>
        {allVariants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      {lotsForVariant.length > 0 && (
        <select name="lot_id" className="inp">
          <option value="">Sem lote específico</option>
          {lotsForVariant.map((l) => (
            <option key={l.id} value={l.id}>
              {l.lot_number ?? l.id.slice(0, 8)}
            </option>
          ))}
        </select>
      )}
      <input name="qty" className="inp" inputMode="decimal" placeholder="Quantidade" required />
      <input name="reason" className="inp" placeholder="Motivo (ex: validade vencida, quebra)" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-danger w-full" disabled={pending}>
        {pending ? "Lançando…" : "Lançar perda"}
      </button>
    </form>
  );
}
