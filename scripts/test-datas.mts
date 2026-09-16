/**
 * Datas do banco que são data-pura ("YYYY-MM-DD") não podem passar por
 * new Date(): o parse é UTC e o render é local, então em fuso negativo o dia
 * volta um — uma despesa lançada dia 16 aparecia como 15. Roda em UTC e em
 * America/Sao_Paulo pra travar essa regressão nos dois lados.
 *
 *   npm run test:datas
 */
import { fmtDate, fmtDayMonth, fmtMonth, daysUntil } from "../src/lib/format.js";

let failures = 0;

function eq(name: string, got: unknown, want: unknown) {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${got}${ok ? "" : ` (esperado ${want})`}`);
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

console.log(`TZ = ${process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone}\n`);

eq("fmtDate data-pura", fmtDate("2026-09-16"), "16/09/2026");
eq("fmtDate primeiro do mês", fmtDate("2026-01-01"), "01/01/2026");
eq("fmtDate virada de ano", fmtDate("2025-12-31"), "31/12/2025");
eq("fmtDate timestamptz", fmtDate("2026-09-16T13:00:00+00:00"), "16/09/2026");
eq("fmtDayMonth", fmtDayMonth("2026-09-16"), "16/09");
eq("fmtMonth YYYY-MM", fmtMonth("2026-09"), "09/2026");
eq("fmtMonth data-pura", fmtMonth("2026-09-16"), "09/2026");

const now = new Date();
eq("daysUntil hoje", daysUntil(iso(now)), 0);
eq("daysUntil +3d", daysUntil(iso(new Date(now.getTime() + 3 * 86400000))), 3);
eq("daysUntil -2d", daysUntil(iso(new Date(now.getTime() - 2 * 86400000))), -2);

if (failures) {
  console.log(`\n${failures} falha(s)`);
  process.exit(1);
}
console.log("\nTudo certo.");
