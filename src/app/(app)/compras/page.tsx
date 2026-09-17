import { getSessionProfile } from "@/lib/auth";
import { listExternalPurchases, listVisibleVariants } from "@/lib/queries";
import { Section, Empty, Money } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { NewExternalPurchaseForm } from "./NewExternalPurchaseForm";
import { CancelPurchaseForm } from "./CancelPurchaseForm";

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
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {purchases.map((p) => (
              <li key={p.id} className="card space-y-2 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-semibold ${p.reverted_at ? "text-stone-400 line-through" : ""}`}>
                      {p.supplier_name || "Fornecedor não informado"}
                    </div>
                    <div className="text-xs muted">
                      {fmtDate(p.occurred_on)}
                      {p.note ? ` · ${p.note}` : ""}
                    </div>
                    {p.reverted_at && (
                      <div className="text-xs text-amber-600">Cancelada: {p.reversal_reason}</div>
                    )}
                  </div>
                  <Money
                    cents={p.total_cents}
                    className={`font-bold ${p.reverted_at ? "text-stone-400 line-through" : ""}`}
                  />
                </div>
                {!p.reverted_at && profile.role === "admin" && <CancelPurchaseForm purchaseId={p.id} />}
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
