import { getSessionProfile } from "@/lib/auth";
import { getProduct, listCustomFields } from "@/lib/queries";
import { Section, Empty } from "@/components/ui";
import { toggleVariantAction } from "../actions";
import { AddVariantForm } from "./AddVariantForm";
import { CustomValuesForm } from "./CustomValuesForm";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [product, fields] = await Promise.all([
    getProduct(profile.org.id, id),
    listCustomFields(profile.org.id),
  ]);
  if (!product) return <main><Empty>Produto não encontrado.</Empty></main>;

  return (
    <main>
      <h1 className="h1">{product.name}</h1>
      {product.sku && <p className="text-sm muted">SKU: {product.sku}</p>}

      <Section title="Variações">
        {!product.product_variants?.length ? (
          <Empty>Nenhuma variação ainda.</Empty>
        ) : (
          <ul className="space-y-2">
            {product.product_variants.map((v) => (
              <li key={v.id} className="card flex items-center justify-between gap-2 p-3">
                <div className="font-semibold">{v.name}</div>
                <form action={toggleVariantAction}>
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="product_id" value={product.id} />
                  <input type="hidden" name="active" value={String(v.active)} />
                  <button className={v.active ? "btn-ghost" : "btn-primary"}>
                    {v.active ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <AddVariantForm productId={product.id} />
        </div>
      </Section>

      {fields.filter((f) => f.active).length > 0 && (
        <Section title="Campos personalizados">
          <CustomValuesForm
            productId={product.id}
            fields={fields.filter((f) => f.active)}
            values={product.customValues}
          />
        </Section>
      )}
    </main>
  );
}
