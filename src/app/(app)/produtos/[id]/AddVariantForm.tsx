"use client";

import { useActionState } from "react";
import { addVariantAction } from "../actions";

export function AddVariantForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(addVariantAction, null);
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="product_id" value={productId} />
      <input name="name" className="inp flex-1" placeholder="Nome da variação (ex: Uva)" required />
      <input name="sku" className="inp w-24" placeholder="SKU" />
      <button className="btn-primary" disabled={pending}>
        +
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
