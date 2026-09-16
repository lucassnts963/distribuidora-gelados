"use client";

import { useActionState } from "react";
import { createOrganizationAction } from "@/app/actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createOrganizationAction, null);
  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <label className="lbl">Nome da organização</label>
        <input name="name" className="inp" autoFocus required placeholder="Ex: Distribuidora Lucas" />
      </div>
      <div>
        <label className="lbl">CNPJ/CPF (opcional)</label>
        <input name="document" className="inp" inputMode="numeric" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Criando…" : "Criar organização"}
      </button>
    </form>
  );
}
