"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { revertBatchAction } from "./actions";

export function RevertBatchForm({ batchId }: { batchId: string }) {
  const [state, action] = useActionState(revertBatchAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={batchId} />
      <ConfirmSubmitButton
        className="btn-ghost"
        pendingText="Revertendo…"
        confirmMessage="Reverter essa produção? Só funciona se nada dela foi vendido ainda."
      >
        Reverter
      </ConfirmSubmitButton>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
