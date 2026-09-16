"use client";

import { useActionState } from "react";
import { saveCatalogSlugAction } from "./actions";

export function CatalogSlugForm({ currentSlug }: { currentSlug: string | null }) {
  const [state, action, pending] = useActionState(saveCatalogSlugAction, null);
  const slug = state?.ok ? state.slug : currentSlug;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <form action={action} className="space-y-2">
      <label className="lbl">Endereço do catálogo público</label>
      <div className="flex items-center gap-2">
        <input
          name="catalog_slug"
          className="inp"
          placeholder="minha-loja"
          defaultValue={currentSlug ?? ""}
        />
        <button className="btn-ghost shrink-0" disabled={pending}>
          {pending ? "..." : "Salvar"}
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {slug && (
        <p className="text-xs muted">
          Catálogo em: <span className="font-mono">{origin}/c/{slug}</span>
        </p>
      )}
    </form>
  );
}
