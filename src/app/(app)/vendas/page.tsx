import Link from "next/link";
import { BRL } from "@/lib/db";
import { recentSales, saleItems } from "@/lib/queries";
import { deleteSale } from "@/app/actions";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Vendas() {
  const sales = recentSales(50);
  return (
    <main>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="h1">Vendas</h1>
        <Link href="/vendas/nova" className="btn-primary px-4 py-2 text-sm">＋ Nova</Link>
      </header>

      {sales.length === 0 ? <Empty>Nenhuma venda registrada ainda.</Empty> : (
        <div className="space-y-2">
          {sales.map((s) => {
            const items = saleItems(s.id);
            const profit = s.total_cents - s.cost_cents;
            return (
              <details key={s.id} className="card overflow-hidden">
                <summary className="flex cursor-pointer items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`chip ${s.channel === "atacado" ? "bg-brand-100 text-brand-800" : "bg-stone-100 text-stone-700"}`}>
                        {s.channel}
                      </span>
                      <span className="truncate text-sm font-semibold">{s.customer_name || "sem cadastro"}</span>
                    </div>
                    <div className="mt-0.5 text-xs muted">
                      {new Date(s.occurred_on + "T12:00:00").toLocaleDateString("pt-BR")} · {s.units} un · {s.payment}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular">{BRL(s.total_cents)}</div>
                    <div className="text-xs tabular text-emerald-700">+{BRL(profit)}</div>
                  </div>
                </summary>
                <div className="border-t border-stone-100 bg-stone-50/60 px-3 py-2">
                  <ul className="space-y-1 text-xs">
                    {items.map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <span>{i.qty}× {i.flavor_name} <span className="muted">({i.product_name})</span></span>
                        <span className="tabular">{BRL(i.qty * i.unit_cents)}</span>
                      </li>
                    ))}
                  </ul>
                  {s.note && <p className="mt-2 text-xs muted">{s.note}</p>}
                  <form action={deleteSale} className="mt-2">
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn-danger w-full py-2 text-xs">Excluir venda (devolve ao estoque)</button>
                  </form>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}
