"use client";

import { useActionState } from "react";
import { createExpenseAction } from "./actions";

export function NewExpenseForm() {
  const [state, action, pending] = useActionState(createExpenseAction, null);
  return (
    <form action={action} className="card space-y-3 p-4">
      <div className="flex gap-2">
        <input name="category" className="inp" placeholder="Categoria (ex: aluguel)" required />
        <input name="occurred_on" type="date" className="inp" />
      </div>
      <input name="description" className="inp" placeholder="Descrição (opcional)" />
      <input name="amount" className="inp" inputMode="decimal" placeholder="Valor (R$)" required />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Lançando…" : "Lançar despesa"}
      </button>
    </form>
  );
}
