import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  listProducts,
  listRawMaterials,
  listVariantIdsWithRecipe,
  listOrgPrices,
  listContacts,
} from "@/lib/queries";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AjudaPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const orgId = profile.org.id;

  const supabase = await createClient();
  const [products, rawMaterials, recipeVariants, prices, contacts, { count: memberCount }] =
    await Promise.all([
      listProducts(orgId),
      listRawMaterials(orgId),
      listVariantIdsWithRecipe(orgId),
      listOrgPrices(orgId),
      listContacts(orgId),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    ]);

  const hasProductWithVariant = products.some((p) => (p.product_variants?.length ?? 0) > 0);
  const hasPriceDefined = [...prices.values()].some((p) => p.wholesale_cents || p.retail_cents);
  const hasPartnership =
    profile.capabilities.supplierPartnerCount > 0 || profile.capabilities.buyerPartnerCount > 0;
  const hasTeam = (memberCount ?? 0) > 1;

  const checklist = [
    {
      done: hasProductWithVariant,
      title: "Produto com variação",
      detail: "Cadastre ao menos um produto e uma variação.",
      href: "/produtos",
    },
    ...(profile.capabilities.hasOwnProducts
      ? [
          {
            done: rawMaterials.length > 0 && recipeVariants.size > 0,
            title: "Insumo e receita",
            detail:
              "Cadastre insumos e monte a receita de cada variação, pra produção baixar estoque e calcular custo sozinha.",
            href: "/insumos",
          },
        ]
      : []),
    {
      done: hasPriceDefined,
      title: "Preço definido",
      detail: "Defina atacado e/ou varejo pra cada variação que você vende.",
      href: "/precos",
    },
    {
      done: contacts.length > 0,
      title: "Contato cadastrado",
      detail: "Cadastre clientes que compram sem login no sistema.",
      href: "/contatos",
    },
    {
      done: hasPartnership,
      title: "Parceria ativa",
      detail: "Proponha ou aceite uma parceria com fornecedor/cliente que já usa o sistema.",
      href: "/parcerias",
    },
    {
      done: hasTeam,
      title: "Equipe convidada",
      detail: "Convide colegas pra acessar a mesma organização.",
      href: "/config",
    },
  ];

  return (
    <main>
      <h1 className="h1">Ajuda</h1>
      <p className="text-sm muted">
        O que falta configurar, calculado agora com o estado real da sua organização — não é um
        passo a passo fixo.
      </p>

      <Section title="Checklist">
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {checklist.map((item) => (
            <li key={item.href + item.title}>
              <Link href={item.href} className="card flex items-start gap-3 p-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    item.done ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {item.done ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <Circle className="h-2 w-2 fill-current" strokeWidth={0} />
                  )}
                </span>
                <div>
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-xs muted">{item.detail}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Como o sistema pensa">
        <div className="card space-y-3 p-4 text-sm">
          <p>
            <strong>Cadeia:</strong> fabricante produz, distribuidor revende, cliente compra — cada
            organização só enxerga o próprio custo e estoque; parceiros enxergam disponibilidade,
            nunca custo.
          </p>
          <p>
            <strong>Custo médio ponderado móvel:</strong> cada saída (venda, perda) sai pelo custo
            médio vigente naquele momento — não pelo custo da primeira compra, nem pela média
            simples.
          </p>
          <p>
            <strong>Lote e validade são opcionais</strong> — só preencha se precisar rastrear.
          </p>
          <p>
            <strong>Pedido × venda:</strong> pedido é entre organizações, e o preço vem sempre da
            tabela do fornecedor; venda é você vendendo direto pro seu contato, com preço editável.
          </p>
        </div>
      </Section>
    </main>
  );
}
