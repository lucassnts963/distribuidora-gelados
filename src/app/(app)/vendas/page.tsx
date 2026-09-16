import { getSessionProfile } from "@/lib/auth";
import { listSales, orgStock, listContacts, listOrgPrices, listVariantCosts } from "@/lib/queries";
import { Section, Empty, Money } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { NewSaleForm } from "./NewSaleForm";

export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [sales, stock, contacts, prices, costs] = await Promise.all([
    listSales(profile.org.id),
    orgStock(profile.org.id),
    listContacts(profile.org.id),
    listOrgPrices(profile.org.id),
    listVariantCosts(profile.org.id),
  ]);
  const variants = stock
    .filter((s) => s.qty > 0)
    .map((s) => ({ id: s.variantId, name: s.name, products: { name: s.product } }));

  return (
    <main>
      <h1 className="h1">Vendas</h1>

      <Section title="Histórico">
        {!sales.length ? (
          <Empty>Nenhuma venda ainda.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {sales.map((sale) => {
              const contact = sale.contact as unknown as { name: string } | null;
              return (
                <li key={sale.id} className="card flex items-center justify-between p-3 text-sm">
                  <div>
                    <div className="font-semibold">{contact?.name ?? "Venda avulsa"}</div>
                    <div className="text-xs muted">
                      {sale.channel === "wholesale" ? "Atacado" : "Varejo"} · {fmtDate(sale.created_at)}
                    </div>
                  </div>
                  <Money cents={sale.total_cents} className="font-bold" />
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Nova venda">
        <NewSaleForm
          variants={variants}
          contacts={contacts}
          prices={Object.fromEntries(prices)}
          costs={Object.fromEntries(costs)}
        />
      </Section>
    </main>
  );
}
