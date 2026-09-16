"use client";

import { useActionState } from "react";
import { proposePartnershipAction } from "@/app/actions";

export function PartnershipForm() {
  const [state, action, pending] = useActionState(proposePartnershipAction, null);
  return (
    <form action={action} className="card space-y-4 p-4">
      <div>
        <label className="lbl">Código de convite do parceiro</label>
        <input name="invite_code" className="inp" required placeholder="ex: a1b2c3d4" />
      </div>
      <div>
        <label className="lbl">Qual é a relação?</label>
        <select name="role" className="inp" defaultValue="supplier">
          <option value="supplier">Vou comprar dele (ele é meu fornecedor)</option>
          <option value="buyer">Vou vender pra ele (ele é meu cliente)</option>
        </select>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Proposta enviada.</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Enviando…" : "Propor parceria"}
      </button>
    </form>
  );
}
