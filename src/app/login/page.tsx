import { loginAction } from "../actions";

export default function LoginPage() {
  async function action(form: FormData) {
    "use server";
    await loginAction(null, form);
  }
  return (
    <main className="flex min-h-[80vh] flex-col justify-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-3xl">🍊</div>
        <h1 className="h1">Distribuidora</h1>
        <p className="text-sm muted">Controle de estoque, vendas e caixa</p>
      </div>
      <form action={action} className="card space-y-4 p-5">
        <div>
          <label className="lbl">Senha de acesso</label>
          <input name="password" type="password" className="inp" autoFocus required autoComplete="current-password" />
        </div>
        <button className="btn-primary w-full">Entrar</button>
      </form>
    </main>
  );
}
