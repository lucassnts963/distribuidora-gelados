import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH || "./data/gelados.db";

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
  const d = new Database(DB_PATH);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  migrate(d);
  // coluna adicionada depois da v1 — bancos antigos precisam do ALTER
  try { d.exec(`ALTER TABLE adjustments ADD COLUMN unit_cost_cents INTEGER NOT NULL DEFAULT 0`); } catch {}
  _db = d;
  return d;
}

function migrate(d: Database.Database) {
  d.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    cost_cents INTEGER NOT NULL DEFAULT 0,
    wholesale_cents INTEGER NOT NULL DEFAULT 0,
    retail_cents INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS flavors (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cost_cents INTEGER,
    wholesale_cents INTEGER,
    retail_cents INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now','localtime')),
    UNIQUE(product_id, name)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    kind TEXT NOT NULL DEFAULT 'revenda',
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY,
    supplier TEXT,
    occurred_on TEXT NOT NULL,
    note TEXT,
    total_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    flavor_id INTEGER NOT NULL REFERENCES flavors(id),
    qty INTEGER NOT NULL,
    unit_cents INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    channel TEXT NOT NULL DEFAULT 'atacado',
    occurred_on TEXT NOT NULL,
    payment TEXT NOT NULL DEFAULT 'pix',
    note TEXT,
    total_cents INTEGER NOT NULL DEFAULT 0,
    cost_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    flavor_id INTEGER NOT NULL REFERENCES flavors(id),
    qty INTEGER NOT NULL,
    unit_cents INTEGER NOT NULL,
    unit_cost_cents INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,
    description TEXT,
    occurred_on TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS adjustments (
    id INTEGER PRIMARY KEY,
    flavor_id INTEGER NOT NULL REFERENCES flavors(id),
    qty INTEGER NOT NULL,
    unit_cost_cents INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    occurred_on TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now','localtime'))
  );

  -- Estado do custo medio movel por sabor, reconstruido a cada movimento.
  CREATE TABLE IF NOT EXISTS flavor_cost (
    flavor_id INTEGER PRIMARY KEY REFERENCES flavors(id) ON DELETE CASCADE,
    avg_cost_cents INTEGER NOT NULL DEFAULT 0,
    qty INTEGER NOT NULL DEFAULT 0,
    value_cents INTEGER NOT NULL DEFAULT 0,
    last_cost_cents INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sale_items_flavor ON sale_items(flavor_id);
  CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(occurred_on);
  CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(occurred_on);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(occurred_on);

  DROP VIEW IF EXISTS stock;
  DROP VIEW IF EXISTS flavor_pricing;

  CREATE VIEW flavor_pricing AS
  SELECT f.id AS flavor_id, f.product_id, p.name AS product_name, f.name AS flavor_name,
         f.active AS flavor_active, p.active AS product_active,
         COALESCE(f.cost_cents, p.cost_cents)           AS cost_cents,
         COALESCE(f.wholesale_cents, p.wholesale_cents) AS wholesale_cents,
         COALESCE(f.retail_cents, p.retail_cents)       AS retail_cents
  FROM flavors f JOIN products p ON p.id = f.product_id;

  CREATE VIEW stock AS
  SELECT fp.flavor_id, fp.product_id, fp.product_name, fp.flavor_name,
         fp.cost_cents AS listed_cost_cents,
         COALESCE(NULLIF(fc.avg_cost_cents,0), fp.cost_cents) AS cost_cents,
         COALESCE(fc.avg_cost_cents,0) AS avg_cost_cents,
         COALESCE(fc.last_cost_cents,0) AS last_cost_cents,
         fp.wholesale_cents, fp.retail_cents, fp.flavor_active,
         COALESCE((SELECT SUM(qty) FROM purchase_items pi WHERE pi.flavor_id = fp.flavor_id), 0)
         - COALESCE((SELECT SUM(qty) FROM sale_items si WHERE si.flavor_id = fp.flavor_id), 0)
         + COALESCE((SELECT SUM(qty) FROM adjustments a WHERE a.flavor_id = fp.flavor_id), 0)
         AS qty,
         (SELECT MAX(s.occurred_on) FROM sale_items si JOIN sales s ON s.id = si.sale_id
            WHERE si.flavor_id = fp.flavor_id) AS last_sale_on,
         (SELECT MAX(p.occurred_on) FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id
            WHERE pi.flavor_id = fp.flavor_id) AS last_purchase_on
  FROM flavor_pricing fp
  LEFT JOIN flavor_cost fc ON fc.flavor_id = fp.flavor_id;
  `);
}

export function getSetting(key: string, fallback = ""): string {
  const r = db().prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined;
  return r?.value ?? fallback;
}
export function setSetting(key: string, value: string) {
  db().prepare(`INSERT INTO settings (key, value) VALUES (?,?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}

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
