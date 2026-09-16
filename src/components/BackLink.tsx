import Link from "next/link";

/**
 * Sub-páginas precisam de volta explícita: instalado como PWA o app roda em
 * standalone, sem barra do navegador — sem isso não existe caminho de volta.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-brand-600"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
