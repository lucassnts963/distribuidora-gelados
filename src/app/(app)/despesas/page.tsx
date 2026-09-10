import { BRL, today } from "@/lib/db";
import { recentExpenses } from "@/lib/queries";
import { createExpense, deleteExpense } from "@/app/actions";
import { Empty, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const CATS = ["combustível", "energia", "embalagem", "gelo", "divulgação", "freezer", "outros"];

export default async function Despesas() {
  const rows = recentExpenses(60);
  const total = rows.reduce((a, r) => a + r.amount_cents, 0);
  return (
    <main>
      <h1 className="h1 mb-4">Despesas</h1>

      <form action={createExpense} className="card space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="lbl">Valor</label>
            <input name="amount" inputMode="decimal" className="inp" placeholder="0,00" required />
          </div>
          <div>
            <label className="lbl">Data</label>
            <input name="occurred_on" type="date" defaultValue={today()} className="inp" />
          </div>
        </div>
        <div>
          <label className="lbl">Categoria</label>
          <select name="category" className="inp">{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div>
          <label className="lbl">Descrição</label>
          <input name="description" className="inp" placeholder="ex.: gasolina da entrega do sábado" />
        </div>
        <button className="btn-primary w-full">Lançar despesa</button>
      </form>

      <Section title={`Últimos lançamentos · ${BRL(total)}`}>
        {rows.length === 0 ? <Empty>Nenhuma despesa lançada. Sem isso o lucro que você vê é otimista.</Empty> : (
          <div className="card divide-y divide-stone-100">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold capitalize">{r.category}</div>
                  <div className="truncate text-xs muted">
                    {new Date(r.occurred_on + "T12:00:00").toLocaleDateString("pt-BR")}
                    {r.description ? ` · ${r.description}` : ""}
                  </div>
                </div>
                <div className="text-sm font-bold tabular text-red-700">−{BRL(r.amount_cents)}</div>
                <form action={deleteExpense}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn-danger px-3 py-2 text-xs">✕</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}
