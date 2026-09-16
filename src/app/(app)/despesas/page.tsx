import { getSessionProfile } from "@/lib/auth";
import { listExpenses } from "@/lib/queries";
import { Section, Empty, Money } from "@/components/ui";
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
          <ul className="space-y-2">
            {expenses.map((e) => (
              <li key={e.id} className="card flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="font-semibold">{e.category}</div>
                  <div className="text-xs muted">
                    {new Date(e.occurred_on).toLocaleDateString("pt-BR")}
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
