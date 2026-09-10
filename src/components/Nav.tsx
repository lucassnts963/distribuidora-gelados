"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Painel", icon: "◎" },
  { href: "/vendas", label: "Vendas", icon: "↗" },
  { href: "/compras", label: "Compras", icon: "↘" },
  { href: "/estoque", label: "Estoque", icon: "▦" },
  { href: "/relatorios", label: "Relatórios", icon: "∿" },
];

export default function Nav() {
  const p = usePathname();
  if (p.startsWith("/login")) return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur
                    pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {items.map((it) => {
          const active = it.href === "/" ? p === "/" : p.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link href={it.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold
                  ${active ? "text-brand-600" : "text-stone-400"}`}>
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
