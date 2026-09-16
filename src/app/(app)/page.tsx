import { getSessionProfile } from "@/lib/auth";
import { Section, Empty, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const { capabilities } = profile;

  return (
    <main>
      <h1 className="h1">{profile.org.name}</h1>
      <p className="text-sm muted">Olá, {profile.fullName || profile.email}</p>

      <Section title="Situação">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Produção" value={capabilities.hasOwnProducts ? "Ativa" : "Inativa"} />
          <Stat label="Clientes ativos" value={String(capabilities.supplierPartnerCount)} />
          <Stat label="Fornecedores ativos" value={String(capabilities.buyerPartnerCount)} />
        </div>
      </Section>

      <Section title="Próximos passos">
        <Empty>
          {!capabilities.hasOwnProducts &&
            capabilities.supplierPartnerCount === 0 &&
            capabilities.buyerPartnerCount === 0 ? (
            <>
              Comece propondo uma parceria (com um fornecedor ou cliente) em{" "}
              <span className="font-semibold text-brand-600">Parcerias</span>. Cadastro de
              produtos, estoque e pedidos chegam nas próximas etapas.
            </>
          ) : (
            "Mais módulos (produção, estoque, pedidos) chegam nas próximas etapas."
          )}
        </Empty>
      </Section>
    </main>
  );
}
