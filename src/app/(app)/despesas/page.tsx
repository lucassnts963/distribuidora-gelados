import { getSessionProfile } from "@/lib/auth";
import { listExpenses } from "@/lib/queries";
import { Section, Empty, Money } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { NewExpenseForm } from "./NewExpenseForm";

export const dynamic = "force-dynamic";

export default async function DespesasPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const expenses = await listExpenses(profile.org.id);
  const total = expenses.reduce((sum, e) => sum + e.amount_cents, 0);

  return (
    <main>
      <h1 className="h1">Despesas</h1>

      <Section title={`Últimos lançamentos (total: ${(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`}>
        {!expenses.length ? (
          <Empty>Nenhuma despesa ainda.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {expenses.map((e) => (
              <li key={e.id} className="card flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{e.category}</span>
                    <span className="chip text-[10px]">{e.cost_type === "fixed" ? "Fixa" : "Variável"}</span>
                  </div>
                  <div className="text-xs muted">
                    {fmtDate(e.occurred_on)}
                    {e.description ? ` · ${e.description}` : ""}
                  </div>
                </div>
                <Money cents={e.amount_cents} className="font-bold text-red-700" />
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
