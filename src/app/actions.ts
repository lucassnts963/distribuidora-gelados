"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, toCents, today } from "@/lib/db";
import { login as doLogin, logout as doLogout } from "@/lib/auth";
import { currentAvgCost, recalcCosts } from "@/lib/costing";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => {
  const v = Number(String(f.get(k) ?? "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

/* ---------------- auth ---------------- */
export async function loginAction(_: unknown, form: FormData) {
  const ok = await doLogin(s(form, "password"));
  if (!ok) return { error: "Senha incorreta." };
  redirect("/");
}
export async function logoutAction() {
  await doLogout();
  redirect("/login");
}

/* ---------------- produtos e sabores ---------------- */
export async function saveProduct(form: FormData) {
  const id = n(form, "id");
  const name = s(form, "name");
  if (!name) return;
  const vals = [name, toCents(s(form, "cost")), toCents(s(form, "wholesale")), toCents(s(form, "retail")),
                form.get("active") ? 1 : 0];
  if (id) {
    db().prepare(`UPDATE products SET name=?, cost_cents=?, wholesale_cents=?, retail_cents=?, active=? WHERE id=?`)
      .run(...vals, id);
  } else {
    db().prepare(`INSERT INTO products (name, cost_cents, wholesale_cents, retail_cents, active) VALUES (?,?,?,?,?)`)
      .run(...vals);
  }
  revalidatePath("/produtos"); revalidatePath("/estoque"); revalidatePath("/");
}

/** Reprocessa o custo medio movel de tudo. Use depois de lancar compra com data retroativa. */
export async function recalcAllCosts() {
  recalcCosts();
  revalidatePath("/"); revalidatePath("/estoque"); revalidatePath("/relatorios");
  revalidatePath("/produtos"); revalidatePath("/vendas");
}

export async function saveFlavor(form: FormData) {
  const id = n(form, "id");
  const productId = n(form, "product_id");
  const name = s(form, "name");
  if (!name || !productId) return;
  const ov = (k: string) => (s(form, k) === "" ? null : toCents(s(form, k)));
  const vals = [productId, name, ov("cost"), ov("wholesale"), ov("retail"), form.get("active") ? 1 : 0];
  if (id) {
    db().prepare(`UPDATE flavors SET product_id=?, name=?, cost_cents=?, wholesale_cents=?, retail_cents=?, active=? WHERE id=?`)
      .run(...vals, id);
  } else {
    db().prepare(`INSERT INTO flavors (product_id, name, cost_cents, wholesale_cents, retail_cents, active) VALUES (?,?,?,?,?,?)`)
      .run(...vals);
  }
  revalidatePath("/produtos"); revalidatePath("/estoque"); revalidatePath("/");
}

export async function toggleFlavor(form: FormData) {
  const id = n(form, "id");
  db().prepare(`UPDATE flavors SET active = 1 - active WHERE id = ?`).run(id);
  revalidatePath("/produtos");
}

/* ---------------- clientes ---------------- */
export async function saveCustomer(form: FormData) {
  const id = n(form, "id");
  const name = s(form, "name");
  if (!name) return;
  const vals = [name, s(form, "phone") || null, s(form, "kind") || "revenda", s(form, "note") || null];
  if (id) db().prepare(`UPDATE customers SET name=?, phone=?, kind=?, note=? WHERE id=?`).run(...vals, id);
  else db().prepare(`INSERT INTO customers (name, phone, kind, note) VALUES (?,?,?,?)`).run(...vals);
  revalidatePath("/clientes");
}

/* ---------------- compras (entrada de estoque) ---------------- */
export async function createPurchase(form: FormData) {
  const d = db();
  const occurred = s(form, "occurred_on") || today();
  const supplier = s(form, "supplier") || null;
  const note = s(form, "note") || null;

  const items = parseItems(form, "cost");
  if (!items.length) return;

  const tx = d.transaction(() => {
    const total = items.reduce((a, i) => a + i.qty * i.unit, 0);
    const r = d.prepare(`INSERT INTO purchases (supplier, occurred_on, note, total_cents) VALUES (?,?,?,?)`)
      .run(supplier, occurred, note, total);
    const ins = d.prepare(`INSERT INTO purchase_items (purchase_id, flavor_id, qty, unit_cents) VALUES (?,?,?,?)`);
    for (const i of items) ins.run(r.lastInsertRowid, i.flavorId, i.qty, i.unit);
  });
  tx();
  recalcCosts();
  revalidatePath("/compras"); revalidatePath("/estoque"); revalidatePath("/"); revalidatePath("/relatorios");
  redirect("/compras");
}

/* ---------------- vendas (saida) ---------------- */
export async function createSale(form: FormData) {
  const d = db();
  const occurred = s(form, "occurred_on") || today();
  const channel = s(form, "channel") || "atacado";
  const payment = s(form, "payment") || "pix";
  const customerId = n(form, "customer_id") || null;
  const note = s(form, "note") || null;

  const items = parseItems(form, "price");
  if (!items.length) return;

  const tx = d.transaction(() => {
    let total = 0, cost = 0;
    const enriched = items.map((i) => {
      const c = currentAvgCost(i.flavorId);
      total += i.qty * i.unit;
      cost += i.qty * c;
      return { ...i, unitCost: c };
    });
    const r = d.prepare(
      `INSERT INTO sales (customer_id, channel, occurred_on, payment, note, total_cents, cost_cents)
       VALUES (?,?,?,?,?,?,?)`
    ).run(customerId, channel, occurred, payment, note, total, cost);
    const ins = d.prepare(
      `INSERT INTO sale_items (sale_id, flavor_id, qty, unit_cents, unit_cost_cents) VALUES (?,?,?,?,?)`
    );
    for (const i of enriched) ins.run(r.lastInsertRowid, i.flavorId, i.qty, i.unit, i.unitCost);
  });
  tx();
  recalcCosts();
  revalidatePath("/vendas"); revalidatePath("/estoque"); revalidatePath("/"); revalidatePath("/relatorios");
  redirect("/vendas");
}

export async function deleteSale(form: FormData) {
  db().prepare(`DELETE FROM sale_items WHERE sale_id = ?`).run(n(form, "id"));
  db().prepare(`DELETE FROM sales WHERE id = ?`).run(n(form, "id"));
  recalcCosts();
  revalidatePath("/vendas"); revalidatePath("/estoque"); revalidatePath("/");
}

export async function deletePurchase(form: FormData) {
  const id = n(form, "id");
  db().prepare(`DELETE FROM purchase_items WHERE purchase_id = ?`).run(id);
  db().prepare(`DELETE FROM purchases WHERE id = ?`).run(id);
  recalcCosts();
  revalidatePath("/compras"); revalidatePath("/estoque"); revalidatePath("/");
}

/* ---------------- despesas ---------------- */
export async function createExpense(form: FormData) {
  db().prepare(`INSERT INTO expenses (category, description, occurred_on, amount_cents) VALUES (?,?,?,?)`)
    .run(s(form, "category") || "outros", s(form, "description") || null,
         s(form, "occurred_on") || today(), toCents(s(form, "amount")));
  revalidatePath("/despesas"); revalidatePath("/"); revalidatePath("/relatorios");
}

export async function deleteExpense(form: FormData) {
  db().prepare(`DELETE FROM expenses WHERE id = ?`).run(n(form, "id"));
  revalidatePath("/despesas"); revalidatePath("/");
}

/* ---------------- ajustes de estoque (perda, brinde, contagem) ---------------- */
export async function createAdjustment(form: FormData) {
  const qtyRaw = Math.abs(n(form, "qty"));
  const reason = s(form, "reason") || "perda";
  const sign = reason === "contagem+" ? 1 : -1;
  db().prepare(`INSERT INTO adjustments (flavor_id, qty, reason, occurred_on, note) VALUES (?,?,?,?,?)`)
    .run(n(form, "flavor_id"), sign * qtyRaw, reason, s(form, "occurred_on") || today(), s(form, "note") || null);
  recalcCosts();
  revalidatePath("/estoque"); revalidatePath("/");
}

/* ---------------- helper: itens do formulario ---------------- */
function parseItems(form: FormData, priceKey: "price" | "cost") {
  const out: { flavorId: number; qty: number; unit: number }[] = [];
  const ids = form.getAll("flavor_id").map((v) => Number(v));
  const qtys = form.getAll("qty").map((v) => Number(String(v).replace(",", ".")));
  const units = form.getAll(priceKey).map((v) => toCents(String(v)));
  for (let i = 0; i < ids.length; i++) {
    const qty = Math.round(qtys[i] || 0);
    if (!ids[i] || qty <= 0) continue;
    out.push({ flavorId: ids[i], qty, unit: units[i] || 0 });
  }
  return out;
}
