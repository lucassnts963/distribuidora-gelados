"use client";

import { SubmitButton } from "@/components/SubmitButton";
import { setPaymentMethodFeeAction, togglePaymentMethodAction } from "./actions";

export function PaymentMethodItem({
  id,
  name,
  feePercent,
  active,
}: {
  id: string;
  name: string;
  feePercent: number;
  active: boolean;
}) {
  return (
    <li className="card flex flex-wrap items-center gap-2 p-3 text-sm">
      <div className={`min-w-[8rem] font-semibold ${active ? "" : "text-stone-400 line-through"}`}>{name}</div>
      <form action={setPaymentMethodFeeAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input
          name="fee_percent"
          className="inp w-24"
          inputMode="decimal"
          defaultValue={feePercent ? feePercent.toString() : ""}
          placeholder="Taxa %"
        />
        <SubmitButton className="btn-ghost" pendingText="...">
          Salvar
        </SubmitButton>
      </form>
      <form action={togglePaymentMethodAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="active" value={String(active)} />
        <SubmitButton className={active ? "btn-ghost" : "btn-primary"} pendingText="...">
          {active ? "Desativar" : "Ativar"}
        </SubmitButton>
      </form>
    </li>
  );
}
