/**
 * Teste do custo medio ponderado movel — o cenario que motivou a mudanca:
 * comprar o mesmo produto por precos diferentes ao longo do tempo.
 */
import { db } from "../src/lib/db.ts";
import { recalcCosts, currentAvgCost } from "../src/lib/costing.ts";

const d = db();
const P = (n: number) => (n / 100).toFixed(2).replace(".", ",");
let pass = 0, fail = 0;
const check = (label: string, got: number, want: number) => {
  if (got === want) { console.log(`PASS ${label}: R$ ${P(got)}`); pass++; }
  else { console.log(`FAIL ${label}: got R$ ${P(got)}, want R$ ${P(want)}`); fail++; }
};

d.prepare(`INSERT INTO products (name, cost_cents, wholesale_cents, retail_cents) VALUES ('T',100,200,300)`).run();
const pid = (d.prepare(`SELECT id FROM products WHERE name='T'`).get() as any).id;
d.prepare(`INSERT INTO flavors (product_id, name) VALUES (?, 'X')`).run(pid);
const fid = (d.prepare(`SELECT id FROM flavors WHERE product_id=?`).get(pid) as any).id;

const buy = (date: string, qty: number, unit: number) => {
  const r = d.prepare(`INSERT INTO purchases (occurred_on, total_cents) VALUES (?,?)`).run(date, qty * unit);
  d.prepare(`INSERT INTO purchase_items (purchase_id, flavor_id, qty, unit_cents) VALUES (?,?,?,?)`)
    .run(r.lastInsertRowid, fid, qty, unit);
  recalcCosts();
};
const sell = (date: string, qty: number, price: number) => {
  const r = d.prepare(`INSERT INTO sales (occurred_on, channel, total_cents) VALUES (?, 'varejo', ?)`).run(date, qty * price);
  d.prepare(`INSERT INTO sale_items (sale_id, flavor_id, qty, unit_cents) VALUES (?,?,?,?)`)
    .run(r.lastInsertRowid, fid, qty, price);
  recalcCosts();
  return Number(r.lastInsertRowid);
};
const costOfSale = (id: number) => (d.prepare(`SELECT cost_cents FROM sales WHERE id=?`).get(id) as any).cost_cents;

console.log("\n— Cenario: tres negociacoes com precos diferentes —\n");

buy("2026-01-01", 100, 100);                      // 100 un a R$1,00
check("apos comprar 100 a R$1,00, custo medio", currentAvgCost(fid), 100);

const s1 = sell("2026-01-05", 90, 300);           // vende 90
check("custo dessa venda (90 un a R$1,00)", costOfSale(s1), 9000);
check("custo medio segue R$1,00", currentAvgCost(fid), 100);

buy("2026-01-10", 100, 200);                      // 100 un a R$2,00, sobrando 10 do lote antigo
// (10*100 + 100*200) / 110 = 21000/110 = 190,9 -> 191
check("custo medio movel apos 2a compra", currentAvgCost(fid), 191);
console.log("     (media SIMPLES das compras daria R$ 1,50 — subestimaria em R$ 0,41/un)");

const s2 = sell("2026-01-15", 50, 300);
check("custo da 2a venda (50 x R$1,91)", costOfSale(s2), 50 * 191);
check("venda antiga NAO foi alterada", costOfSale(s1), 9000);

buy("2026-01-20", 60, 90);                        // lote barato
// saldo antes: 110-50 = 60 un ao medio 191 -> valor 11460 (o recalc reconstroi do zero)
// (60*191 + 60*90)/120 = (11460+5400)/120 = 16860/120 = 140,5 -> 141
const avg3 = currentAvgCost(fid);
console.log(`     custo medio apos 3a compra (60 a R$0,90): R$ ${P(avg3)}`);
(avg3 > 138 && avg3 < 143) ? (console.log("PASS media caiu para a faixa esperada (~R$1,41)"), pass++)
                           : (console.log("FAIL media fora da faixa esperada"), fail++);

console.log("\n— Perda sai pelo custo medio —\n");
d.prepare(`INSERT INTO adjustments (flavor_id, qty, reason, occurred_on) VALUES (?,?,?,?)`)
  .run(fid, -20, "perda", "2026-01-25");
recalcCosts();
const adj = d.prepare(`SELECT unit_cost_cents FROM adjustments WHERE flavor_id=?`).get(fid) as any;
check("perda de 20 un valorizada ao custo medio", adj.unit_cost_cents, avg3);

console.log("\n— Compra RETROATIVA reprocessa a ordem —\n");
buy("2026-01-02", 100, 300);   // lancada por ultimo, mas com data no inicio
const s1novo = costOfSale(s1);
// agora antes da venda de 05/01 existem 100 a R$1,00 + 100 a R$3,00 -> medio 200
check("venda de 05/01 recalculada ao novo medio (90 x R$2,00)", s1novo, 90 * 200);

const qty = (d.prepare(`SELECT qty FROM stock WHERE flavor_id=?`).get(fid) as any).qty;
if (qty === 200) { console.log("PASS saldo fisico: 200 un"); pass++; }
else { console.log("FAIL saldo fisico: " + qty + " un, esperado 200"); fail++; }

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
