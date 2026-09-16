import { getSessionProfile } from "@/lib/auth";
import { listContacts, getLoyaltySettings, loyaltyBalances } from "@/lib/queries";
import { Section, Empty } from "@/components/ui";
import { NewContactForm } from "./NewContactForm";

export const dynamic = "force-dynamic";

export default async function ContatosPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const [contacts, loyaltySettings, balances] = await Promise.all([
    listContacts(profile.org.id),
    getLoyaltySettings(profile.org.id),
    loyaltyBalances(profile.org.id),
  ]);

  return (
    <main>
      <h1 className="h1">Contatos</h1>
      <p className="text-sm muted">
        Clientes que compram de você sem usar o sistema (pedido por WhatsApp, por exemplo) — lance
        aqui pra manter estoque e caixa corretos.
      </p>

      <Section title="Cadastrados">
        {!contacts.length ? (
          <Empty>Nenhum contato ainda.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {contacts.map((c) => (
              <li key={c.id} className="card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{c.name}</div>
                  {loyaltySettings.enabled && (
                    <span className="chip text-[10px]">{balances.get(c.id) ?? 0} pts</span>
                  )}
                </div>
                <div className="text-xs muted">
                  {c.kind}
                  {c.phone ? ` · ${c.phone}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Novo contato">
        <NewContactForm />
      </Section>
    </main>
  );
}
