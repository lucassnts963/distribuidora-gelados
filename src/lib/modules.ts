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
} from "lucide-react";

export type ModuleGroup = "Rede" | "Produção" | "Comercial";

export type AppModule = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: ModuleGroup | null; // null = Painel/Config, fora de qualquer grupo
};

/**
 * Registro único dos módulos do app — Nav.tsx (sidebar + barra do celular)
 * e o Painel (src/app/(app)/page.tsx) consomem daqui em vez de manter cada
 * um sua própria lista, que já tinha divergido (ícone diferente pro mesmo
 * módulo em cada arquivo).
 */
export const MODULES: AppModule[] = [
  { href: "/", label: "Painel", description: "", icon: LayoutDashboard, group: null },
  { href: "/parcerias", label: "Parcerias", description: "Propor, aceitar, código de convite", icon: ArrowLeftRight, group: "Rede" },
  { href: "/pedidos", label: "Pedidos", description: "Recebidos e feitos, entre organizações", icon: ClipboardList, group: "Rede" },
  { href: "/produtos", label: "Produtos", description: "Cadastro e campos personalizados", icon: Package, group: "Produção" },
  { href: "/insumos", label: "Insumos", description: "Entrada e saída de matéria-prima", icon: FlaskConical, group: "Produção" },
  { href: "/producao", label: "Produção", description: "Lotes e capacidade produtiva", icon: Factory, group: "Produção" },
  { href: "/estoque", label: "Estoque", description: "Saldo, validade e etapas", icon: Boxes, group: "Produção" },
  { href: "/vendas", label: "Vendas", description: "Contato ou avulsa, atacado/varejo", icon: ShoppingCart, group: "Comercial" },
  { href: "/compras", label: "Compras", description: "Entrada fora da cadeia", icon: Receipt, group: "Comercial" },
  { href: "/contatos", label: "Contatos", description: "Clientes sem login no sistema", icon: Users, group: "Comercial" },
  { href: "/precos", label: "Preços", description: "Atacado e varejo por variação", icon: Tag, group: "Comercial" },
  { href: "/despesas", label: "Despesas", description: "Custos fora do estoque", icon: TrendingDown, group: "Comercial" },
  { href: "/relatorios", label: "Relatórios", description: "Resumo do mês, caixa e canais", icon: BarChart3, group: "Comercial" },
  { href: "/config", label: "Config", description: "", icon: Settings, group: null },
];

export function moduleByHref(href: string): AppModule {
  const found = MODULES.find((m) => m.href === href);
  if (!found) throw new Error(`Módulo não registrado: ${href}`);
  return found;
}
