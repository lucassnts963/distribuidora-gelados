"use client";

import { useState } from "react";
import { Section, Empty } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { fmtDate } from "@/lib/format";
import { ArrowRight } from "lucide-react";
import { advanceLotStageAction } from "./actions";

type StockRow = { variantId: string; name: string; product: string; qty: number };
type LotRow = {
  id: string;
  productName: string;
  variantName: string;
  lotNumber: string | null;
  qtyRemaining: number;
  expiresOn: string | null;
  days: number | null;
  stageKey?: string;
  stageLabel: string | null;
  nextLabel: string | null;
  nextKey?: string;
};

export function EstoqueList({ stock, lots }: { stock: StockRow[]; lots: LotRow[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filteredStock = query
    ? stock.filter((s) => (s.name + s.product).toLowerCase().includes(query))
    : stock;
  const filteredLots = query
    ? lots.filter((l) => (l.productName + l.variantName).toLowerCase().includes(query))
    : lots;

  return (
    <>
      <div className="mt-4">
        <input
          className="inp"
          placeholder="Buscar por produto ou variação…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Section title="Saldo por variação">
        {!filteredStock.length ? (
          <Empty>{query ? "Nada encontrado." : "Nenhum movimento de estoque ainda."}</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredStock.map((s) => (
              <li key={s.variantId} className="card flex items-center justify-between p-3">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs muted">{s.product}</div>
                </div>
                <div className="tabular font-bold">{s.qty}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Lotes (validade e etapa)">
        {!filteredLots.length ? (
          <Empty>
            {query ? "Nada encontrado." : "Nenhum lote com controle de validade ainda — lote é opcional."}
          </Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredLots.map((l) => (
              <li key={l.id} className="card space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {l.productName} · {l.variantName}
                      {l.lotNumber ? ` · lote ${l.lotNumber}` : ""}
                    </div>
                    <div className="text-xs muted">
                      {l.qtyRemaining} un restantes
                      {l.expiresOn &&
                        ` · vence em ${fmtDate(l.expiresOn)}` +
                          (l.days !== null ? ` (${l.days >= 0 ? `${l.days}d` : "vencido"})` : "")}
                    </div>
                  </div>
                  {l.days !== null && l.days <= 7 && (
                    <span className={`chip ${l.days < 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {l.days < 0 ? "vencido" : "vence logo"}
                    </span>
                  )}
                </div>
                {l.stageLabel && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="muted">Etapa: {l.stageLabel}</span>
                    {l.nextKey && (
                      <form action={advanceLotStageAction}>
                        <input type="hidden" name="lot_id" value={l.id} />
                        <input type="hidden" name="current_stage" value={l.stageKey} />
                        <SubmitButton className="btn-ghost inline-flex items-center gap-1" pendingText="Avançando…">
                          Avançar para {l.nextLabel} <ArrowRight className="h-4 w-4" strokeWidth={2} />
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
