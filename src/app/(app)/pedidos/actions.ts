"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { parseItems } from "@/lib/formItems";
import { shipOrder, confirmReceipt } from "@/lib/orders";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createOrderAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const supplierOrgId = s(form, "supplier_org_id");
  const channel = s(form, "channel") || "retail";
  const items = parseItems(form, "unit_price");
  if (!supplierOrgId) return { error: "Selecione o fornecedor." };
  if (!items.length) return { error: "Adicione ao menos um item." };

  const supabase = await createClient();
  const total = items.reduce((sum, i) => sum + i.qty * i.cents, 0);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      supplier_org_id: supplierOrgId,
      buyer_org_id: profile.org.id,
      status: "requested",
      channel,
      total_cents: total,
      created_by: profile.userId,
    })
    .select("id")
    .single();
  if (orderError || !order) return { error: "Não deu pra criar o pedido: " + orderError?.message };

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      variant_id: i.variantId,
      qty: i.qty,
      unit_price_cents: i.cents,
    }))
  );
  if (itemsError) return { error: "Itens não foram salvos: " + itemsError.message };

  revalidatePath("/pedidos");
  return { ok: true };
}

export async function acceptOrderAction(form: FormData) {
  const id = s(form, "id");
  const supabase = await createClient();
  await supabase.from("orders").update({ status: "accepted", decided_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/pedidos");
}

export async function startPickingAction(form: FormData) {
  const id = s(form, "id");
  const supabase = await createClient();
  await supabase.from("orders").update({ status: "picking" }).eq("id", id);
  revalidatePath("/pedidos");
}

export async function shipOrderAction(form: FormData) {
  const id = s(form, "id");
  const profile = await getSessionProfile();
  if (!profile) return;
  await shipOrder(id, profile.org.id);
  revalidatePath("/pedidos");
  revalidatePath("/estoque");
}

export async function confirmReceiptAction(form: FormData) {
  const id = s(form, "id");
  const profile = await getSessionProfile();
  if (!profile) return;
  await confirmReceipt(id, profile.org.id);
  revalidatePath("/pedidos");
  revalidatePath("/estoque");
}

export async function cancelOrderAction(form: FormData) {
  const id = s(form, "id");
  const supabase = await createClient();
  await supabase.from("orders").update({ status: "cancelled", decided_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/pedidos");
}
