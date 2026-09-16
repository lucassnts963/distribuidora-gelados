"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/app/actions";
import { GiroMark } from "@/components/GiroMark";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signInAction, null);
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-8 text-center">
        <GiroMark size={64} className="mx-auto mb-3" />
        <h1 className="h1">Giro</h1>
        <p className="text-sm muted">Fabricante, distribuidores e clientes — girando juntos</p>
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
