"use client";

import { useActionState } from "react";
import { addRecipeItemAction, removeRecipeItemAction } from "../actions";

type RawMaterial = { id: string; name: string; unit: string };
type RecipeItem = {
  id: string;
  raw_material_id: string;
  qty_per_unit: number;
  raw_materials: { name: string; unit: string } | null;
};

export function RecipeForm({
  productId,
  variantId,
  rawMaterials,
  items,
}: {
  productId: string;
  variantId: string;
  rawMaterials: RawMaterial[];
  items: RecipeItem[];
}) {
  const [state, action, pending] = useActionState(addRecipeItemAction, null);

  if (!rawMaterials.length) {
    return <p className="text-xs muted">Cadastre um insumo antes de montar a receita.</p>;
  }

  return (
    <div className="space-y-2 border-t border-stone-200 pt-2">
      <div className="lbl">Receita (insumos por unidade produzida)</div>
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between text-xs">
              <span>
                {it.qty_per_unit} {it.raw_materials?.unit} de {it.raw_materials?.name}
              </span>
              <form action={removeRecipeItemAction}>
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="product_id" value={productId} />
                <button className="text-red-600">remover</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="flex gap-2">
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="variant_id" value={variantId} />
        <select name="raw_material_id" className="inp flex-1">
          {rawMaterials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input name="qty_per_unit" className="inp w-24" inputMode="decimal" placeholder="Qtd./un." />
        <button className="btn-primary" disabled={pending}>
          +
        </button>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
