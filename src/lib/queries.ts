import { createClient } from "@/lib/supabase/server";

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
    .select("id, name, sku, description, active, product_variants(id, name, sku, active)")
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
      "id, product_id, variant_id, batch_number, planned_qty, produced_qty, status, started_at, finished_at, created_at, products(name), product_variants(name)"
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
