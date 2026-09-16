import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { Section, Empty, Stat } from "@/components/ui";
import { MODULES, type ModuleGroup } from "@/lib/modules";

export const dynamic = "force-dynamic";

const GROUP_ORDER: ModuleGroup[] = ["Rede", "Produção", "Comercial"];

export default async function PainelPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const { capabilities } = profile;

  return (
    <main>
      <h1 className="h1">{profile.org.name}</h1>
      <p className="text-sm muted">Olá, {profile.fullName || profile.email}</p>

      <Section title="Situação">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <Stat label="Produção" value={capabilities.hasOwnProducts ? "Ativa" : "Inativa"} />
          <Stat label="Clientes ativos" value={String(capabilities.supplierPartnerCount)} />
          <Stat label="Fornecedores ativos" value={String(capabilities.buyerPartnerCount)} />
        </div>
      </Section>

      {GROUP_ORDER.map((group) => (
        <Section key={group} title={group}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {MODULES.filter((m) => m.group === group).map((m) => (
              <Link key={m.href} href={m.href} className="card p-4">
                <m.icon className="h-6 w-6 text-brand-600" strokeWidth={2} />
                <div className="mt-1 font-semibold">{m.label}</div>
                <div className="text-xs muted">{m.description}</div>
              </Link>
            ))}
          </div>
        </Section>
      ))}

      {!capabilities.hasOwnProducts &&
        capabilities.supplierPartnerCount === 0 &&
        capabilities.buyerPartnerCount === 0 && (
          <Section title="Próximos passos">
            <Empty>
              Ainda não tem produto nem parceria cadastrados. Veja o checklist em{" "}
              <Link href="/ajuda" className="font-semibold text-brand-600">
                Ajuda
              </Link>{" "}
              pra saber por onde começar.
            </Empty>
          </Section>
        )}
    </main>
  );
}
