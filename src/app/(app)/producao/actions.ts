"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { toCents } from "@/lib/format";
import { recalcVariantCost, recalcRawMaterialCost } from "@/lib/costing";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createProductionBatchAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const productId = s(form, "product_id");
  const variantId = s(form, "variant_id");
  const batchNumber = s(form, "batch_number");
  const plannedQty = s(form, "planned_qty");
  if (!productId) return { error: "Selecione o produto." };

  const supabase = await createClient();
  const { error } = await supabase.from("production_batches").insert({
    owner_org_id: profile.org.id,
    product_id: productId,
    variant_id: variantId || null,
    batch_number: batchNumber || null,
    planned_qty: plannedQty ? Number(plannedQty.replace(",", ".")) : null,
    status: "planned",
  });
  if (error) return { error: "Não deu pra criar: " + error.message };

  revalidatePath("/producao");
  return { ok: true };
}

export async function startBatchAction(form: FormData) {
  const id = s(form, "id");
  const supabase = await createClient();
  await supabase
    .from("production_batches")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/producao");
}

export async function cancelBatchAction(form: FormData) {
  const id = s(form, "id");
  const supabase = await createClient();
  await supabase.from("production_batches").update({ status: "cancelled" }).eq("id", id);
  revalidatePath("/producao");
}

export async function completeBatchAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const id = s(form, "id");
  const variantId = s(form, "variant_id");
  const producedQty = Number(s(form, "produced_qty").replace(",", "."));
  const lotNumber = s(form, "lot_number");
  const expiresOn = s(form, "expires_on");
  const manualUnitCost = toCents(s(form, "unit_cost"));

  if (!producedQty || producedQty <= 0) return { error: "Informe a quantidade produzida." };
  if (!variantId) return { error: "Selecione a variação produzida." };

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: recipe } = await supabase
    .from("recipe_items")
    .select("raw_material_id, qty_per_unit")
    .eq("variant_id", variantId);

  let unitCost = manualUnitCost;
  let insufficientMaterials: string[] = [];

  if (recipe?.length) {
    const rawMaterialIds = recipe.map((r) => r.raw_material_id);
    const { data: balances } = await supabase
      .from("raw_material_movements")
      .select("raw_material_id, direction, qty")
      .in("raw_material_id", rawMaterialIds);
    const balanceById = new Map<string, number>();
    for (const m of balances ?? []) {
      const cur = balanceById.get(m.raw_material_id) ?? 0;
      balanceById.set(m.raw_material_id, cur + (m.direction === "in" ? Number(m.qty) : -Number(m.qty)));
    }

    const consumptions = recipe.map((r) => ({
      rawMaterialId: r.raw_material_id,
      neededQty: r.qty_per_unit * producedQty,
    }));

    const { data: names } = await supabase
      .from("raw_materials")
      .select("id, name")
      .in("id", rawMaterialIds);
    const nameById = new Map((names ?? []).map((n) => [n.id, n.name]));
    insufficientMaterials = consumptions
      .filter((c) => (balanceById.get(c.rawMaterialId) ?? 0) < c.neededQty)
      .map((c) => nameById.get(c.rawMaterialId) ?? c.rawMaterialId);

    const { error: consumeError } = await supabase.from("raw_material_movements").insert(
      consumptions.map((c) => ({
        raw_material_id: c.rawMaterialId,
        direction: "out" as const,
        qty: c.neededQty,
        unit_cost_cents: 0,
        production_batch_id: id,
        reason: "Consumo — lote " + (s(form, "batch_number") || id),
        occurred_at: now,
      }))
    );
    if (consumeError) return { error: "Não deu pra baixar o insumo: " + consumeError.message };

    const costs = await Promise.all(
      consumptions.map((c) => recalcRawMaterialCost(profile.org.id, c.rawMaterialId))
    );
    const materialsCost = consumptions.reduce(
      (sum, c, i) => sum + c.neededQty * costs[i].avgCostCents,
      0
    );
    unitCost = Math.round(materialsCost / producedQty);
  }

  const { error: batchError } = await supabase
    .from("production_batches")
    .update({ status: "completed", produced_qty: producedQty, finished_at: now })
    .eq("id", id);
  if (batchError) return { error: "Não deu pra concluir: " + batchError.message };

  let lotId: string | null = null;
  if (lotNumber || expiresOn) {
    const { data: lot, error: lotError } = await supabase
      .from("inventory_lots")
      .insert({
        org_id: profile.org.id,
        variant_id: variantId,
        lot_number: lotNumber || null,
        production_batch_id: id,
        produced_on: now.slice(0, 10),
        expires_on: expiresOn || null,
        qty_received: producedQty,
        qty_remaining: producedQty,
        unit_cost_cents: unitCost,
      })
      .select("id")
      .single();
    if (lotError) return { error: "Lote não foi criado: " + lotError.message };
    lotId = lot.id;
    await supabase
      .from("lot_stage_events")
      .insert({ lot_id: lotId, stage: "finished_goods", entered_at: now });
  }

  const { error: moveError } = await supabase.from("inventory_movements").insert({
    org_id: profile.org.id,
    variant_id: variantId,
    lot_id: lotId,
    movement_type: "production",
    qty: producedQty,
    unit_cost_cents: unitCost,
    occurred_on: now.slice(0, 10),
    reference_type: "manual",
  });
  if (moveError) return { error: "Movimento de estoque não foi lançado: " + moveError.message };

  await recalcVariantCost(profile.org.id, variantId);

  revalidatePath("/producao");
  revalidatePath("/estoque");
  revalidatePath("/insumos");
  return insufficientMaterials.length
    ? { ok: true, warning: "Saldo insuficiente de: " + insufficientMaterials.join(", ") }
    : { ok: true };
}

export async function createCapacityPlanAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const variantId = s(form, "variant_id");
  const periodStart = s(form, "period_start");
  const periodEnd = s(form, "period_end");
  const plannedQty = s(form, "planned_qty");
  const notes = s(form, "notes");

  if (!periodStart || !periodEnd || !plannedQty) return { error: "Preencha período e quantidade." };

  const supabase = await createClient();
  const { error } = await supabase.from("production_capacity_plans").insert({
    owner_org_id: profile.org.id,
    variant_id: variantId || null,
    period_start: periodStart,
    period_end: periodEnd,
    planned_qty: Number(plannedQty.replace(",", ".")),
    notes: notes || null,
  });
  if (error) return { error: "Não deu pra salvar: " + error.message };

  revalidatePath("/producao");
  return { ok: true };
}
