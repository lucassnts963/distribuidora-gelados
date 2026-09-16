import { createClient } from "@/lib/supabase/server";
import type { ModuleKey } from "@/lib/modules";

export type CustomField = {
  id: string;
  key: string;
  label: string;
  field_type: "text" | "number" | "date" | "boolean" | "select";
  options: string[] | null;
  required: boolean;
  sort_order: number;
  active: boolean;
};

export async function listCustomFields(orgId: string): Promise<CustomField[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_custom_fields")
    .select("id, key, label, field_type, options, required, sort_order, active")
    .eq("owner_org_id", orgId)
    .order("sort_order");
  return (data ?? []) as CustomField[];
}

export async function listProducts(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, description, active, product_variants(id, name, sku, active)")
    .eq("owner_org_id", orgId)
    .order("name");
  return data ?? [];
}

export async function getProduct(orgId: string, productId: string) {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, name, sku, description, active, product_variants(id, name, sku, active, photo_url)")
    .eq("owner_org_id", orgId)
    .eq("id", productId)
    .maybeSingle();
  if (!product) return null;

  const { data: values } = await supabase
    .from("product_custom_field_values")
    .select("field_id, value")
    .eq("product_id", productId);

  return { ...product, customValues: values ?? [] };
}

export async function listRawMaterials(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("raw_materials")
    .select("id, name, unit, active")
    .eq("owner_org_id", orgId)
    .order("name");
  return data ?? [];
}

export async function rawMaterialBalance(rawMaterialId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("raw_material_movements")
    .select("direction, qty")
    .eq("raw_material_id", rawMaterialId);
  return (data ?? []).reduce(
    (acc, m) => acc + (m.direction === "in" ? Number(m.qty) : -Number(m.qty)),
    0
  );
}

export async function listVariantIdsWithRecipe(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("recipe_items").select("variant_id").eq("owner_org_id", orgId);
  return new Set((data ?? []).map((r) => r.variant_id as string));
}

export async function listRecipeItems(variantId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipe_items")
    .select("id, raw_material_id, qty_per_unit, raw_materials(name, unit)")
    .eq("variant_id", variantId)
    .order("created_at");
  return data ?? [];
}

