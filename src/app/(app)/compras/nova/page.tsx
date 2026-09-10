import Link from "next/link";
import PurchaseForm from "@/components/PurchaseForm";
import { listStock } from "@/lib/queries";
import { today } from "@/lib/db";
import { createPurchase } from "@/app/actions";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NovaCompra() {
  const rows = listStock({ onlyActive: true });
  return (
    <main>
      <header className="mb-4 flex items-center gap-3">
        <Link href="/compras" className="btn-ghost px-3 py-2 text-sm">←</Link>
        <h1 className="h1">Nova compra</h1>
      </header>
      {rows.length === 0 ? (
        <Empty>Cadastre produtos e sabores primeiro. <Link href="/produtos" className="font-semibold text-brand-600">Ir para produtos</Link></Empty>
      ) : <PurchaseForm rows={rows} action={createPurchase} today={today()} />}
    </main>
  );
}
