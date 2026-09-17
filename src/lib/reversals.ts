import { createClient } from "@/lib/supabase/server";
import { recalcVariantCost, recalcRawMaterialCost } from "@/lib/costing";
import { today } from "@/lib/format";

/**
 * Cancelamento e reversão nunca apagam o movimento original — apagar faria
 * o recálculo cronológico de custo médio (costing.ts) reescrever em
 * silêncio o custo de tudo que veio depois. Em vez disso, um movimento novo
 * datado de hoje devolve o estoque, apontando reverses_movement_id pro
 * original (índice único no banco impede estornar a mesma coisa duas
 * vezes).
 */

export async function reverseSale(orderId: string, orgId: string) {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, supplier_org_id, buyer_org_id, status, reverted_at")
    .eq("id", orderId)
    .single();
  if (!order || order.supplier_org_id !== orgId) return { error: "Venda não encontrada." };
  if (order.buyer_org_id) return { error: "Isso é um pedido entre organizações, não uma venda." };
  if (order.status !== "delivered") return { error: "Só dá pra cancelar uma venda já registrada." };
  if (order.reverted_at) return { error: "Essa venda já foi cancelada." };

  const { data: saleMovements } = await supabase
    .from("inventory_movements")
    .select("id, variant_id, qty, unit_cost_cents, channel")
    .eq("org_id", orgId)
    .eq("reference_type", "order")
    .eq("reference_id", orderId)
    .eq("movement_type", "sale");
  if (!saleMovements?.length) return { error: "Não achei os movimentos de estoque dessa venda." };

  const occurredOn = today();
  const { error: reversalError } = await supabase.from("inventory_movements").insert(
    saleMovements.map((m) => ({
      org_id: orgId,
      variant_id: m.variant_id,
      movement_type: "reversal" as const,
      qty: -Number(m.qty),
      unit_cost_cents: m.unit_cost_cents,
      channel: m.channel,
      occurred_on: occurredOn,
      reference_type: "order" as const,
      reference_id: orderId,
      reverses_movement_id: m.id,
      reason: "Estorno de venda cancelada",
    }))
  );
  if (reversalError) return { error: "Não deu pra estornar o estoque: " + reversalError.message };

  const variantIds = [...new Set(saleMovements.map((m) => m.variant_id))];
  await Promise.all(variantIds.map((v) => recalcVariantCost(orgId, v)));

  const { error: statusError } = await supabase
    .from("orders")
    .update({ reverted_at: new Date().toISOString() })
    .eq("id", orderId);
  if (statusError) return { error: statusError.message };

  return { ok: true };
}

type RevertEligibility = { ok: true } | { ok: false; reason: string };

/**
 * Elegibilidade de reversão de um lote — extraído de reverseProductionBatch
 * pra um lugar só, chamado tanto pela mutação quanto pela renderização
 * (produção/page.tsx esconde o botão "Reverter" quando já sabidamente
 * bloqueado, em vez de deixar clicar pra descobrir).
 */
export async function canRevertBatch(batchId: string, orgId: string): Promise<RevertEligibility> {
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("production_batches")
    .select("id, owner_org_id, status, variant_id, produced_qty, reverted_at")
    .eq("id", batchId)
    .single();
  if (!batch || batch.owner_org_id !== orgId) return { ok: false, reason: "Lote não encontrado." };
  if (batch.status !== "completed") return { ok: false, reason: "Só dá pra reverter um lote já concluído." };
  if (batch.reverted_at) return { ok: false, reason: "Esse lote já foi revertido." };
  if (!batch.variant_id || !batch.produced_qty) {
    return { ok: false, reason: "Lote sem variação ou quantidade produzida." };
  }

  const { data: productionMovement } = await supabase
    .from("inventory_movements")
    .select("id, lot_id")
    .eq("org_id", orgId)
    .eq("reference_type", "production_batch")
    .eq("reference_id", batchId)
    .eq("movement_type", "production")
    .maybeSingle();
  if (!productionMovement) return { ok: false, reason: "Não achei o movimento de estoque dessa produção." };

  if (productionMovement.lot_id) {
    const { data: lot } = await supabase
      .from("inventory_lots")
      .select("qty_received, qty_remaining")
      .eq("id", productionMovement.lot_id)
      .single();
    if (lot && Number(lot.qty_remaining) !== Number(lot.qty_received)) {
      return { ok: false, reason: "Parte desse lote já foi vendida ou consumida — não dá pra reverter." };
    }
  } else {
    const { data: cost } = await supabase
      .from("variant_costs")
      .select("qty")
      .eq("org_id", orgId)
      .eq("variant_id", batch.variant_id)
      .maybeSingle();
    if (!cost || Number(cost.qty) < Number(batch.produced_qty)) {
      return { ok: false, reason: "Parte do que essa produção gerou já foi vendida — não dá pra reverter." };
    }
  }

  return { ok: true };
}