export async function listRawMaterialMovements(rawMaterialId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("raw_material_movements")
    .select("id, direction, qty, unit_cost_cents, batch_number, expires_on, reason, occurred_at")
    .eq("raw_material_id", rawMaterialId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listProductionBatches(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("production_batches")
    .select(
      "id, product_id, variant_id, batch_number, planned_qty, produced_qty, status, started_at, finished_at, created_at, reverted_at, products(name), product_variants(name)"
    )
    .eq("owner_org_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listCapacityPlans(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("production_capacity_plans")
    .select("id, period_start, period_end, planned_qty, notes, product_variants(name)")
    .eq("owner_org_id", orgId)
    .order("period_start", { ascending: false });
  return data ?? [];
}

export async function listInventoryLots(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_lots")
    .select(
      "id, lot_number, produced_on, expires_on, qty_received, qty_remaining, unit_cost_cents, variant_id, product_variants(name, products(name))"
    )
    .eq("org_id", orgId)
    .gt("qty_remaining", 0)
    .order("expires_on", { ascending: true, nullsFirst: false });
  return data ?? [];
}

export async function openStagesByLot(lotIds: string[]) {
  if (!lotIds.length) return new Map<string, { stage: string; entered_at: string }>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("lot_stage_events")
    .select("lot_id, stage, entered_at")
    .in("lot_id", lotIds)
    .is("exited_at", null);
  return new Map((data ?? []).map((r) => [r.lot_id as string, { stage: r.stage, entered_at: r.entered_at }]));
}

/** Variações visíveis via RLS: próprias + de fornecedores parceiros ativos. */
export async function listVisibleVariants() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_variants")
    .select("id, name, active, products(name)")
    .eq("active", true)
    .order("name");
  return (data ?? []).map((v) => ({
    id: v.id as string,
    name: v.name as string,
    products: v.products as unknown as { name: string } | null,
  }));
}

export async function listContacts(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name, phone, kind, note")
    .eq("org_id", orgId)
    .order("name");
  return data ?? [];
}

/** Preço de venda que a própria organização define por variação que estoca. */
export async function listOrgPrices(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_variant_prices")
    .select("variant_id, wholesale_cents, retail_cents, min_qty, active")
    .eq("org_id", orgId);
  return new Map((data ?? []).map((p) => [p.variant_id as string, p]));
}

/**
 * Vitrine pública (sem sessão): organização pelo catalog_slug + variações
 * dos produtos que ela mesma fabrica, com preço de venda definido.
 * Depende das policies de RLS "..._select_catalog" (anon), não de auth.
 */
export async function getPublicCatalog(slug: string) {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, logo_url")
    .eq("catalog_slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!org) return null;

  const { data: products } = await supabase
    .from("products")
    .select("id, name, product_variants(id, name, photo_url, active)")
    .eq("owner_org_id", org.id)
    .eq("active", true);

  const { data: prices } = await supabase
    .from("org_variant_prices")
    .select("variant_id, retail_cents")
    .eq("org_id", org.id)
    .eq("active", true)
    .not("retail_cents", "is", null);
  const priceByVariant = new Map((prices ?? []).map((p) => [p.variant_id as string, p.retail_cents as number]));

  const items = (products ?? []).flatMap((p) =>
    (p.product_variants ?? [])
      .filter((v) => v.active && priceByVariant.has(v.id))
      .map((v) => ({
        variantId: v.id as string,
        productName: p.name as string,
        variantName: v.name as string,
        photoUrl: v.photo_url as string | null,
        priceCents: priceByVariant.get(v.id)!,
      }))
  );

  return {
    org: { id: org.id as string, name: org.name as string, logoUrl: org.logo_url as string | null },
    items,
  };
}

/** Custo médio vigente por variação (pra alertar se o preço de venda ficar abaixo do custo). */
export async function listVariantCosts(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("variant_costs")
    .select("variant_id, avg_cost_cents")
    .eq("org_id", orgId);
  return new Map((data ?? []).map((c) => [c.variant_id as string, c.avg_cost_cents as number]));
}

export async function listActiveSuppliers(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("partnerships")
    .select("id, supplier:organizations!supplier_org_id(id, name)")
    .eq("buyer_org_id", orgId)
    .eq("status", "active");
  return data ?? [];
}

type AvailableStockRow = { variant_id: string; qty_available: number; next_expiry: string | null; name: string; product: string };

export async function supplierAvailableStock(supplierOrgId: string): Promise<AvailableStockRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("available_stock", { p_org_id: supplierOrgId });
  if (!data?.length) return [];

  const variantIds = data.map((d: { variant_id: string }) => d.variant_id);
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, name, products(name)")
    .in("id", variantIds);
  const nameById = new Map(
    (variants ?? []).map((v) => [
      v.id as string,
      { name: v.name as string, product: (v.products as unknown as { name: string } | null)?.name ?? "—" },
    ])
  );

  return data.map((d: { variant_id: string; qty_available: number; next_expiry: string | null }) => ({
    ...d,
    ...(nameById.get(d.variant_id) ?? { name: "—", product: "—" }),
  }));
}

export async function listExternalPurchases(orgId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("external_purchases")
    .select("id, supplier_name, note, occurred_on, total_cents")
    .eq("org_id", orgId)
    .order("occurred_on", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listSales(orgId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, channel, total_cents, created_at, reverted_at, contact:contacts(name)")
    .eq("supplier_org_id", orgId)
    .eq("status", "delivered")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listReceivedOrders(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, channel, total_cents, created_at, buyer:organizations!buyer_org_id(id, name), contact:contacts(name), order_items(variant_id, qty, unit_price_cents, product_variants(name))"
    )
    .eq("supplier_org_id", orgId)
    .not("buyer_org_id", "is", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listPlacedOrders(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, channel, total_cents, created_at, supplier:organizations!supplier_org_id(id, name), order_items(variant_id, qty, unit_price_cents, product_variants(name))"
    )
    .eq("buyer_org_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listExpenses(orgId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, category, description, occurred_on, amount_cents")
    .eq("org_id", orgId)
    .order("occurred_on", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function periodSummary(orgId: string, from: string, to: string) {
  const supabase = await createClient();

  const { data: saleMovements } = await supabase
    .from("inventory_movements")
    .select("qty, unit_cost_cents")
    .eq("org_id", orgId)
    .eq("movement_type", "sale")
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  const { data: orders } = await supabase
    .from("orders")
    .select("total_cents")
    .eq("supplier_org_id", orgId)
    .eq("status", "delivered")
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59");

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount_cents")
    .eq("org_id", orgId)
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  const { data: purchases } = await supabase
    .from("external_purchases")
    .select("total_cents")
    .eq("org_id", orgId)
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  const revenue = (orders ?? []).reduce((sum, o) => sum + o.total_cents, 0);
  const cmv = (saleMovements ?? []).reduce((sum, m) => sum + Math.abs(Number(m.qty)) * m.unit_cost_cents, 0);
  const expensesTotal = (expenses ?? []).reduce((sum, e) => sum + e.amount_cents, 0);
  const purchasesTotal = (purchases ?? []).reduce((sum, p) => sum + p.total_cents, 0);
  const grossProfit = revenue - cmv;
  const netProfit = grossProfit - expensesTotal;
  const cashIn = revenue;
  const cashOut = purchasesTotal + expensesTotal;

  return { revenue, cmv, grossProfit, netProfit, expensesTotal, purchasesTotal, cashIn, cashOut, cashFlow: cashIn - cashOut };
}

export async function channelBreakdown(orgId: string, from: string, to: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("channel, total_cents")
    .eq("supplier_org_id", orgId)
    .eq("status", "delivered")
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59");

  const byChannel = { wholesale: { orders: 0, revenue: 0 }, retail: { orders: 0, revenue: 0 } };
  for (const o of data ?? []) {
    const key = (o.channel ?? "retail") as "wholesale" | "retail";
    byChannel[key].orders += 1;
    byChannel[key].revenue += o.total_cents;
  }
  return byChannel;
}

export async function stockValue(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("variant_costs").select("value_cents").eq("org_id", orgId);
  return (data ?? []).reduce((sum, r) => sum + r.value_cents, 0);
}

/** Estoque agregado por variação (soma dos movimentos), sem depender de lote. */
export async function orgStock(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_movements")
    .select("variant_id, qty, product_variants(name, products(name))")
    .eq("org_id", orgId);

  const byVariant = new Map<string, { name: string; product: string; qty: number }>();
  for (const m of data ?? []) {
    const variant = m.product_variants as unknown as { name: string; products: { name: string } } | null;
    const key = m.variant_id as string;
    const cur = byVariant.get(key) ?? {
      name: variant?.name ?? "—",
      product: variant?.products?.name ?? "—",
      qty: 0,
    };
    cur.qty += Number(m.qty);
    byVariant.set(key, cur);
  }
  return Array.from(byVariant, ([variantId, v]) => ({ variantId, ...v }));
}

/** Comissão por vendedor no período — soma de orders.commission_cents já congelado por venda. */
export async function listCommissions(orgId: string, from: string, to: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("created_by, total_cents, commission_cents")
    .eq("supplier_org_id", orgId)
    .eq("status", "delivered")
    .not("commission_cents", "is", null)
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59");
  if (!data?.length) return [];

  const vendorIds = [...new Set(data.map((o) => o.created_by))];
  const { data: vendors } = await supabase.from("profiles").select("id, full_name").in("id", vendorIds);
  const nameById = new Map((vendors ?? []).map((v) => [v.id, v.full_name]));

  const byVendor = new Map<string, { salesCents: number; commissionCents: number; salesCount: number }>();
  for (const o of data) {
    const cur = byVendor.get(o.created_by) ?? { salesCents: 0, commissionCents: 0, salesCount: 0 };
    cur.salesCents += o.total_cents;
    cur.commissionCents += o.commission_cents ?? 0;
    cur.salesCount += 1;
    byVendor.set(o.created_by, cur);
  }

  return Array.from(byVendor, ([vendorId, v]) => ({
    vendorId,
    vendorName: nameById.get(vendorId) ?? "—",
    ...v,
  })).sort((a, b) => b.commissionCents - a.commissionCents);
}

/**
 * Módulos desligados pra essa organização — sem linha em org_modules pra
 * um módulo, ele está liberado (grandfathering). Só as exceções vêm daqui.
 */
export async function listDisabledModules(orgId: string): Promise<Set<ModuleKey>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_modules")
    .select("module")
    .eq("org_id", orgId)
    .eq("enabled", false);
  return new Set((data ?? []).map((r) => r.module as ModuleKey));
}
