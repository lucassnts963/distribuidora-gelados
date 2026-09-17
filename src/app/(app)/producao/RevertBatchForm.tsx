"use client";

import { useActionState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { revertBatchAction } from "./actions";

export function RevertBatchForm({ batchId }: { batchId: string }) {
  const [state, action] = useActionState(revertBatchAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={batchId} />
      <ConfirmDialog
        className="btn-ghost"
        pendingText="Revertendo…"
        confirmMessage="Reverter essa produção? Só funciona se nada dela foi vendido ainda."
        confirmLabel="Reverter"
        error={state?.error}
        success={!!state?.ok}
      >
        Reverter
      </ConfirmDialog>
    </form>
  );
}
