"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { GiroMark } from "@/components/GiroMark";
import { MODULES, moduleByHref, type ModuleGroup } from "@/lib/modules";

type Capabilities = {
  hasOwnProducts: boolean;
  supplierPartnerCount: number;
  buyerPartnerCount: number;
};

function PendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="h-2 w-2 shrink-0 animate-ping rounded-full bg-brand-500" />;
}

function BottomIcon({ Icon, badge }: { Icon: LucideIcon; badge?: number }) {
  const { pending } = useLinkStatus();
  return (
    <span className="relative flex">
      <Icon className="h-5 w-5" strokeWidth={2} />
      {pending && (
        <span className="absolute -right-1 -top-1 h-2 w-2 animate-ping rounded-full bg-brand-500" />
      )}
      {!pending && !!badge && <NotificationBadge count={badge} className="absolute -right-2 -top-1.5" />}
    </span>
  );
}

function NotificationBadge({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span
      className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ${className}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const painel = moduleByHref("/");
const avisos = moduleByHref("/notificacoes");
const config = moduleByHref("/config");
const GROUP_ORDER: ModuleGroup[] = ["Rede", "Produção", "Comercial"];

export default function Nav({
  capabilities,
  unseenCount = 0,
}: {
  capabilities: Capabilities;
  unseenCount?: number;
}) {
  const pathname = usePathname();
  const canSell = capabilities.hasOwnProducts || capabilities.buyerPartnerCount > 0;

  // A barra do celular filtra por capacidade porque só cabem as abas de uso
  // mais frequente — é triagem de espaço. A sidebar não filtra: esconder
  // Produção e Insumos de quem ainda não tem produto esconderia justamente
  // o caminho de virar fabricante, e o Painel já lista todos os módulos sem
  // filtro nenhum. Avisos não depende de capacidade — vale pra qualquer um.
  const bottomShow: Record<string, boolean> = {
    "/": true,
    "/producao": capabilities.hasOwnProducts,
    "/estoque": canSell,
    "/vendas": canSell,
    "/notificacoes": true,
    "/config": true,
  };
  const bottomItems = Object.keys(bottomShow)
    .filter((href) => bottomShow[href])
    .map((href) => moduleByHref(href));

  const groups = [
    { title: null, items: [painel, avisos] },
    ...GROUP_ORDER.map((title) => ({ title, items: MODULES.filter((m) => m.group === title) })),
    { title: null, items: [config] },
  ];

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
                        <it.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.href === "/notificacoes" && unseenCount > 0 && (
                          <NotificationBadge count={unseenCount} />
                        )}
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
                  <BottomIcon Icon={it.icon} badge={it.href === "/notificacoes" ? unseenCount : undefined} />
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
