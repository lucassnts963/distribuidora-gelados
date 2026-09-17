import { getSessionProfile } from "@/lib/auth";
import { listExpenses } from "@/lib/queries";
import { Section, Empty, Money } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { NewExpenseForm } from "./NewExpenseForm";
import { CancelExpenseForm } from "./CancelExpenseForm";

export const dynamic = "force-dynamic";

export default async function DespesasPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const expenses = await listExpenses(profile.org.id);
  const total = expenses.filter((e) => !e.reverted_at).reduce((sum, e) => sum + e.amount_cents, 0);

  return (
    <main>
      <h1 className="h1">Despesas</h1>

      <Section title={`Últimos lançamentos (total: ${(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`}>
        {!expenses.length ? (
          <Empty>Nenhuma despesa ainda.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {expenses.map((e) => (
              <li key={e.id} className="card space-y-2 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${e.reverted_at ? "text-stone-400 line-through" : ""}`}>
                        {e.category}
                      </span>
                      <span className="chip text-[10px]">{e.cost_type === "fixed" ? "Fixa" : "Variável"}</span>
                    </div>
                    <div className="text-xs muted">
                      {fmtDate(e.occurred_on)}
                      {e.description ? ` · ${e.description}` : ""}
                    </div>
                    {e.reverted_at && (
                      <div className="text-xs text-amber-600">Cancelada: {e.reversal_reason}</div>
                    )}
                  </div>
                  <Money
                    cents={e.amount_cents}
                    className={`font-bold ${e.reverted_at ? "text-stone-400 line-through" : "text-red-700"}`}
                  />
                </div>
                {!e.reverted_at && profile.role === "admin" && <CancelExpenseForm expenseId={e.id} />}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Nova despesa">
        <NewExpenseForm />
      </Section>
    </main>
  );
}
