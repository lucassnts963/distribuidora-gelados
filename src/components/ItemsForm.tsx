type Variant = { id: string; name: string; products?: { name: string } | null };

export function ItemsForm({
  variants,
  priceFieldName,
  priceLabel,
}: {
  variants: Variant[];
  priceFieldName: string;
  priceLabel: string;
}) {
  if (!variants.length) {
    return <p className="text-sm muted">Nenhuma variação disponível ainda.</p>;
  }
  return (
    <div className="space-y-2">
      {variants.map((v) => (
        <div key={v.id} className="flex items-center gap-2">
          <input type="hidden" name="variant_id[]" value={v.id} />
          <div className="flex-1 text-sm">
            <div className="font-medium">{v.name}</div>
            {v.products?.name && <div className="text-xs muted">{v.products.name}</div>}
          </div>
          <input name="qty[]" className="inp w-20" inputMode="decimal" placeholder="Qtd." />
          <input
            name={`${priceFieldName}[]`}
            className="inp w-24"
            inputMode="decimal"
            placeholder={priceLabel}
          />
        </div>
      ))}
    </div>
  );
}
