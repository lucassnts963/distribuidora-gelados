import Link from "next/link";
import { BRL } from "@/lib/db";
import { listFlavorsByProduct, listProducts, listStock } from "@/lib/queries";
import { saveFlavor, saveProduct, toggleFlavor } from "@/app/actions";
import { Empty, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Produtos() {
  const products = listProducts();
  const real = new Map(listStock().map((r) => [r.flavor_id, r]));
  return (
    <main>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="h1">Produtos</h1>
        <Link href="/clientes" className="btn-ghost px-3 py-2 text-xs">Clientes</Link>
      </header>

      <details className="card overflow-hidden">
        <summary className="cursor-pointer p-4 text-sm font-semibold text-brand-700">＋ Novo produto</summary>
        <form action={saveProduct} className="space-y-3 border-t border-stone-100 p-4">
          <div>
            <label className="lbl">Nome do produto</label>
            <input name="name" className="inp" placeholder="Laranjinha" required />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="lbl">Custo</label><input name="cost" inputMode="decimal" className="inp" placeholder="1,50" /></div>
            <div><label className="lbl">Atacado</label><input name="wholesale" inputMode="decimal" className="inp" placeholder="2,00" /></div>
            <div><label className="lbl">Varejo</label><input name="retail" inputMode="decimal" className="inp" placeholder="3,00" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked className="h-4 w-4" /> ativo</label>
          <button className="btn-primary w-full">Salvar produto</button>
        </form>
      </details>

      {products.length === 0 ? (
        <div className="mt-6"><Empty>Comece cadastrando <b>Laranjinha</b> e <b>Cremosinho</b> com o preço padrão — depois os sabores herdam esse preço.</Empty></div>
      ) : products.map((p) => {
        const flavors = listFlavorsByProduct(p.id);
        return (
          <Section key={p.id} title={`${p.name}${p.active ? "" : " (inativo)"}`}>
            <div className="card overflow-hidden">
              <details>
                <summary className="cursor-pointer bg-stone-50 px-4 py-3 text-xs font-semibold text-stone-600">
                  padrão: custo {BRL(p.cost_cents)} · atacado {BRL(p.wholesale_cents)} · varejo {BRL(p.retail_cents)} — editar
                </summary>
                <form action={saveProduct} className="space-y-3 border-t border-stone-100 p-4">
                  <input type="hidden" name="id" value={p.id} />
                  <div><label className="lbl">Nome</label><input name="name" defaultValue={p.name} className="inp" /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="lbl">Custo</label><input name="cost" defaultValue={(p.cost_cents / 100).toFixed(2).replace(".", ",")} className="inp" /></div>
                    <div><label className="lbl">Atacado</label><input name="wholesale" defaultValue={(p.wholesale_cents / 100).toFixed(2).replace(".", ",")} className="inp" /></div>
                    <div><label className="lbl">Varejo</label><input name="retail" defaultValue={(p.retail_cents / 100).toFixed(2).replace(".", ",")} className="inp" /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={!!p.active} className="h-4 w-4" /> ativo</label>
                  <button className="btn-ghost w-full">Atualizar</button>
                </form>
              </details>

              <div className="divide-y divide-stone-100 border-t border-stone-100">
                {flavors.map((f) => (
                  <div key={f.flavor_id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-semibold ${f.flavor_active ? "" : "text-stone-400 line-through"}`}>{f.flavor_name}</div>
                      <div className="text-[11px] muted tabular">
                        tabela {BRL(f.cost_cents)} → {BRL(f.wholesale_cents)} atacado / {BRL(f.retail_cents)} varejo ·
                        lucro {BRL(f.wholesale_cents - f.cost_cents)} / {BRL(f.retail_cents - f.cost_cents)}
                      </div>
                      {(() => {
                        const r = real.get(f.flavor_id);
                        if (!r || r.avg_cost_cents <= 0) return null;
                        const diff = r.avg_cost_cents - f.cost_cents;
                        return (
                          <div className="text-[11px] tabular">
                            <span className="font-semibold text-stone-700">custo médio real {BRL(r.avg_cost_cents)}</span>
                            {Math.abs(diff) >= 1 && (
                              <span className={diff > 0 ? "text-red-600" : "text-emerald-600"}>
                                {" "}({diff > 0 ? "+" : ""}{BRL(diff)} vs tabela)
                              </span>
                            )}
                            <span className="text-emerald-700"> · lucro real {BRL(f.wholesale_cents - r.avg_cost_cents)} / {BRL(f.retail_cents - r.avg_cost_cents)}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <form action={toggleFlavor}>
                      <input type="hidden" name="id" value={f.flavor_id} />
                      <button className="btn-ghost px-3 py-2 text-[11px]">{f.flavor_active ? "pausar" : "ativar"}</button>
                    </form>
                  </div>
                ))}
              </div>

              <details className="border-t border-stone-100">
                <summary className="cursor-pointer p-3 text-xs font-semibold text-brand-700">＋ Novo sabor de {p.name}</summary>
                <form action={saveFlavor} className="space-y-3 p-4 pt-0">
                  <input type="hidden" name="product_id" value={p.id} />
                  <div><label className="lbl">Sabor</label><input name="name" className="inp" placeholder="Açaí" required /></div>
                  <p className="text-[11px] muted">Deixe os preços vazios para herdar o padrão do produto. Preencha só se este sabor custar diferente.</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="lbl">Custo</label><input name="cost" inputMode="decimal" className="inp" /></div>
                    <div><label className="lbl">Atacado</label><input name="wholesale" inputMode="decimal" className="inp" /></div>
                    <div><label className="lbl">Varejo</label><input name="retail" inputMode="decimal" className="inp" /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked className="h-4 w-4" /> ativo</label>
                  <button className="btn-primary w-full">Salvar sabor</button>
                </form>
              </details>
            </div>
          </Section>
        );
      })}
    </main>
  );
}
