export const BRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const toCents = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).trim().replace(/\s/g, "").replace(/R\$/g, "");
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

export const today = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const monthStart = (ref = today()) => ref.slice(0, 7) + "-01";
export const monthOf = (ref = today()) => ref.slice(0, 7);
/** Ultimo dia real do mes "YYYY-MM" (evita datas invalidas como 2026-09-31 nos rotulos). */
export const monthEnd = (month = monthOf()) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
