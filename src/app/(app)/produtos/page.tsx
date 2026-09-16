import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { listProducts } from "@/lib/queries";
import { Section, Empty } from "@/components/ui";
import { NewProductForm } from "./NewProductForm";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const products = await listProducts(profile.org.id);

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="h1">Produtos</h1>
        <Link href="/produtos/campos" className="text-sm font-semibold text-brand-600">
          Campos personalizados
        </Link>
      </div>

      <Section title="Cadastrados">
        {!products.length ? (
          <Empty>Nenhum produto ainda.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/produtos/${p.id}`} className="card block p-3">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs muted">
                    {p.product_variants?.length ?? 0} variação(ões){p.sku ? ` · ${p.sku}` : ""}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Novo produto">
        <NewProductForm />
      </Section>
    </main>
  );
}
