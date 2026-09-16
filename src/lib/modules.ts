import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ClipboardList,
  Package,
  FlaskConical,
  Factory,
  Boxes,
  ShoppingCart,
  Receipt,
  Users,
  Tag,
  TrendingDown,
  BarChart3,
  Settings,
  Bell,
  CircleHelp,
} from "lucide-react";

export type ModuleGroup = "Rede" | "Produção" | "Comercial";

/** Bate com o CHECK de org_modules.module — só os módulos que dá pra desligar. */
export type ModuleKey =
  | "produtos" | "insumos" | "producao" | "estoque" | "vendas" | "precos"
  | "compras" | "contatos" | "despesas" | "relatorios" | "parcerias" | "pedidos";

export type AppModule = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: ModuleGroup | null; // null = Painel/Avisos/Config/Ajuda, sempre disponível
  key: ModuleKey | null; // null = não desliga (Painel, Avisos, Config, Ajuda)
};

/**
 * Registro único dos módulos do app — Nav.tsx (sidebar + barra do celular)
 * e o Painel (src/app/(app)/page.tsx) consomem daqui em vez de manter cada
 * um sua própria lista, que já tinha divergido (ícone diferente pro mesmo
 * módulo em cada arquivo).
 */
export const MODULES: AppModule[] = [
  { href: "/", label: "Painel", description: "", icon: LayoutDashboard, group: null, key: null },
  { href: "/notificacoes", label: "Avisos", description: "Pedidos pendentes, validade e estoque baixo", icon: Bell, group: null, key: null },
  { href: "/parcerias", label: "Parcerias", description: "Propor, aceitar, código de convite", icon: ArrowLeftRight, group: "Rede", key: "parcerias" },
  { href: "/pedidos", label: "Pedidos", description: "Recebidos e feitos, entre organizações", icon: ClipboardList, group: "Rede", key: "pedidos" },
  { href: "/produtos", label: "Produtos", description: "Cadastro e campos personalizados", icon: Package, group: "Produção", key: "produtos" },
  { href: "/insumos", label: "Insumos", description: "Entrada e saída de matéria-prima", icon: FlaskConical, group: "Produção", key: "insumos" },
  { href: "/producao", label: "Produção", description: "Lotes e capacidade produtiva", icon: Factory, group: "Produção", key: "producao" },
  { href: "/estoque", label: "Estoque", description: "Saldo, validade e etapas", icon: Boxes, group: "Produção", key: "estoque" },
  { href: "/vendas", label: "Vendas", description: "Contato ou avulsa, atacado/varejo", icon: ShoppingCart, group: "Comercial", key: "vendas" },
  { href: "/compras", label: "Compras", description: "Entrada fora da cadeia", icon: Receipt, group: "Comercial", key: "compras" },
  { href: "/contatos", label: "Contatos", description: "Clientes sem login no sistema", icon: Users, group: "Comercial", key: "contatos" },
  { href: "/precos", label: "Preços", description: "Atacado e varejo por variação", icon: Tag, group: "Comercial", key: "precos" },
  { href: "/despesas", label: "Despesas", description: "Custos fora do estoque", icon: TrendingDown, group: "Comercial", key: "despesas" },
  { href: "/relatorios", label: "Relatórios", description: "Resumo do mês, caixa e canais", icon: BarChart3, group: "Comercial", key: "relatorios" },
  { href: "/config", label: "Config", description: "", icon: Settings, group: null, key: null },
  { href: "/ajuda", label: "Ajuda", description: "Passo a passo e como o sistema funciona", icon: CircleHelp, group: null, key: null },
];

export function moduleByHref(href: string): AppModule {
  const found = MODULES.find((m) => m.href === href);
  if (!found) throw new Error(`Módulo não registrado: ${href}`);
  return found;
}

/** Só os módulos que dá pra desligar por organização (key != null), pro toggle em /admin. */
export const TOGGLEABLE_MODULES = MODULES.filter(
  (m): m is AppModule & { key: ModuleKey } => m.key !== null
);

/**
 * Papel vendedor é sempre um subconjunto do que a organização liberou
 * (Parte M), nunca expande — vende, vê o próprio estoque, e o básico de
 * navegação. Sem Produção/Insumos/Compras/Despesas/Relatórios/Config de
 * campos personalizados etc.
 */
export const VENDEDOR_ALLOWED_HREFS = ["/", "/notificacoes", "/vendas", "/estoque", "/config", "/ajuda"];
