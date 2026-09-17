"use client";

import { useActionState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cancelExpenseAction } from "./actions";

const REASONS = ["Dado de teste", "Erro de lançamento", "Devolução ou estorno", "Outro"];

export function CancelExpenseForm({ expenseId }: { expenseId: string }) {
  const [state, action] = useActionState(cancelExpenseAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={expenseId} />
      <ConfirmDialog
        className="btn-ghost"
        pendingText="Cancelando…"
        confirmMessage="Cancelar essa despesa? Ela deixa de contar nos relatórios, mas continua visível (tachada) aqui."
        confirmLabel="Cancelar despesa"
        error={state?.error}
        success={!!state?.ok}
        extraFields={
          <div className="space-y-2">
            <div>
              <label className="lbl">Motivo</label>
              <select name="reason_kind" className="inp" defaultValue={REASONS[0]}>
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <input name="reason_note" className="inp" placeholder="Detalhe (opcional)" />
          </div>
        }
      >
        Cancelar
      </ConfirmDialog>
    </form>
  );
}
