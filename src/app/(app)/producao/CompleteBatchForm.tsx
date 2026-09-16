"use client";

import { useActionState, useRef, useState } from "react";
import { completeBatchAction } from "./actions";

type Product = { id: string; name: string; product_variants?: { id: string; name: string; active: boolean }[] };

export function CompleteBatchForm({
  batchId,
  products,
  defaultVariantId,
  batchNumber,
  plannedQty,
  variantsWithRecipe,
}: {
  batchId: string;
  products: Product[];
  defaultVariantId: string | null;
  batchNumber: string | null;
  plannedQty: number | null;
  variantsWithRecipe: Set<string>;
}) {
  const [state, action, pending] = useActionState(completeBatchAction, null);
  const allVariants = products.flatMap((p) => p.product_variants ?? []);
  const producedQtyRef = useRef<HTMLInputElement>(null);
  const [variantId, setVariantId] = useState(defaultVariantId ?? "");
  const hasRecipe = variantsWithRecipe.has(variantId);

  return (
    <form action={action} className="space-y-2 border-t border-stone-200 pt-2">
      <input type="hidden" name="id" value={batchId} />
      <input type="hidden" name="batch_number" value={batchNumber ?? ""} />
      <div className="lbl">Concluir produção</div>
      <select
        name="variant_id"
        className="inp"
        value={variantId}
        onChange={(e) => setVariantId(e.target.value)}
      >
        <option value="">Selecione a variação produzida</option>
        {allVariants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          ref={producedQtyRef}
          name="produced_qty"
          className="inp"
          inputMode="decimal"
          placeholder="Qtd. produzida"
          required
        />
        {plannedQty ? (
          <button
            type="button"
            className="btn-ghost shrink-0"
            onClick={() => {
              if (producedQtyRef.current) producedQtyRef.current.value = String(plannedQty);
            }}
          >
            Usar planejado ({plannedQty})
          </button>
        ) : null}
      </div>
      {hasRecipe ? (
        <p className="text-xs muted">
          Custo unitário calculado automaticamente a partir da receita cadastrada.
        </p>
      ) : (
        <input name="unit_cost" className="inp" inputMode="decimal" placeholder="Custo unitário" />
      )}
      <div className="flex gap-2">
        <input name="lot_number" className="inp" placeholder="Nº do lote (opcional)" />
        <input name="expires_on" type="date" className="inp" title="Validade (opcional)" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.warning && <p className="text-sm text-amber-600">{state.warning}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Concluindo…" : "Concluir e lançar no estoque"}
      </button>
    </form>
  );
}
