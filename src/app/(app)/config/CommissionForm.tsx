"use client";

import { SubmitButton } from "@/components/SubmitButton";
import { setCommissionRateAction } from "./actions";

export function CommissionForm({
  memberId,
  currentRateBp,
}: {
  memberId: string;
  currentRateBp: number | null;
}) {
  return (
    <form action={setCommissionRateAction} className="flex items-center gap-2">
      <input type="hidden" name="member_id" value={memberId} />
      <input
        name="rate_percent"
        className="inp"
        inputMode="decimal"
        placeholder="Comissão (%)"
        defaultValue={currentRateBp ? (currentRateBp / 100).toString() : ""}
      />
      <SubmitButton className="btn-ghost shrink-0" pendingText="...">
        Salvar
      </SubmitButton>
    </form>
  );
}
