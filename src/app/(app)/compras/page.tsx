import Link from "next/link";
import { BRL } from "@/lib/db";
import { recentPurchases } from "@/lib/queries";
import { deletePurchase } from "@/app/actions";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Compras() {
  const rows = recentPurchases(50);
  return (
    <main>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="h1">Compras</h1>
        <Link href="/compras/nova" className="btn-primary px-4 py-2 text-sm">＋ Nova</Link>
      </header>
      {rows.length === 0 ? <Empty>Nenhuma entrada de estoque registrada.</Empty> : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.supplier || "fornecedor não informado"}</div>
                <div className="text-xs muted">
                  {new Date(p.occurred_on + "T12:00:00").toLocaleDateString("pt-BR")} · {p.units} un
                  {p.note ? ` · ${p.note}` : ""}
                </div>
              </div>
              <div className="text-sm font-bold tabular text-red-700">−{BRL(p.total_cents)}</div>
              <form action={deletePurchase}>
                <input type="hidden" name="id" value={p.id} />
                <button className="btn-danger px-3 py-2 text-xs">✕</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
