import Link from "next/link";
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <Stat label="Produção" value={capabilities.hasOwnProducts ? "Ativa" : "Inativa"} />
          <Stat label="Clientes ativos" value={String(capabilities.supplierPartnerCount)} />
          <Stat label="Fornecedores ativos" value={String(capabilities.buyerPartnerCount)} />
        </div>
      </Section>

      <Section title="Rede">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          <Link href="/parcerias" className="card p-4">
            <div className="text-2xl">⇄</div>
            <div className="mt-1 font-semibold">Parcerias</div>
            <div className="text-xs muted">Propor, aceitar, código de convite</div>
          </Link>
          <Link href="/pedidos" className="card p-4">
            <div className="text-2xl">↘</div>
            <div className="mt-1 font-semibold">Pedidos</div>
            <div className="text-xs muted">Recebidos e feitos, entre organizações</div>
          </Link>
        </div>
      </Section>

      <Section title="Produção">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          <Link href="/produtos" className="card p-4">
            <div className="text-2xl">📦</div>
            <div className="mt-1 font-semibold">Produtos</div>
            <div className="text-xs muted">Cadastro e campos personalizados</div>
          </Link>
          <Link href="/insumos" className="card p-4">
            <div className="text-2xl">🧪</div>
            <div className="mt-1 font-semibold">Insumos</div>
            <div className="text-xs muted">Entrada e saída de matéria-prima</div>
          </Link>
          <Link href="/producao" className="card p-4">
            <div className="text-2xl">⚙️</div>
            <div className="mt-1 font-semibold">Produção</div>
            <div className="text-xs muted">Lotes e capacidade produtiva</div>
          </Link>
          <Link href="/estoque" className="card p-4">
            <div className="text-2xl">▦</div>
            <div className="mt-1 font-semibold">Estoque</div>
            <div className="text-xs muted">Saldo, validade e etapas</div>
          </Link>
        </div>
      </Section>

      <Section title="Comercial">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          <Link href="/vendas" className="card p-4">
            <div className="text-2xl">💰</div>
            <div className="mt-1 font-semibold">Vendas</div>
            <div className="text-xs muted">Contato ou avulsa, atacado/varejo</div>
          </Link>
          <Link href="/compras" className="card p-4">
            <div className="text-2xl">🧾</div>
            <div className="mt-1 font-semibold">Compras</div>
            <div className="text-xs muted">Entrada fora da cadeia</div>
          </Link>
          <Link href="/contatos" className="card p-4">
            <div className="text-2xl">👥</div>
            <div className="mt-1 font-semibold">Contatos</div>
            <div className="text-xs muted">Clientes sem login no sistema</div>
          </Link>
          <Link href="/precos" className="card p-4">
            <div className="text-2xl">🏷️</div>
            <div className="mt-1 font-semibold">Preços</div>
            <div className="text-xs muted">Atacado e varejo por variação</div>
          </Link>
          <Link href="/despesas" className="card p-4">
            <div className="text-2xl">📉</div>
            <div className="mt-1 font-semibold">Despesas</div>
            <div className="text-xs muted">Custos fora do estoque</div>
          </Link>
          <Link href="/relatorios" className="card p-4">
            <div className="text-2xl">📊</div>
            <div className="mt-1 font-semibold">Relatórios</div>
            <div className="text-xs muted">Resumo do mês, caixa e canais</div>
          </Link>
        </div>
      </Section>

      {!capabilities.hasOwnProducts &&
        capabilities.supplierPartnerCount === 0 &&
        capabilities.buyerPartnerCount === 0 && (
          <Section title="Próximos passos">
            <Empty>
              Comece cadastrando um produto em <span className="font-semibold text-brand-600">Produtos</span>{" "}
              (se você fabrica algo), ou propondo uma parceria em{" "}
              <span className="font-semibold text-brand-600">Parcerias</span> (se você compra ou vende de
              alguém que já usa o sistema).
            </Empty>
          </Section>
        )}
    </main>
  );
}
