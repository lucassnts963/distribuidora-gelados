/**
 * Popula o banco com os dois produtos e sabores comuns, so para voce nao comecar
 * numa tela vazia. Rode: node scripts/seed.mjs
 * Nao cria vendas nem compras — esses numeros tem que ser os seus de verdade.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH || "./data/gelados.db";
fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
const d = new Database(DB_PATH);
d.pragma("foreign_keys = ON");

const exists = d.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='products'`).get();
if (!exists) {
  console.error("Banco ainda nao criado. Rode o app uma vez (npm run dev) e depois o seed.");
  process.exit(1);
}

const prod = d.prepare(`INSERT OR IGNORE INTO products (name, cost_cents, wholesale_cents, retail_cents) VALUES (?,?,?,?)`);
const idOf = d.prepare(`SELECT id FROM products WHERE name = ?`);
const fl = d.prepare(`INSERT OR IGNORE INTO flavors (product_id, name) VALUES (?,?)`);

// custo, atacado, varejo (em centavos) — numeros informados por voce
prod.run("Laranjinha", 150, 200, 300);
// ATENCAO: o atacado do cremosinho abaixo e' um PLACEHOLDER (mesmo lucro de R$0,50
// da laranjinha). Confirme e ajuste na tela de Produtos.
prod.run("Cremosinho", 80, 130, 150);

const sabores = {
  Laranjinha: ["Laranja", "Uva", "Abacaxi", "Maracujá", "Morango", "Tangerina", "Limão"],
  Cremosinho: ["Chocolate", "Morango", "Açaí", "Cupuaçu", "Leite Ninho", "Maracujá", "Coco", "Bacuri", "Taperebá"],
};

for (const [p, list] of Object.entries(sabores)) {
  const { id } = idOf.get(p);
  for (const s of list) fl.run(id, s);
}

d.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('goal_units','12000')`).run();
console.log("Seed pronto: 2 produtos, " + Object.values(sabores).flat().length + " sabores, meta 12000 un.");
