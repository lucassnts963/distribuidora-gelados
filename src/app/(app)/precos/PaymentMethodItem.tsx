"use client";

import { SubmitButton } from "@/components/SubmitButton";
import { setPaymentMethodFeeAction, togglePaymentMethodAction, toggleDeferredAction } from "./actions";

export function PaymentMethodItem({
  id,
  name,
  feePercent,
  active,
  isDeferred,
}: {
  id: string;
  name: string;
  feePercent: number;
  active: boolean;
  isDeferred: boolean;
}) {
  return (
    <li className="card flex flex-wrap items-center gap-2 p-3 text-sm">
      <div className={`min-w-[8rem] font-semibold ${active ? "" : "text-stone-400 line-through"}`}>
        {name}
        {isDeferred && <span className="chip ml-2 text-[10px]">a prazo</span>}
      </div>
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
      <form action={toggleDeferredAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="is_deferred" value={String(isDeferred)} />
        <SubmitButton className="btn-ghost" pendingText="...">
          {isDeferred ? "Tornar à vista" : "Tornar a prazo"}
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
