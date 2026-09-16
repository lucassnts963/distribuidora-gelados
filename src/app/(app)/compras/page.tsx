import { getSessionProfile } from "@/lib/auth";
import { listExternalPurchases, listVisibleVariants } from "@/lib/queries";
import { Section, Empty, Money } from "@/components/ui";
import { NewExternalPurchaseForm } from "./NewExternalPurchaseForm";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [purchases, variants] = await Promise.all([
    listExternalPurchases(profile.org.id),
    listVisibleVariants(),
  ]);

  return (
    <main>
      <h1 className="h1">Compras</h1>
      <p className="text-sm muted">Entrada de estoque que não veio de um fornecedor cadastrado no sistema.</p>

      <Section title="Histórico">
        {!purchases.length ? (
          <Empty>Nenhuma compra externa ainda.</Empty>
        ) : (
          <ul className="space-y-2">
            {purchases.map((p) => (
              <li key={p.id} className="card flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="font-semibold">{p.supplier_name || "Fornecedor não informado"}</div>
                  <div className="text-xs muted">
                    {new Date(p.occurred_on).toLocaleDateString("pt-BR")}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
                <Money cents={p.total_cents} className="font-bold" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Nova compra">
        <NewExternalPurchaseForm variants={variants} />
      </Section>
    </main>
  );
}
