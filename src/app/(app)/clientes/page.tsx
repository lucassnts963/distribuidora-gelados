import Link from "next/link";
import { listCustomers } from "@/lib/queries";
import { saveCustomer } from "@/app/actions";
import { Empty, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Clientes() {
  const rows = listCustomers();
  return (
    <main>
      <header className="mb-4 flex items-center gap-3">
        <Link href="/produtos" className="btn-ghost px-3 py-2 text-sm">←</Link>
        <h1 className="h1">Clientes</h1>
      </header>

      <form action={saveCustomer} className="card space-y-3 p-4">
        <div><label className="lbl">Nome</label><input name="name" className="inp" required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="lbl">WhatsApp</label><input name="phone" inputMode="tel" className="inp" placeholder="(91) 9...." /></div>
          <div><label className="lbl">Tipo</label>
            <select name="kind" className="inp"><option value="revenda">revenda</option><option value="final">consumidor final</option></select>
          </div>
        </div>
        <div><label className="lbl">Observação</label><input name="note" className="inp" placeholder="ex.: compra toda sexta, bairro Vila dos Cabanos" /></div>
        <button className="btn-primary w-full">Salvar cliente</button>
      </form>

      <Section title={`Cadastrados (${rows.length})`}>
        {rows.length === 0 ? <Empty>Cadastre os revendedores. Saber quem compra mais é o que te protege de depender de um só.</Empty> : (
          <div className="card divide-y divide-stone-100">
            {rows.map((c) => (
              <div key={c.id} className="p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="chip bg-stone-100 text-stone-600">{c.kind}</span>
                </div>
                <div className="text-xs muted">{[c.phone, c.note].filter(Boolean).join(" · ")}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}
