"use client";

import { useActionState } from "react";
import { inviteMemberAction } from "./actions";

export function InviteMemberForm() {
  const [state, action, pending] = useActionState(inviteMemberAction, null);
  return (
    <form action={action} className="card space-y-3 p-4">
      <div>
        <label className="lbl">Nome</label>
        <input name="full_name" className="inp" placeholder="Nome da pessoa" />
      </div>
      <div>
        <label className="lbl">Email</label>
        <input name="email" type="email" className="inp" required />
      </div>
      <div>
        <label className="lbl">Papel</label>
        <select name="role" className="inp" defaultValue="staff">
          <option value="staff">Operador</option>
          <option value="vendedor">Vendedor</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Convite enviado.</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Convidando…" : "Convidar"}
      </button>
    </form>
  );
}
