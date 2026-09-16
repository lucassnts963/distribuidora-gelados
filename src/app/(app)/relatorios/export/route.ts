import { getSessionProfile } from "@/lib/auth";
import { periodSummary, listSalesDetailed } from "@/lib/queries";
import { monthOf, monthStart, monthEnd, fmtDate } from "@/lib/format";

/** Ponto-e-vírgula é o separador que o Excel em pt-BR espera por padrão. */
function csvCell(v: string | number) {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: (string | number)[]) {
  return cells.map(csvCell).join(";") + "\r\n";
}

function money(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) return new Response("Não autorizado", { status: 401 });

  const url = new URL(request.url);
  const month = url.searchParams.get("month") || monthOf();
  const from = monthStart(month);
  const to = monthEnd(month);

  const [summary, sales] = await Promise.all([
    periodSummary(profile.org.id, from, to),
    listSalesDetailed(profile.org.id, from, to),
  ]);

  let csv = "﻿"; // BOM: Excel reconhece UTF-8 sem confundir acento
  csv += `Resumo do mês;${month}\r\n`;
  csv += csvRow(["Receita", money(summary.revenue)]);
  csv += csvRow(["CMV", money(summary.cmv)]);
  csv += csvRow(["Lucro bruto", money(summary.grossProfit)]);
  csv += csvRow(["Lucro líquido", money(summary.netProfit)]);
  csv += csvRow(["Despesas", money(summary.expensesTotal)]);
  csv += csvRow(["Taxas de pagamento", money(summary.feesTotal)]);
  csv += "\r\n";

  csv += csvRow(["Data", "Contato", "Canal", "Forma de pagamento", "Total", "Comissão", "Taxa"]);
  for (const sale of sales) {
    const contact = sale.contact as unknown as { name: string } | null;
    const paymentMethod = sale.payment_method as unknown as { name: string } | null;
    csv += csvRow([
      fmtDate(sale.created_at),
      contact?.name ?? "Venda avulsa",
      sale.channel === "wholesale" ? "Atacado" : "Varejo",
      paymentMethod?.name ?? "—",
      money(sale.total_cents),
      sale.commission_cents ? money(sale.commission_cents) : "",
      sale.fee_cents ? money(sale.fee_cents) : "",
    ]);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${month}.csv"`,
    },
  });
}
