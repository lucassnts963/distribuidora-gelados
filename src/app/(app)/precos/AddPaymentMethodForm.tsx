"use client";

import { useActionState } from "react";
import { addPaymentMethodAction } from "./actions";

export function AddPaymentMethodForm() {
  const [state, action, pending] = useActionState(addPaymentMethodAction, null);
  return (
    <form action={action} className="card flex flex-wrap items-end gap-2 p-3">
      <div>
        <label className="lbl">Forma de pagamento</label>
        <input name="name" className="inp" placeholder="Cartão de crédito" required />
      </div>
      <div>
        <label className="lbl">Taxa (%)</label>
        <input name="fee_percent" className="inp w-28" inputMode="decimal" placeholder="0" />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="is_deferred" className="h-4 w-4" />
        A prazo (não conta como caixa até ser recebido)
      </label>
      <button className="btn-primary" disabled={pending}>
        {pending ? "..." : "Adicionar"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
