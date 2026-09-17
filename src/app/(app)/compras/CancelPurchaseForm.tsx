"use client";

import { useActionState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cancelExternalPurchaseAction } from "./actions";

const REASONS = ["Dado de teste", "Erro de lançamento", "Devolução ou estorno", "Outro"];

export function CancelPurchaseForm({ purchaseId }: { purchaseId: string }) {
  const [state, action] = useActionState(cancelExternalPurchaseAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={purchaseId} />
      <ConfirmDialog
        className="btn-ghost"
        pendingText="Cancelando…"
        confirmMessage="Cancelar essa compra? Só funciona se nada do que entrou foi vendido ainda."
        confirmLabel="Cancelar compra"
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
