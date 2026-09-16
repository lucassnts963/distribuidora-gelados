"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { GiroMark } from "@/components/GiroMark";

type Capabilities = {
  hasOwnProducts: boolean;
  supplierPartnerCount: number;
  buyerPartnerCount: number;
};

type Item = { href: string; label: string; icon: string; show: boolean };

function PendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="h-2 w-2 shrink-0 animate-ping rounded-full bg-brand-500" />;
}

function BottomIcon({ icon }: { icon: string }) {
  const { pending } = useLinkStatus();
  return (
    <span className="relative text-lg leading-none">
      {icon}
      {pending && (
        <span className="absolute -right-1.5 -top-1.5 h-2 w-2 animate-ping rounded-full bg-brand-500" />
      )}
    </span>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Nav({ capabilities }: { capabilities: Capabilities }) {
  const pathname = usePathname();
  const canSell = capabilities.hasOwnProducts || capabilities.buyerPartnerCount > 0;

  // No celular só cabem as abas de uso mais frequente; o resto chega pelo
  // Painel. No PC a sidebar tem espaço pra todos os módulos, agrupados igual
  // ao Painel — era isso que deixava a tela larga vazia.
  const bottomItems: Item[] = [
    { href: "/", label: "Painel", icon: "◎", show: true },
    { href: "/producao", label: "Produção", icon: "⚙", show: capabilities.hasOwnProducts },
    { href: "/estoque", label: "Estoque", icon: "▦", show: canSell },
    { href: "/vendas", label: "Vendas", icon: "↗", show: canSell },
    { href: "/config", label: "Config", icon: "☰", show: true },
  ].filter((it) => it.show);

  const groups: { title: string | null; items: Item[] }[] = [
    {
      title: null,
      items: [{ href: "/", label: "Painel", icon: "◎", show: true }],
    },
    {
      title: "Rede",
      items: [
        { href: "/parcerias", label: "Parcerias", icon: "⇄", show: true },
        { href: "/pedidos", label: "Pedidos", icon: "↘", show: true },
      ],
    },
    {
      title: "Produção",
      items: [
        { href: "/produtos", label: "Produtos", icon: "📦", show: true },
        { href: "/insumos", label: "Insumos", icon: "🧪", show: capabilities.hasOwnProducts },
        { href: "/producao", label: "Produção", icon: "⚙️", show: capabilities.hasOwnProducts },
        { href: "/estoque", label: "Estoque", icon: "▦", show: canSell },
      ],
    },
    {
      title: "Comercial",
      items: [
        { href: "/vendas", label: "Vendas", icon: "💰", show: canSell },
        { href: "/compras", label: "Compras", icon: "🧾", show: true },
        { href: "/contatos", label: "Contatos", icon: "👥", show: true },
        { href: "/precos", label: "Preços", icon: "🏷️", show: canSell },
        { href: "/despesas", label: "Despesas", icon: "📉", show: true },
        { href: "/relatorios", label: "Relatórios", icon: "📊", show: true },
      ],
    },
    {
      title: null,
      items: [{ href: "/config", label: "Config", icon: "☰", show: true }],
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter((it) => it.show) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-y-auto border-r border-stone-200 bg-white lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <GiroMark size={28} />
          <span className="text-lg font-bold tracking-tight">Giro</span>
        </div>
        <nav className="flex-1 px-3 pb-5">
          {groups.map((group, i) => (
            <div key={group.title ?? `g${i}`} className="mb-4">
              {group.title && (
                <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  {group.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((it) => {
                  const active = isActive(pathname, it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors
                          ${active ? "bg-brand-50 text-brand-700" : "text-stone-600 hover:bg-stone-100"}`}
                      >
                        <span className="w-5 shrink-0 text-center text-base leading-none">{it.icon}</span>
                        <span className="flex-1 truncate">{it.label}</span>
                        <PendingDot />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur
                   pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-2xl">
          {bottomItems.map((it) => {
            const active = isActive(pathname, it.href);
            return (
              <li key={it.href} className="flex-1">
                <Link
                  href={it.href}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold
                    active:opacity-60
                    ${active ? "text-brand-600" : "text-stone-400"}`}
                >
                  <BottomIcon icon={it.icon} />
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
