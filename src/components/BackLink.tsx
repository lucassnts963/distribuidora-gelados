import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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
      <ChevronLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> {label}
    </Link>
  );
}
