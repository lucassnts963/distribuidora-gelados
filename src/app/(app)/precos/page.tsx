import { getSessionProfile } from "@/lib/auth";
import { orgStock, listOrgPrices } from "@/lib/queries";
import { Section, Empty } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { savePriceAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PrecosPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [stock, prices] = await Promise.all([orgStock(profile.org.id), listOrgPrices(profile.org.id)]);

  return (
    <main>
      <h1 className="h1">Preços</h1>
      <p className="text-sm muted">
        Defina o preço de atacado e varejo para o que você vende — vale tanto pro que você produz
        quanto pro que revende.
      </p>

      <Section title="Suas variações">
        {!stock.length ? (
          <Empty>Nenhuma variação em estoque ainda.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {stock.map((s) => {
              const price = prices.get(s.variantId);
              return (
                <li key={s.variantId} className="card space-y-2 p-3">
                  <div className="font-semibold">
                    {s.product} · {s.name}
                  </div>
                  <form action={savePriceAction} className="flex gap-2">
                    <input type="hidden" name="variant_id" value={s.variantId} />
                    <input
                      name="wholesale"
                      className="inp"
                      inputMode="decimal"
                      placeholder="Atacado (R$)"
                      defaultValue={price?.wholesale_cents ? (price.wholesale_cents / 100).toFixed(2) : ""}
                    />
                    <input
                      name="retail"
                      className="inp"
                      inputMode="decimal"
                      placeholder="Varejo (R$)"
                      defaultValue={price?.retail_cents ? (price.retail_cents / 100).toFixed(2) : ""}
                    />
                    <SubmitButton pendingText="Salvando…">Salvar</SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </main>
  );
}
