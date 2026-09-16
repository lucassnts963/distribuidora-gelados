import { getSessionProfile } from "@/lib/auth";
import { listSales, orgStock, listContacts, listOrgPrices, listVariantCosts, listPaymentMethods } from "@/lib/queries";
import { Section, Empty, Money } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { fmtDate } from "@/lib/format";
import { SaleFormSwitcher } from "./SaleFormSwitcher";
import { cancelSaleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [sales, stock, contacts, prices, costs, paymentMethods] = await Promise.all([
    listSales(profile.org.id),
    orgStock(profile.org.id),
    listContacts(profile.org.id),
    listOrgPrices(profile.org.id),
    listVariantCosts(profile.org.id),
    listPaymentMethods(profile.org.id),
  ]);
  const variants = stock
    .filter((s) => s.qty > 0)
    .map((s) => ({ id: s.variantId, name: s.name, products: { name: s.product }, photoUrl: s.photoUrl }));

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
                <li key={sale.id} className="card space-y-2 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{contact?.name ?? "Venda avulsa"}</div>
                      <div className="text-xs muted">
                        {sale.channel === "wholesale" ? "Atacado" : "Varejo"} · {fmtDate(sale.created_at)}
                        {sale.reverted_at && " · cancelada"}
                      </div>
                    </div>
                    <Money
                      cents={sale.total_cents}
                      className={`font-bold ${sale.reverted_at ? "text-stone-400 line-through" : ""}`}
                    />
                  </div>
                  {!sale.reverted_at && profile.role === "admin" && (
                    <form action={cancelSaleAction}>
                      <input type="hidden" name="id" value={sale.id} />
                      <ConfirmSubmitButton
                        className="btn-danger w-full"
                        pendingText="Cancelando…"
                        confirmMessage="Cancelar essa venda? O estoque volta pelo custo que saiu."
                      >
                        Cancelar venda
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Nova venda">
        <SaleFormSwitcher
          variants={variants}
          contacts={contacts}
          prices={Object.fromEntries(prices)}
          costs={Object.fromEntries(costs)}
          paymentMethods={paymentMethods.filter((pm) => pm.active)}
        />
      </Section>
    </main>
  );
}
