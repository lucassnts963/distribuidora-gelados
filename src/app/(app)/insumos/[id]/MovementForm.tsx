"use client";

import { useActionState } from "react";
import { recordRawMaterialMovementAction } from "../actions";

export function MovementForm({ rawMaterialId }: { rawMaterialId: string }) {
  const [state, action, pending] = useActionState(recordRawMaterialMovementAction, null);
  return (
    <form action={action} className="card space-y-3 p-4">
      <input type="hidden" name="raw_material_id" value={rawMaterialId} />
      <div className="flex gap-2">
        <select name="direction" className="inp" defaultValue="in">
          <option value="in">Entrada</option>
          <option value="out">Saída</option>
        </select>
        <input name="qty" className="inp" inputMode="decimal" placeholder="Quantidade" required />
      </div>
      <div className="flex gap-2">
        <input name="batch_number" className="inp" placeholder="Lote (opcional)" />
        <input name="expires_on" type="date" className="inp" />
      </div>
      <input name="unit_cost" className="inp" inputMode="decimal" placeholder="Custo unitário (opcional)" />
      <input name="reason" className="inp" placeholder="Motivo/observação (opcional)" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Lançando…" : "Lançar"}
      </button>
    </form>
  );
}
