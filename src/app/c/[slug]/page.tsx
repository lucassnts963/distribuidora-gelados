import { notFound } from "next/navigation";
import { getPublicCatalog } from "@/lib/queries";
import { BRL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PublicCatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getPublicCatalog(slug);
  if (!catalog) return notFound();

  return (
    <main className="mx-auto max-w-3xl p-4">
      <header className="flex items-center gap-3 py-4">
        {catalog.org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={catalog.org.logoUrl} alt="" className="h-14 w-14 rounded-lg object-contain bg-white" />
        ) : (
          <div className="h-14 w-14 rounded-lg bg-stone-100" />
        )}
        <h1 className="h1">{catalog.org.name}</h1>
      </header>

      {catalog.items.length === 0 ? (
        <p className="muted p-4 text-sm">Nenhum produto disponível no momento.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {catalog.items.map((item) => (
            <li key={item.variantId} className="card space-y-2 p-3">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt="" className="h-40 w-full rounded-lg object-cover" />
              ) : (
                <div className="h-40 w-full rounded-lg bg-stone-100" />
              )}
              <div>
                <div className="font-semibold">{item.productName}</div>
                <div className="text-sm muted">{item.variantName}</div>
              </div>
              <div className="font-semibold text-brand-600">{BRL(item.priceCents)}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
