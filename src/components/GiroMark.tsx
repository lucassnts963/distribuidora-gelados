/** Símbolo da marca: três arcos em rotação, um nó por elo da cadeia
 * (fabricante, distribuidor, cliente). Ver brand/giro-identity.html. */
export function GiroMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} aria-hidden="true">
      <path d="M180,100 A80,80 0 0 1 86.11,178.78" fill="none" stroke="#F05D06" strokeWidth="17" strokeLinecap="round" />
      <path d="M60,169.28 A80,80 0 0 1 38.72,48.58" fill="none" stroke="#0F6E66" strokeWidth="17" strokeLinecap="round" />
      <path d="M60,30.72 A80,80 0 0 1 175.18,72.64" fill="none" stroke="#2A1D14" strokeWidth="17" strokeLinecap="round" />
      <circle cx="180" cy="100" r="12" fill="#F05D06" />
      <circle cx="60" cy="169.28" r="12" fill="#0F6E66" />
      <circle cx="60" cy="30.72" r="12" fill="#2A1D14" />
    </svg>
  );
}
