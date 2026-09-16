"use client";

import { useActionState } from "react";
import { saveContactAction } from "./actions";

export function NewContactForm() {
  const [state, action, pending] = useActionState(saveContactAction, null);
  return (
    <form action={action} className="card space-y-3 p-4">
      <input name="name" className="inp" placeholder="Nome" required />
      <div className="flex gap-2">
        <input name="phone" className="inp" placeholder="Telefone (opcional)" />
        <select name="kind" className="inp">
          <option value="varejo">Varejo</option>
          <option value="atacado">Atacado/revenda</option>
        </select>
      </div>
      <input name="note" className="inp" placeholder="Observação (opcional)" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Salvando…" : "Adicionar contato"}
      </button>
    </form>
  );
}
