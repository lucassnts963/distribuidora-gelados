"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/app/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signInAction, null);
  return (
    <main className="flex min-h-[80vh] flex-col justify-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-3xl">
          🍊
        </div>
        <h1 className="h1">Distribuidora</h1>
        <p className="text-sm muted">Fabricante, distribuidores e clientes num só lugar</p>
      </div>
      <form action={action} className="card space-y-4 p-5">
        <div>
          <label className="lbl">Email</label>
          <input name="email" type="email" className="inp" autoFocus required autoComplete="email" />
        </div>
        <div>
          <label className="lbl">Senha</label>
          <input name="password" type="password" className="inp" required autoComplete="current-password" />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-brand-600">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
