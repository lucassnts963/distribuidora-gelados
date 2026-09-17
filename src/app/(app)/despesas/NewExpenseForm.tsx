"use client";

import { useActionState, useState } from "react";
import { createExpenseAction } from "./actions";

export function NewExpenseForm() {
  const [state, action, pending] = useActionState(createExpenseAction, null);
  const [deferred, setDeferred] = useState(false);
  return (
    <form action={action} className="card space-y-3 p-4">
      <div className="flex gap-2">
        <input name="category" className="inp" placeholder="Categoria (ex: aluguel)" required />
        <input name="occurred_on" type="date" className="inp" />
      </div>
      <div className="flex gap-2">
        <select name="cost_type" className="inp" defaultValue="variable">
          <option value="variable">Variável</option>
          <option value="fixed">Fixa</option>
        </select>
        <input name="description" className="inp" placeholder="Descrição (opcional)" />
      </div>
      <input name="amount" className="inp" inputMode="decimal" placeholder="Valor (R$)" required />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={deferred}
          onChange={(e) => setDeferred(e.target.checked)}
        />
        Despesa a prazo
      </label>
      {deferred && (
        <div>
          <label className="mb-1 block text-xs muted">Vencimento</label>
          <input name="due_date" type="date" className="inp" required />
        </div>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Lançando…" : "Lançar despesa"}
      </button>
    </form>
  );
}
