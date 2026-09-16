"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

type Capabilities = {
  hasOwnProducts: boolean;
  supplierPartnerCount: number;
  buyerPartnerCount: number;
};

function NavIcon({ icon }: { icon: string }) {
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

export default function Nav({ capabilities }: { capabilities: Capabilities }) {
  const p = usePathname();

  const canSell = capabilities.hasOwnProducts || capabilities.buyerPartnerCount > 0;

  // Só as abas de uso mais frequente ficam na nav fixa — o resto (Parcerias,
  // Pedidos, Produtos, Insumos, Contatos, Preços, Compras, Despesas,
  // Relatórios) sempre tem atalho no Painel, pra não lotar a barra.
  const items = [
    { href: "/", label: "Painel", icon: "◎", show: true },
    { href: "/producao", label: "Produção", icon: "⚙", show: capabilities.hasOwnProducts },
    { href: "/estoque", label: "Estoque", icon: "▦", show: canSell },
    { href: "/vendas", label: "Vendas", icon: "↗", show: canSell },
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
                  active:opacity-60
                  ${active ? "text-brand-600" : "text-stone-400"}`}
              >
                <NavIcon icon={it.icon} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
