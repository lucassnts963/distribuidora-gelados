"use client";

import { useActionState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cancelSaleAction } from "./actions";

export function CancelSaleForm({ saleId }: { saleId: string }) {
  const [state, action] = useActionState(cancelSaleAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={saleId} />
      <ConfirmDialog
        className="btn-danger w-full"
        pendingText="Cancelando…"
        confirmMessage="Cancelar essa venda? O estoque volta pelo custo que saiu."
        confirmLabel="Cancelar venda"
        error={state?.error}
        success={!!state?.ok}
      >
        Cancelar venda
      </ConfirmDialog>
    </form>
  );
}
