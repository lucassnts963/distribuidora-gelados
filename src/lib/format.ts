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

/**
 * Datas "YYYY-MM-DD" do banco (occurred_on, expires_on, period_*) NAO podem
 * passar por new Date(str): o parse e' UTC e o render e' local, entao em
 * qualquer fuso negativo (o Brasil inteiro) o dia volta um. Aqui a data pura
 * e' lida campo a campo; so' o timestamptz (tem "T") vira Date de verdade,
 * porque ai' o instante e' real e a conversao pro fuso local esta' certa.
 */
const dateParts = (iso: string) => {
  if (iso.includes("T")) {
    const d = new Date(iso);
    return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
  }
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return { day, month, year };
};
const pad = (n: number) => String(n).padStart(2, "0");

/** dd/mm/aaaa */
export const fmtDate = (iso: string) => {
  const { day, month, year } = dateParts(iso);
  return `${pad(day)}/${pad(month)}/${year}`;
};

/** dd/mm — para listas densas, quando o ano esta' implicito no contexto. */
export const fmtDayMonth = (iso: string) => {
  const { day, month } = dateParts(iso);
  return `${pad(day)}/${pad(month)}`;
};

/** mm/aaaa — para rotulos de periodo/competencia. Aceita "YYYY-MM". */
export const fmtMonth = (iso: string) => {
  const { month, year } = dateParts(iso.length === 7 ? iso + "-01" : iso);
  return `${pad(month)}/${year}`;
};

/** Dias entre hoje e a data, comparando meia-noite local dos dois lados. */
export const daysUntil = (iso: string) => {
  const { day, month, year } = dateParts(iso);
  const target = new Date(year, month - 1, day).getTime();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - todayMidnight) / 86400000);
};

export const monthStart = (ref = today()) => ref.slice(0, 7) + "-01";
export const monthOf = (ref = today()) => ref.slice(0, 7);
/** Ultimo dia real do mes "YYYY-MM" (evita datas invalidas como 2026-09-31 nos rotulos). */
export const monthEnd = (month = monthOf()) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
