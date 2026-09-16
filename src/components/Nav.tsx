"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Capabilities = {
  hasOwnProducts: boolean;
  supplierPartnerCount: number;
  buyerPartnerCount: number;
};

export default function Nav({ capabilities }: { capabilities: Capabilities }) {
  const p = usePathname();

  const items = [
    { href: "/", label: "Painel", icon: "◎", show: true },
    { href: "/produtos", label: "Produção", icon: "⚙", show: capabilities.hasOwnProducts },
    { href: "/pedidos", label: "Pedidos", icon: "↘", show: capabilities.supplierPartnerCount > 0 },
    { href: "/fornecedores", label: "Fornecedores", icon: "↗", show: capabilities.buyerPartnerCount > 0 },
    { href: "/parcerias", label: "Parcerias", icon: "⇄", show: true },
    { href: "/config", label: "Config", icon: "☰", show: true },
  ].filter((it) => it.show);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur
                    pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-2xl">
        {items.map((it) => {
          const active = it.href === "/" ? p === "/" : p.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold
                  ${active ? "text-brand-600" : "text-stone-400"}`}
              >
                <span className="text-lg leading-none">{it.icon}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
