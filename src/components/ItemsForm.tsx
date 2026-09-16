"use client";

import { useState } from "react";

type Variant = { id: string; name: string; products?: { name: string } | null };
type PriceInfo = { wholesale_cents: number | null; retail_cents: number | null };

export function ItemsForm({
  variants,
  priceFieldName,
  priceLabel,
  channel,
  prices,
  costs,
}: {
  variants: Variant[];
  priceFieldName: string;
  priceLabel: string;
  channel?: "retail" | "wholesale";
  prices?: Map<string, PriceInfo>;
  costs?: Map<string, number>;
}) {
  if (!variants.length) {
    return <p className="text-sm muted">Nenhuma variação disponível ainda.</p>;
  }
  return (
    <div className="space-y-2">
      {variants.map((v) => {
        const price = prices?.get(v.id);
        const suggestedCents = channel
          ? channel === "wholesale"
            ? price?.wholesale_cents
            : price?.retail_cents
          : undefined;
        return (
          <ItemRow
            key={`${v.id}-${channel ?? ""}`}
            variant={v}
            priceFieldName={priceFieldName}
            priceLabel={priceLabel}
            suggestedCents={suggestedCents ?? undefined}
            costCents={costs?.get(v.id)}
          />
        );
      })}
    </div>
  );
}

function ItemRow({
  variant,
  priceFieldName,
  priceLabel,
  suggestedCents,
  costCents,
}: {
  variant: Variant;
  priceFieldName: string;
  priceLabel: string;
  suggestedCents?: number;
  costCents?: number;
}) {
  const [value, setValue] = useState(suggestedCents ? (suggestedCents / 100).toFixed(2) : "");
  const typedCents = Math.round(Number(value.replace(",", ".")) * 100);
  const belowCost = !!costCents && costCents > 0 && value !== "" && !Number.isNaN(typedCents) && typedCents < costCents;

  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name="variant_id[]" value={variant.id} />
      <div className="flex-1 text-sm">
        <div className="font-medium">{variant.name}</div>
        {variant.products?.name && <div className="text-xs muted">{variant.products.name}</div>}
        {belowCost && (
          <div className="text-xs text-amber-600">
            abaixo do custo ({(costCents! / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
          </div>
        )}
      </div>
      <input name="qty[]" className="inp w-20" inputMode="decimal" placeholder="Qtd." />
      <input
        name={`${priceFieldName}[]`}
        className="inp w-24"
        inputMode="decimal"
        placeholder={priceLabel}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
