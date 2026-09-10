import Link from "next/link";
import { getSetting, setSetting } from "@/lib/db";
import { logoutAction, recalcAllCosts } from "@/app/actions";
import { revalidatePath } from "next/cache";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";

async function saveGoal(form: FormData) {
  "use server";
  const u = String(form.get("goal_units") ?? "").replace(/\D/g, "");
  setSetting("goal_units", u || "0");
  const p = String(form.get("goal_profit") ?? "").replace(/\D/g, "");
  setSetting("goal_profit", p || "0");
  revalidatePath("/"); revalidatePath("/config");
}

export default async function Config() {
  const goal = getSetting("goal_units", "12000");
  const goalProfit = getSetting("goal_profit", "6000");
  return (
    <main>
      <header className="mb-4 flex items-center gap-3">
        <Link href="/" className="btn-ghost px-3 py-2 text-sm">←</Link>
        <h1 className="h1">Ajustes</h1>
      </header>

      <form action={saveGoal} className="card space-y-3 p-4">
        <div>
          <label className="lbl">Meta mensal de unidades no atacado</label>
          <input name="goal_units" inputMode="numeric" defaultValue={goal} className="inp" />
        </div>
        <div>
          <label className="lbl">Meta mensal de lucro bruto (R$, os dois canais somados)</label>
          <input name="goal_profit" inputMode="numeric" defaultValue={goalProfit} className="inp" />
          <p className="mt-1 text-[11px] muted">
            Meta de unidade sozinha engana: 12.000 un no atacado e 4.000 un no varejo dão o mesmo lucro.
            O que paga a conta é o lucro.
          </p>
        </div>
        <button className="btn-primary w-full">Salvar metas</button>
      </form>

      <Section title="Cadastros">
        <div className="grid grid-cols-2 gap-2">
          <Link href="/produtos" className="btn-ghost py-3 text-sm">Produtos e sabores</Link>
          <Link href="/clientes" className="btn-ghost py-3 text-sm">Clientes</Link>
          <Link href="/despesas" className="btn-ghost py-3 text-sm">Despesas</Link>
          <Link href="/compras" className="btn-ghost py-3 text-sm">Compras</Link>
        </div>
      </Section>

      <Section title="Custo médio">
        <form action={recalcAllCosts}>
          <button className="btn-ghost w-full">Recalcular custo médio de tudo</button>
        </form>
        <p className="mt-2 text-xs muted">
          O custo médio é recalculado sozinho a cada compra, venda ou ajuste. Use este botão
          quando lançar uma compra com <b>data retroativa</b> — aí a ordem cronológica muda e
          as vendas posteriores precisam ser reprocessadas.
        </p>
      </Section>

      <Section title="Sessão">
        <form action={logoutAction}><button className="btn-danger w-full">Sair</button></form>
      </Section>

      <p className="mt-6 text-xs muted">
        A senha de acesso fica na variável <code>APP_PASSWORD</code> do servidor. O banco é um arquivo SQLite
        em <code>DATABASE_PATH</code> — copie esse arquivo para fazer backup.
      </p>
    </main>
  );
}
