import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { listCommissions, listCommissionPayouts } from "@/lib/queries";
import { monthOf, monthStart, monthEnd, fmtMonth } from "@/lib/format";
import { Section, Empty, Money } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { payCommissionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ComissoesPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  if (profile.role !== "admin") redirect("/config");

  const month = monthOf();
  const from = monthStart(month);
  const to = monthEnd(month);
  const [commissions, payouts] = await Promise.all([
    listCommissions(profile.org.id, from, to),
    listCommissionPayouts(profile.org.id, from, to),
  ]);
  const total = commissions.reduce((sum, c) => sum + c.commissionCents, 0);

  return (
    <main>
      <h1 className="h1">Comissões</h1>
      <p className="text-sm muted">
        Mês atual ({fmtMonth(month)}) · congelada na hora da venda, não muda se a taxa do vendedor
        mudar depois. Registrar pagamento cria uma despesa (saída de caixa de verdade).
      </p>

      <Section title={`Total: ${(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}>
        {!commissions.length ? (
          <Empty>Nenhuma venda com comissão neste mês.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {commissions.map((c) => {
              const paid = payouts.get(c.vendorId) ?? 0;
              const pending = c.commissionCents - paid;
              return (
                <li key={c.vendorId} className="card space-y-2 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{c.vendorName}</div>
                      <div className="text-xs muted">
                        {c.salesCount} {c.salesCount === 1 ? "venda" : "vendas"} ·{" "}
                        <Money cents={c.salesCents} />
                      </div>
                    </div>
                    <Money cents={c.commissionCents} className="font-bold text-brand-600" />
                  </div>
                  <div className="flex items-center justify-between text-xs muted">
                    <span>
                      Pago: <Money cents={paid} />
                    </span>
                    <span>
                      A pagar: <Money cents={Math.max(0, pending)} />
                    </span>
                  </div>
                  {pending > 0 && (
                    <form action={payCommissionAction}>
                      <input type="hidden" name="vendor_id" value={c.vendorId} />
                      <input type="hidden" name="from" value={from} />
                      <input type="hidden" name="to" value={to} />
                      <SubmitButton className="btn-primary w-full" pendingText="Registrando…">
                        Registrar pagamento
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </main>
  );
}
