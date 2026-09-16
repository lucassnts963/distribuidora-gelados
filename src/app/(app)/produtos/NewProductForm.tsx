"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveProductAction } from "./actions";

export function NewProductForm() {
  const [state, action, pending] = useActionState(saveProductAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok && state.id) router.push(`/produtos/${state.id}`);
  }, [state, router]);

  return (
    <form action={action} className="card space-y-4 p-4">
      <div>
        <label className="lbl">Nome</label>
        <input name="name" className="inp" required placeholder="Ex: Laranjinha" />
      </div>
      <div>
        <label className="lbl">SKU (opcional)</label>
        <input name="sku" className="inp" />
      </div>
      <div>
        <label className="lbl">Descrição (opcional)</label>
        <textarea name="description" className="inp" rows={2} />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Criando…" : "Criar produto"}
      </button>
    </form>
  );
}
