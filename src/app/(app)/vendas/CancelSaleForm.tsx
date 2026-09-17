"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { cancelSaleAction } from "./actions";

export function CancelSaleForm({ saleId }: { saleId: string }) {
  const [state, action] = useActionState(cancelSaleAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={saleId} />
      <ConfirmSubmitButton
        className="btn-danger w-full"
        pendingText="Cancelando…"
        confirmMessage="Cancelar essa venda? O estoque volta pelo custo que saiu."
      >
        Cancelar venda
      </ConfirmSubmitButton>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
