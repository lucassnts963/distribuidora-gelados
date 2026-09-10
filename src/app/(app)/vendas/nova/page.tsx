import Link from "next/link";
import SaleForm from "@/components/SaleForm";
import { listCustomers, listStock } from "@/lib/queries";
import { today } from "@/lib/db";
import { createSale } from "@/app/actions";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NovaVenda() {
  const rows = listStock({ onlyActive: true });
  const customers = listCustomers();

  return (
    <main>
      <header className="mb-4 flex items-center gap-3">
        <Link href="/vendas" className="btn-ghost px-3 py-2 text-sm">←</Link>
        <h1 className="h1">Nova venda</h1>
      </header>
      {rows.length === 0 ? (
        <Empty>
          Cadastre produtos e sabores primeiro.{" "}
          <Link href="/produtos" className="font-semibold text-brand-600">Ir para produtos</Link>
        </Empty>
      ) : (
        <SaleForm rows={rows} customers={customers} action={createSale} today={today()} />
      )}
    </main>
  );
}
