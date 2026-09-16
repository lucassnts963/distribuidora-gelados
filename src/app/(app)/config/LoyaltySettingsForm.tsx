"use client";

import { useActionState } from "react";
import { saveLoyaltySettingsAction } from "./actions";

type Settings = {
  enabled: boolean;
  points_per_100_wholesale: number;
  points_per_100_retail: number;
  redeem_cents_per_point: number;
};

export function LoyaltySettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(saveLoyaltySettingsAction, null);

  return (
    <form action={action} className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="h-4 w-4" />
        Programa de fidelidade ativo
      </label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="lbl">Pontos por R$100 (atacado)</label>
          <input
            name="points_per_100_wholesale"
            className="inp"
            inputMode="decimal"
            defaultValue={settings.points_per_100_wholesale || ""}
          />
        </div>
        <div>
          <label className="lbl">Pontos por R$100 (varejo)</label>
          <input
            name="points_per_100_retail"
            className="inp"
            inputMode="decimal"
            defaultValue={settings.points_per_100_retail || ""}
          />
        </div>
      </div>
      <div>
        <label className="lbl">Valor de resgate (R$ por ponto)</label>
        <input
          name="redeem_cents_per_point"
          className="inp"
          inputMode="decimal"
          placeholder="ex: 0,50"
          defaultValue={settings.redeem_cents_per_point ? (settings.redeem_cents_per_point / 100).toString() : ""}
        />
        <p className="mt-1 text-xs muted">Quanto 1 ponto vale de desconto numa venda futura.</p>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
