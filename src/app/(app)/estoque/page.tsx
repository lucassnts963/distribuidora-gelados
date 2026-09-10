import Link from "next/link";
import { BRL, today } from "@/lib/db";
import { coverage, listStock, recentAdjustments, stockValue } from "@/lib/queries";
import { createAdjustment } from "@/app/actions";
import { Empty, Section, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Estoque() {
  const rows = listStock({ onlyActive: true });
  const cov = new Map(coverage(30).map((c) => [c.flavor_id, c]));
  const val = stockValue();
  const adjs = recentAdjustments(15);

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!groups.has(r.product_name)) groups.set(r.product_name, []);
    groups.get(r.product_name)!.push(r);
  }

  return (
    <main>
      <h1 className="h1 mb-4">Estoque</h1>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Unidades" value={val.units.toLocaleString("pt-BR")} />
        <Stat label="Custo parado" value={BRL(val.v)} tone="brand" />
      </div>
      <p className="mt-2 px-1 text-xs muted">
        Estoque valorizado pelo <b>custo médio ponderado móvel</b> — cada compra a preço novo
        recalcula a média sobre o saldo que ainda está no freezer, não sobre tudo que você já comprou.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6"><Empty>Nada cadastrado. <Link href="/produtos" className="font-semibold text-brand-600">Cadastrar produtos</Link></Empty></div>
      ) : [...groups.entries()].map(([product, items]) => (
        <Section key={product} title={product}>
          <div className="card divide-y divide-stone-100">
            {items.map((r) => {
              const c = cov.get(r.flavor_id);
              const danger = r.qty <= 0;
              const low = !danger && c?.daysLeft != null && c.daysLeft < 7;
              const idle = r.qty > 0 && (c?.idleDays == null || c.idleDays >= 14);
              return (
                <div key={r.flavor_id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{r.flavor_name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {danger && <span className="chip bg-red-100 text-red-700">zerado</span>}
                        {low && <span className="chip bg-amber-100 text-amber-800">~{Math.floor(c!.daysLeft!)} dias</span>}
                        {idle && !danger && (
                          <span className="chip bg-stone-100 text-stone-600">
                            {c?.idleDays == null ? "nunca vendeu" : `parado ${c.idleDays}d`}
                          </span>
                        )}
                        {c && c.perDay > 0 && (
                          <span className="chip bg-emerald-50 text-emerald-700">{c.perDay.toFixed(1)} un/dia</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold tabular ${danger ? "text-red-600" : ""}`}>{r.qty}</div>
                      <div className="text-[11px] muted tabular">{BRL(r.qty * r.cost_cents)}</div>
                      {r.avg_cost_cents > 0 && (
                        <div className="text-[11px] tabular text-stone-400">médio {BRL(r.avg_cost_cents)}</div>
                      )}
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-brand-600">ajustar (perda, brinde, contagem)</summary>
                    <form action={createAdjustment} className="mt-2 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="flavor_id" value={r.flavor_id} />
                      <input type="hidden" name="occurred_on" value={today()} />
                      <div>
                        <label className="lbl">Qtd</label>
                        <input name="qty" inputMode="numeric" className="inp h-10 w-20 py-2 text-center" required />
                      </div>
                      <div className="flex-1">
                        <label className="lbl">Motivo</label>
                        <select name="reason" className="inp h-10 py-2">
                          <option value="perda">perda / derreteu</option>
                          <option value="brinde">brinde / degustação</option>
                          <option value="consumo">consumo próprio</option>
                          <option value="contagem-">contagem: tinha menos</option>
                          <option value="contagem+">contagem: tinha mais</option>
                        </select>
                      </div>
                      <button className="btn-ghost h-10 py-2 text-xs">Salvar</button>
                    </form>
                  </details>
                </div>
              );
            })}
          </div>
        </Section>
      ))}

      {adjs.length > 0 && (
        <Section title="Ajustes recentes">
          <div className="card divide-y divide-stone-100 text-xs">
            {adjs.map((a) => (
              <div key={a.id} className="flex justify-between p-3">
                <span>{a.flavor_name} <span className="muted">· {a.reason}</span></span>
                <span className={`tabular font-semibold ${a.qty < 0 ? "text-red-700" : "text-emerald-700"}`}>
                  {a.qty > 0 ? "+" : ""}{a.qty}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}
