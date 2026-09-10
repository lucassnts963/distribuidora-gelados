import { db, monthEnd, monthOf, today } from "./db";
import type { Customer, Product, StockRow } from "./types";

export function listProducts(): Product[] {
  return db().prepare(`SELECT * FROM products ORDER BY active DESC, name`).all() as Product[];
}

export function listFlavorsByProduct(productId: number) {
  return db()
    .prepare(`SELECT * FROM flavor_pricing WHERE product_id = ? ORDER BY flavor_name`)
    .all(productId) as any[];
}

export function listStock(opts: { onlyActive?: boolean } = {}): StockRow[] {
  const where = opts.onlyActive ? `WHERE flavor_active = 1` : ``;
  return db()
    .prepare(`SELECT * FROM stock ${where} ORDER BY product_name, flavor_name`)
    .all() as StockRow[];
}

export function listCustomers(): Customer[] {
  return db().prepare(`SELECT * FROM customers ORDER BY name`).all() as Customer[];
}

/* ---------- Caixa x Lucro (propositalmente separados) ---------- */

export function periodSummary(from: string, to: string) {
  const d = db();
  const sales = d
    .prepare(
      `SELECT COALESCE(SUM(total_cents),0) AS revenue,
              COALESCE(SUM(cost_cents),0)  AS cmv,
              COUNT(*)                     AS orders
       FROM sales WHERE occurred_on BETWEEN ? AND ?`
    )
    .get(from, to) as { revenue: number; cmv: number; orders: number };

  const units = d
    .prepare(
      `SELECT COALESCE(SUM(si.qty),0) AS units
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
       WHERE s.occurred_on BETWEEN ? AND ?`
    )
    .get(from, to) as { units: number };

  const purchases = d
    .prepare(`SELECT COALESCE(SUM(total_cents),0) AS v FROM purchases WHERE occurred_on BETWEEN ? AND ?`)
    .get(from, to) as { v: number };

  const expenses = d
    .prepare(`SELECT COALESCE(SUM(amount_cents),0) AS v FROM expenses WHERE occurred_on BETWEEN ? AND ?`)
    .get(from, to) as { v: number };

  const grossProfit = sales.revenue - sales.cmv;          // lucro sobre o que saiu
  const netProfit = grossProfit - expenses.v;             // depois das despesas do periodo
  const cashIn = sales.revenue;
  const cashOut = purchases.v + expenses.v;               // compras sao caixa, nao lucro

  return {
    revenue: sales.revenue,
    cmv: sales.cmv,
    orders: sales.orders,
    units: units.units,
    purchases: purchases.v,
    expenses: expenses.v,
    grossProfit,
    netProfit,
    cashIn,
    cashOut,
    cashFlow: cashIn - cashOut,
    marginPct: sales.revenue ? (grossProfit / sales.revenue) * 100 : 0,
    avgUnitProfit: units.units ? grossProfit / units.units : 0,
  };
}

/** Compara atacado x varejo: onde o lucro realmente vem e quanto capital cada canal consome. */
export function channelBreakdown(from: string, to: string) {
  const rows = db()
    .prepare(
      `SELECT s.channel,
              COUNT(DISTINCT s.id)                                  AS orders,
              COALESCE(SUM(si.qty),0)                               AS units,
              COALESCE(SUM(si.qty * si.unit_cents),0)               AS revenue,
              COALESCE(SUM(si.qty * si.unit_cost_cents),0)          AS cost
       FROM sales s JOIN sale_items si ON si.sale_id = s.id
       WHERE s.occurred_on BETWEEN ? AND ?
       GROUP BY s.channel`
    )
    .all(from, to) as any[];

  const base = ["atacado", "varejo"].map((ch) => {
    const r = rows.find((x) => x.channel === ch);
    const units = r?.units ?? 0;
    const revenue = r?.revenue ?? 0;
    const cost = r?.cost ?? 0;
    const profit = revenue - cost;
    return {
      channel: ch,
      orders: r?.orders ?? 0,
      units, revenue, cost, profit,
      perUnit: units ? profit / units : 0,
      marginPct: revenue ? (profit / revenue) * 100 : 0,
    };
  });

  const totalUnits = base.reduce((a, b) => a + b.units, 0);
  const totalProfit = base.reduce((a, b) => a + b.profit, 0);
  return base.map((b) => ({
    ...b,
    unitsShare: totalUnits ? (b.units / totalUnits) * 100 : 0,
    profitShare: totalProfit ? (b.profit / totalProfit) * 100 : 0,
  }));
}

