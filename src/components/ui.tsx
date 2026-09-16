import { BRL } from "@/lib/format";

export function Stat({
  label, value, sub, tone = "neutral",
}: { label: string; value: string; sub?: string; tone?: "neutral" | "good" | "bad" | "brand" }) {
  const toneCls =
    tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700"
    : tone === "brand" ? "text-brand-700" : "text-stone-900";
  return (
    <div className="card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</div>
      <div className={`mt-1 break-words text-xl font-bold leading-tight tabular sm:text-2xl ${toneCls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs muted">{sub}</div>}
    </div>
  );
}

export function Money({ cents, className = "" }: { cents: number; className?: string }) {
  return <span className={`tabular ${className}`}>{BRL(cents)}</span>;
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-end justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card p-6 text-center text-sm muted">{children}</div>;
}

export function Bar({ pct, tone = "brand" }: { pct: number; tone?: "brand" | "red" | "emerald" }) {
  const bg = tone === "red" ? "bg-red-500" : tone === "emerald" ? "bg-emerald-500" : "bg-brand-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
      <div className={`h-full rounded-full ${bg}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}
