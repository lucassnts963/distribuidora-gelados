"use client";

import { useActionState } from "react";
import { completeBatchAction } from "./actions";

type Product = { id: string; name: string; product_variants?: { id: string; name: string; active: boolean }[] };

export function CompleteBatchForm({
  batchId,
  products,
  defaultVariantId,
}: {
  batchId: string;
  products: Product[];
  defaultVariantId: string | null;
}) {
  const [state, action, pending] = useActionState(completeBatchAction, null);
  const allVariants = products.flatMap((p) => p.product_variants ?? []);

  return (
    <form action={action} className="space-y-2 border-t border-stone-200 pt-2">
      <input type="hidden" name="id" value={batchId} />
      <div className="lbl">Concluir produção</div>
      <select name="variant_id" className="inp" defaultValue={defaultVariantId ?? ""}>
        <option value="">Selecione a variação produzida</option>
        {allVariants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input name="produced_qty" className="inp" inputMode="decimal" placeholder="Qtd. produzida" required />
        <input name="unit_cost" className="inp" inputMode="decimal" placeholder="Custo unitário" />
      </div>
      <div className="flex gap-2">
        <input name="lot_number" className="inp" placeholder="Nº do lote (opcional)" />
        <input name="expires_on" type="date" className="inp" title="Validade (opcional)" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Concluindo…" : "Concluir e lançar no estoque"}
      </button>
    </form>
  );
}
