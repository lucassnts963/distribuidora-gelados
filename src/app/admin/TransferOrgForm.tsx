"use client";

import { useActionState } from "react";
import { transferOrganizationAction } from "./actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export function TransferOrgForm({ orgId, memberCount }: { orgId: string; memberCount: number }) {
  const [state, action] = useActionState(transferOrganizationAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="org_id" value={orgId} />
      <p className="text-sm muted">
        Isso remove o acesso de {memberCount} {memberCount === 1 ? "pessoa" : "pessoas"} que estão nela
        hoje — só a conta de destino fica com a organização.
      </p>
      <div>
        <label className="lbl">Email da conta de destino</label>
        <input name="email" type="email" className="inp" required />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Transferida.</p>}
      <ConfirmSubmitButton
        className="btn-danger w-full"
        pendingText="Transferindo…"
        confirmMessage="Transferir essa organização? Quem está nela hoje perde o acesso agora."
      >
        Transferir
      </ConfirmSubmitButton>
    </form>
  );
}
