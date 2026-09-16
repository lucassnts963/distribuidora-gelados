"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { recalcVariantCost } from "@/lib/costing";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

const STAGES = [
  "raw_material_reserved",
  "in_production",
  "finished_goods",
  "in_transit",
  "distributor_stock",
  "sold",
] as const;

export async function advanceLotStageAction(form: FormData) {
  const lotId = s(form, "lot_id");
  const currentStage = s(form, "current_stage");
  const idx = STAGES.indexOf(currentStage as (typeof STAGES)[number]);
  const next = STAGES[idx + 1];
  if (!next) return;

  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("lot_stage_events")
    .update({ exited_at: now })
    .eq("lot_id", lotId)
    .is("exited_at", null);
  await supabase.from("lot_stage_events").insert({ lot_id: lotId, stage: next, entered_at: now });

  revalidatePath("/estoque");
}

export async function recordLossAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const variantId = s(form, "variant_id");
  const lotId = s(form, "lot_id");
  const qty = Number(s(form, "qty").replace(",", "."));
  const reason = s(form, "reason");

  if (!variantId) return { error: "Selecione a variação." };
  if (!qty || qty <= 0) return { error: "Informe uma quantidade válida." };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_movements").insert({
    org_id: profile.org.id,
    variant_id: variantId,
    lot_id: lotId || null,
    movement_type: "loss",
    qty: -Math.abs(qty),
    unit_cost_cents: 0,
    reference_type: "manual",
    reason: reason || null,
  });
  if (error) return { error: "Não deu pra lançar a perda: " + error.message };

  await recalcVariantCost(profile.org.id, variantId);

  if (lotId) {
    const { data: lot } = await supabase
      .from("inventory_lots")
      .select("qty_remaining")
      .eq("id", lotId)
      .single();
    if (lot) {
      await supabase
        .from("inventory_lots")
        .update({ qty_remaining: Math.max(0, Number(lot.qty_remaining) - qty) })
        .eq("id", lotId);
    }
  }

  revalidatePath("/estoque");
  return { ok: true };
}
