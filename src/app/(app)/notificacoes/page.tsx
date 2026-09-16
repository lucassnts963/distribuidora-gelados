import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { listSignals } from "@/lib/signals";
import { Section, Empty } from "@/components/ui";
import { markNotificationsSeenAction } from "./actions";

export const dynamic = "force-dynamic";

const severityChip: Record<string, string> = {
  info: "bg-stone-100 text-stone-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
};

const kindLabel: Record<string, string> = {
  pedido: "Pedido",
  validade: "Validade",
  estoque_baixo: "Estoque",
};

export default async function NotificacoesPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const signals = await listSignals(profile.org.id);
  await markNotificationsSeenAction();

  return (
    <main>
      <h1 className="h1">Avisos</h1>
      <p className="text-sm muted">
        Pedido pendente, validade chegando e estoque abaixo do mínimo — calculado na hora, não é
        histórico.
      </p>

      <Section title={`${signals.length} no momento`}>
        {!signals.length ? (
          <Empty>Nada pendente agora.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {signals.map((s, i) => (
              <li key={i}>
                <Link href={s.href} className="card flex items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <div className="font-semibold">{s.title}</div>
                    <div className="text-xs muted">{s.detail}</div>
                  </div>
                  <span className={`chip shrink-0 ${severityChip[s.severity]}`}>{kindLabel[s.kind]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
  );
}
