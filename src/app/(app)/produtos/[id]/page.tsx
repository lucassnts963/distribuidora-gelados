import { getSessionProfile } from "@/lib/auth";
import { getProduct, listCustomFields, listRawMaterials, listRecipeItems } from "@/lib/queries";
import { Section, Empty } from "@/components/ui";
import { toggleVariantAction } from "../actions";
import { AddVariantForm } from "./AddVariantForm";
import { CustomValuesForm } from "./CustomValuesForm";
import { RecipeForm } from "./RecipeForm";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [product, fields, rawMaterials] = await Promise.all([
    getProduct(profile.org.id, id),
    listCustomFields(profile.org.id),
    listRawMaterials(profile.org.id),
  ]);
  if (!product) return <main><Empty>Produto não encontrado.</Empty></main>;

  const recipesByVariant = new Map(
    await Promise.all(
      (product.product_variants ?? []).map(
        async (v) => [v.id, await listRecipeItems(v.id)] as const
      )
    )
  );

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
              <li key={v.id} className="card space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{v.name}</div>
                  <form action={toggleVariantAction}>
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="product_id" value={product.id} />
                    <input type="hidden" name="active" value={String(v.active)} />
                    <button className={v.active ? "btn-ghost" : "btn-primary"}>
                      {v.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
                <RecipeForm
                  productId={product.id}
                  variantId={v.id}
                  rawMaterials={rawMaterials}
                  items={
                    (recipesByVariant.get(v.id) ?? []) as unknown as {
                      id: string;
                      raw_material_id: string;
                      qty_per_unit: number;
                      raw_materials: { name: string; unit: string } | null;
                    }[]
                  }
                />
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
