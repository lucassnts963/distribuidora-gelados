"use client";

import { useActionState } from "react";
import { createRawMaterialAction } from "./actions";

export function NewRawMaterialForm() {
  const [state, action, pending] = useActionState(createRawMaterialAction, null);
  return (
    <form action={action} className="card flex gap-2 p-4">
      <input name="name" className="inp flex-1" placeholder="Nome (ex: Açúcar)" required />
      <input name="unit" className="inp w-20" placeholder="un" defaultValue="kg" />
      <button className="btn-primary" disabled={pending}>
        +
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