/**
 * Quanto de lucro voce deixa na mesa por vender no atacado em vez do varejo.
 * Usa o preco de varejo cadastrado como referencia — nao e' um numero real,
 * e' o custo de oportunidade de cada unidade despachada no atacado.
 */
export function wholesaleOpportunityCost(from: string, to: string) {
  const r = db()
    .prepare(
      `SELECT COALESCE(SUM(si.qty * (fp.retail_cents - si.unit_cents)),0) AS gap,
              COALESCE(SUM(si.qty),0) AS units
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN flavor_pricing fp ON fp.flavor_id = si.flavor_id
       WHERE s.occurred_on BETWEEN ? AND ? AND s.channel = 'atacado'`
    )
    .get(from, to) as { gap: number; units: number };
  return r;
}

/** Perdas, brindes e consumo proprio valorizados ao custo medio do momento. */
export function lossesValue(from: string, to: string) {
  const r = db()
    .prepare(
      `SELECT COALESCE(SUM(-qty * unit_cost_cents),0) AS v, COALESCE(SUM(-qty),0) AS units
       FROM adjustments
       WHERE qty < 0 AND occurred_on BETWEEN ? AND ?`
    )
    .get(from, to) as { v: number; units: number };
  return r;
}

/** Onde o custo cadastrado ja nao bate com o que voce esta pagando de verdade. */
export function costDrift() {
  return db()
    .prepare(
      `SELECT product_name, flavor_name, flavor_id, listed_cost_cents, avg_cost_cents, last_cost_cents,
              wholesale_cents, retail_cents
       FROM stock
       WHERE flavor_active = 1 AND avg_cost_cents > 0
         AND ABS(avg_cost_cents - listed_cost_cents) * 100 / MAX(listed_cost_cents,1) >= 5
       ORDER BY ABS(avg_cost_cents - listed_cost_cents) DESC`
    )
    .all() as any[];
}

export function stockValue() {
  return db()
    .prepare(`SELECT COALESCE(SUM(qty * cost_cents),0) AS v, COALESCE(SUM(qty),0) AS units FROM stock WHERE qty > 0`)
    .get() as { v: number; units: number };
}

/* ---------- Giro ---------- */

export function topFlavors(from: string, to: string, limit = 10) {
  return db()
    .prepare(
      `SELECT st.product_name, st.flavor_name, st.flavor_id,
              SUM(si.qty) AS units,
              SUM(si.qty * si.unit_cents) AS revenue,
              SUM(si.qty * (si.unit_cents - si.unit_cost_cents)) AS profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN stock st ON st.flavor_id = si.flavor_id
       WHERE s.occurred_on BETWEEN ? AND ?
       GROUP BY si.flavor_id
       ORDER BY units DESC
       LIMIT ?`
    )
    .all(from, to, limit) as any[];
}

