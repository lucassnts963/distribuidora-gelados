import { db } from "./db";

/**
 * Custo medio ponderado MOVEL (o metodo usado no Brasil).
 *
 * Nao e' a media simples das compras. A cada compra o custo medio novo e':
 *
 *     (saldo_qty * custo_medio_atual + compra_qty * custo_da_compra)
 *     -------------------------------------------------------------
 *                     saldo_qty + compra_qty
 *
 * A diferenca importa. Comprei 100 a R$1,00, vendi 90, comprei 100 a R$2,00:
 *   - media simples das compras = R$1,50  (errado, subestima)
 *   - custo medio movel          = R$1,91  (certo: sobrou pouco do lote barato)
 *
 * Toda saida (venda, perda, brinde) sai pelo custo medio vigente NAQUELE momento,
 * e esse valor fica congelado na venda. Lucro de venda ja registrada nunca muda
 * sozinho — so' quando voce manda recalcular de proposito.
 */

type Event =
  | { kind: "buy"; date: string; at: string; id: number; qty: number; unit: number }
  | { kind: "sell"; date: string; at: string; id: number; saleId: number; qty: number }
  | { kind: "adj"; date: string; at: string; id: number; qty: number };

export function recalcCosts(flavorId?: number) {
  const d = db();

  const flavors = flavorId
    ? [{ id: flavorId }]
    : (d.prepare(`SELECT id FROM flavors`).all() as { id: number }[]);

  const buys = d.prepare(
    `SELECT pi.id, pi.qty, pi.unit_cents AS unit, p.occurred_on AS date, p.created_at AS at
     FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id
     WHERE pi.flavor_id = ?`
  );
  const sells = d.prepare(
    `SELECT si.id, si.sale_id AS saleId, si.qty, s.occurred_on AS date, s.created_at AS at
     FROM sale_items si JOIN sales s ON s.id = si.sale_id
     WHERE si.flavor_id = ?`
  );
  const adjs = d.prepare(
    `SELECT id, qty, occurred_on AS date, created_at AS at FROM adjustments WHERE flavor_id = ?`
  );

  const setItemCost = d.prepare(`UPDATE sale_items SET unit_cost_cents = ? WHERE id = ?`);
  const setAdjCost = d.prepare(`UPDATE adjustments SET unit_cost_cents = ? WHERE id = ?`);
  const upsertState = d.prepare(
    `INSERT INTO flavor_cost (flavor_id, avg_cost_cents, qty, value_cents, last_cost_cents, updated_at)
     VALUES (?,?,?,?,?, strftime('%Y-%m-%d %H:%M:%f','now','localtime'))
     ON CONFLICT(flavor_id) DO UPDATE SET
       avg_cost_cents = excluded.avg_cost_cents, qty = excluded.qty,
       value_cents = excluded.value_cents, last_cost_cents = excluded.last_cost_cents,
       updated_at = excluded.updated_at`
  );
  const fallbackCost = d.prepare(`SELECT cost_cents FROM flavor_pricing WHERE flavor_id = ?`);

  const run = d.transaction(() => {
    const touchedSales = new Set<number>();

    for (const f of flavors) {
      const events: Event[] = [
        ...(buys.all(f.id) as any[]).map((r) => ({ kind: "buy" as const, ...r })),
        ...(sells.all(f.id) as any[]).map((r) => ({ kind: "sell" as const, ...r })),
        ...(adjs.all(f.id) as any[]).map((r) => ({ kind: "adj" as const, ...r })),
      ];
      /*
       * Ordem cronologica. A data (occurred_on) manda — e' ela que voce informa e que
       * permite lancar movimento retroativo. Dentro do mesmo dia vale a ordem REAL de
       * lancamento (created_at): se voce vendeu de manha e comprou a tarde, a venda da
       * manha nao pode sair pelo custo do lote que so' chegou depois. So' quando nem isso
       * desempata e' que a convencao entra: entrada antes de saida.
       */
      const rank = { buy: 0, adj: 1, sell: 2 } as const;
      events.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (a.at !== b.at) return a.at < b.at ? -1 : 1;
        return rank[a.kind] - rank[b.kind] || a.id - b.id;
      });

      let qty = 0;
      let value = 0; // valor total do estoque em centavos
      let last = 0;
      const avg = () => (qty > 0 ? Math.round(value / qty) : last || (fallbackCost.get(f.id) as any)?.cost_cents || 0);

      for (const e of events) {
        if (e.kind === "buy") {
          qty += e.qty;
          value += e.qty * e.unit;
          last = e.unit;
        } else if (e.kind === "sell") {
          const unitCost = avg();
          setItemCost.run(unitCost, e.id);
          touchedSales.add(e.saleId);
          qty -= e.qty;
          value -= e.qty * unitCost;
          if (qty <= 0) { qty = Math.max(0, qty); value = qty === 0 ? 0 : value; }
        } else {
          const unitCost = avg();
          setAdjCost.run(unitCost, e.id);
          qty += e.qty;                      // e.qty ja vem com sinal
          value += e.qty * unitCost;
          if (qty <= 0) { qty = Math.max(0, qty); value = qty === 0 ? 0 : value; }
        }
        if (value < 0) value = 0;
      }

      upsertState.run(f.id, avg(), qty, Math.round(value), last);
    }

    // Recompoe o custo total de cada venda tocada
    const recompute = d.prepare(
      `UPDATE sales SET cost_cents =
         (SELECT COALESCE(SUM(si.qty * si.unit_cost_cents),0) FROM sale_items si WHERE si.sale_id = sales.id)
       WHERE id = ?`
    );
    for (const id of touchedSales) recompute.run(id);
  });

  run();
}

/** Custo medio vigente de um sabor (para prever lucro antes de registrar a venda). */
export function currentAvgCost(flavorId: number): number {
  const r = db().prepare(`SELECT avg_cost_cents FROM flavor_cost WHERE flavor_id = ?`).get(flavorId) as
    | { avg_cost_cents: number } | undefined;
  if (r?.avg_cost_cents) return r.avg_cost_cents;
  const f = db().prepare(`SELECT cost_cents FROM flavor_pricing WHERE flavor_id = ?`).get(flavorId) as any;
  return f?.cost_cents ?? 0;
}
