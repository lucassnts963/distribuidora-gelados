"use client";

import { useActionState, useState } from "react";
import { saveCustomFieldAction } from "../actions";

export function CustomFieldForm() {
  const [state, action, pending] = useActionState(saveCustomFieldAction, null);
  const [type, setType] = useState("text");

  return (
    <form action={action} className="card space-y-4 p-4">
      <div>
        <label className="lbl">Rótulo (o que aparece na tela)</label>
        <input name="label" className="inp" required placeholder="Ex: Validade padrão (dias)" />
      </div>
      <div>
        <label className="lbl">Chave (identificador único, sem espaço)</label>
        <input name="key" className="inp" required placeholder="Ex: validade_padrao_dias" />
      </div>
      <div>
        <label className="lbl">Tipo</label>
        <select name="field_type" className="inp" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="text">Texto</option>
          <option value="number">Número</option>
          <option value="date">Data</option>
          <option value="boolean">Sim/Não</option>
          <option value="select">Lista de opções</option>
        </select>
      </div>
      {type === "select" && (
        <div>
          <label className="lbl">Opções (separadas por vírgula)</label>
          <input name="options" className="inp" placeholder="Ex: Congelado, Refrigerado, Ambiente" />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" className="h-4 w-4" />
        Obrigatório
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Salvando…" : "Adicionar campo"}
      </button>
    </form>
  );
}
