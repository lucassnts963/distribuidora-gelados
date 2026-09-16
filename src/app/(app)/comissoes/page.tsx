import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { listCommissions } from "@/lib/queries";
import { monthOf, monthStart, monthEnd, fmtMonth } from "@/lib/format";
import { Section, Empty, Money } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ComissoesPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  if (profile.role !== "admin") redirect("/config");

  const month = monthOf();
  const from = monthStart(month);
  const to = monthEnd(month);
  const commissions = await listCommissions(profile.org.id, from, to);
  const total = commissions.reduce((sum, c) => sum + c.commissionCents, 0);

  return (
    <main>
      <h1 className="h1">Comissões</h1>
      <p className="text-sm muted">
        Mês atual ({fmtMonth(month)}) · congelada na hora da venda, não muda se a taxa do vendedor
        mudar depois.
      </p>

      <Section title={`Total: ${(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}>
        {!commissions.length ? (
          <Empty>Nenhuma venda com comissão neste mês.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {commissions.map((c) => (
              <li key={c.vendorId} className="card flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="font-semibold">{c.vendorName}</div>
                  <div className="text-xs muted">
                    {c.salesCount} {c.salesCount === 1 ? "venda" : "vendas"} ·{" "}
                    <Money cents={c.salesCents} />
                  </div>
                </div>
                <Money cents={c.commissionCents} className="font-bold text-brand-600" />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
  );
}