export async function reverseProductionBatch(batchId: string, orgId: string) {
  const supabase = await createClient();

  const eligibility = await canRevertBatch(batchId, orgId);
  if (!eligibility.ok) return { error: eligibility.reason };

  const { data: batch } = await supabase
    .from("production_batches")
    .select("id, owner_org_id, status, variant_id, produced_qty, batch_number, reverted_at")
    .eq("id", batchId)
    .single();
  if (!batch) return { error: "Lote não encontrado." };

  const { data: productionMovement } = await supabase
    .from("inventory_movements")
    .select("id, unit_cost_cents, lot_id")
    .eq("org_id", orgId)
    .eq("reference_type", "production_batch")
    .eq("reference_id", batchId)
    .eq("movement_type", "production")
    .maybeSingle();
  if (!productionMovement) return { error: "Não achei o movimento de estoque dessa produção." };

  let lot: { id: string; qty_received: number; qty_remaining: number } | null = null;
  if (productionMovement.lot_id) {
    const { data } = await supabase
      .from("inventory_lots")
      .select("id, qty_received, qty_remaining")
      .eq("id", productionMovement.lot_id)
      .single();
    lot = data;
  }

  const occurredOn = today();

  const { error: reversalError } = await supabase.from("inventory_movements").insert({
    org_id: orgId,
    variant_id: batch.variant_id,
    movement_type: "reversal",
    qty: -Number(batch.produced_qty),
    unit_cost_cents: productionMovement.unit_cost_cents,
    occurred_on: occurredOn,
    reference_type: "production_batch",
    reference_id: batchId,
    reverses_movement_id: productionMovement.id,
    reason: "Estorno de produção revertida",
  });
  if (reversalError) return { error: "Não deu pra estornar o estoque: " + reversalError.message };

  if (lot) {
    await supabase.from("inventory_lots").update({ qty_remaining: 0 }).eq("id", lot.id);
  }

  const { data: consumptions } = await supabase
    .from("raw_material_movements")
    .select("id, raw_material_id, qty, unit_cost_cents")
    .eq("production_batch_id", batchId)
    .eq("direction", "out");

  if (consumptions?.length) {
    const { error: rawReversalError } = await supabase.from("raw_material_movements").insert(
      consumptions.map((c) => ({
        raw_material_id: c.raw_material_id,
        direction: "in" as const,
        qty: c.qty,
        unit_cost_cents: c.unit_cost_cents,
        reverses_movement_id: c.id,
        reason: "Estorno — lote " + (batch.batch_number || batchId),
        occurred_at: new Date().toISOString(),
      }))
    );
    if (rawReversalError) return { error: "Não deu pra devolver o insumo: " + rawReversalError.message };

    const rawMaterialIds = [...new Set(consumptions.map((c) => c.raw_material_id))];
    await Promise.all(rawMaterialIds.map((id) => recalcRawMaterialCost(orgId, id)));
  }

  await recalcVariantCost(orgId, batch.variant_id);

  const { error: statusError } = await supabase
    .from("production_batches")
    .update({ reverted_at: new Date().toISOString() })
    .eq("id", batchId);
  if (statusError) return { error: statusError.message };

  return { ok: true };
}
