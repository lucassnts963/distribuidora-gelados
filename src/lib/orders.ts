import { createClient } from "@/lib/supabase/server";
import { recalcVariantCost } from "@/lib/costing";
import { today } from "@/lib/format";

/**
 * Cada lado do pedido só escreve no próprio estoque (RLS exige org_id =
 * quem está logado): o fornecedor lança a saída ao despachar, o comprador
 * lança a entrada ao confirmar recebimento. Pedido pra contato (sem
 * organização do outro lado) não tem essa segunda etapa — despachar já
 * entrega.
 */

export async function shipOrder(orderId: string, supplierOrgId: string) {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("channel, buyer_org_id")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Pedido não encontrado." };

  const { data: items } = await supabase
    .from("order_items")
    .select("variant_id, qty")
    .eq("order_id", orderId);
  if (!items?.length) return { error: "Pedido sem itens." };

  const occurredOn = today();
  const { error: moveError } = await supabase.from("inventory_movements").insert(
    items.map((i) => ({
      org_id: supplierOrgId,
      variant_id: i.variant_id,
      movement_type: "sale" as const,
      qty: -Number(i.qty),
      unit_cost_cents: 0,
      channel: order.channel,
      occurred_on: occurredOn,
      reference_type: "order" as const,
      reference_id: orderId,
    }))
  );
  if (moveError) return { error: "Não deu pra baixar o estoque: " + moveError.message };

  await Promise.all(items.map((i) => recalcVariantCost(supplierOrgId, i.variant_id)));

  const nextStatus = order.buyer_org_id ? "shipped" : "delivered";
  const { error: statusError } = await supabase
    .from("orders")
    .update({ status: nextStatus, decided_at: order.buyer_org_id ? undefined : new Date().toISOString() })
    .eq("id", orderId);
  if (statusError) return { error: statusError.message };

  return { ok: true };
}

export async function confirmReceipt(orderId: string, buyerOrgId: string) {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("order_items")
    .select("variant_id, qty, unit_price_cents")
    .eq("order_id", orderId);
  if (!items?.length) return { error: "Pedido sem itens." };

  const occurredOn = today();
  const { error: moveError } = await supabase.from("inventory_movements").insert(
    items.map((i) => ({
      org_id: buyerOrgId,
      variant_id: i.variant_id,
      movement_type: "purchase" as const,
      qty: Number(i.qty),
      unit_cost_cents: i.unit_price_cents,
      occurred_on: occurredOn,
      reference_type: "order" as const,
      reference_id: orderId,
    }))
  );
  if (moveError) return { error: "Não deu pra dar entrada no estoque: " + moveError.message };

  await Promise.all(items.map((i) => recalcVariantCost(buyerOrgId, i.variant_id)));

  const { error: statusError } = await supabase
    .from("orders")
    .update({ status: "delivered", decided_at: new Date().toISOString() })
    .eq("id", orderId);
  if (statusError) return { error: statusError.message };

  return { ok: true };
}