/** Cobertura: quantos dias o estoque atual aguenta no ritmo dos ultimos N dias. */
export function coverage(days = 30) {
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const rows = db()
    .prepare(
      `SELECT st.flavor_id, st.product_name, st.flavor_name, st.qty, st.last_sale_on,
              COALESCE((SELECT SUM(si.qty) FROM sale_items si JOIN sales s ON s.id = si.sale_id
                        WHERE si.flavor_id = st.flavor_id AND s.occurred_on >= ?), 0) AS sold
       FROM stock st
       WHERE st.flavor_active = 1
       ORDER BY st.product_name, st.flavor_name`
    )
    .all(from) as any[];

  const t = today();
  return rows.map((r) => {
    const perDay = r.sold / days;
    const daysLeft = perDay > 0 ? r.qty / perDay : null;
    const idleDays = r.last_sale_on
      ? Math.round((Date.parse(t) - Date.parse(r.last_sale_on)) / 86400000)
      : null;
    return { ...r, perDay, daysLeft, idleDays };
  });
}

export function dailySeries(from: string, to: string) {
  const d = db();
  const rows = d
    .prepare(
      `SELECT occurred_on AS day, SUM(total_cents) AS revenue, SUM(total_cents - cost_cents) AS profit
       FROM sales WHERE occurred_on BETWEEN ? AND ? GROUP BY occurred_on ORDER BY occurred_on`
    )
    .all(from, to) as any[];
  return rows;
}

export function recentSales(limit = 30) {
  return db()
    .prepare(
      `SELECT s.*, c.name AS customer_name,
              (SELECT SUM(qty) FROM sale_items si WHERE si.sale_id = s.id) AS units
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.occurred_on DESC, s.id DESC LIMIT ?`
    )
    .all(limit) as any[];
}

export function saleItems(saleId: number) {
  return db()
    .prepare(
      `SELECT si.*, st.product_name, st.flavor_name
       FROM sale_items si JOIN stock st ON st.flavor_id = si.flavor_id
       WHERE si.sale_id = ?`
    )
    .all(saleId) as any[];
}

export function recentPurchases(limit = 30) {
  return db()
    .prepare(
      `SELECT p.*, (SELECT SUM(qty) FROM purchase_items pi WHERE pi.purchase_id = p.id) AS units
       FROM purchases p ORDER BY p.occurred_on DESC, p.id DESC LIMIT ?`
    )
    .all(limit) as any[];
}

export function recentExpenses(limit = 40) {
  return db().prepare(`SELECT * FROM expenses ORDER BY occurred_on DESC, id DESC LIMIT ?`).all(limit) as any[];
}

export function recentAdjustments(limit = 30) {
  return db()
    .prepare(
      `SELECT a.*, st.product_name, st.flavor_name FROM adjustments a
       JOIN stock st ON st.flavor_id = a.flavor_id
       ORDER BY a.occurred_on DESC, a.id DESC LIMIT ?`
    )
    .all(limit) as any[];
}

/* ---------- Meta ---------- */
export function goalProgress(targetUnits: number, month = monthOf()) {
  const from = month + "-01";
  const to = monthEnd(month);
  const r = db()
    .prepare(
      `SELECT COALESCE(SUM(si.qty),0) AS units
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
       WHERE s.occurred_on BETWEEN ? AND ? AND s.channel = 'atacado'`
    )
    .get(from, to) as { units: number };
  return { units: r.units, target: targetUnits, pct: targetUnits ? (r.units / targetUnits) * 100 : 0 };
}

export function customerRanking(from: string, to: string, limit = 10) {
  return db()
    .prepare(
      `SELECT COALESCE(c.name,'(sem cadastro)') AS name, COUNT(s.id) AS orders,
              SUM(s.total_cents) AS revenue,
              SUM(s.total_cents - s.cost_cents) AS profit,
              (SELECT SUM(si.qty) FROM sale_items si WHERE si.sale_id IN
                 (SELECT id FROM sales s2 WHERE s2.customer_id IS c.id AND s2.occurred_on BETWEEN ? AND ?)) AS units
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.occurred_on BETWEEN ? AND ?
       GROUP BY s.customer_id ORDER BY revenue DESC LIMIT ?`
    )
    .all(from, to, from, to, limit) as any[];
}
