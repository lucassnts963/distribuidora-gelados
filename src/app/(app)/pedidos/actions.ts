"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { shipOrder, confirmReceipt } from "@/lib/orders";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createOrderAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const supplierOrgId = s(form, "supplier_org_id");
  const channel = s(form, "channel") || "wholesale";
  // qty[] vem do form; preço nunca vem do comprador — é buscado abaixo na
  // tabela de preços do próprio fornecedor, pro canal escolhido.
  const variantIds = form.getAll("variant_id[]") as string[];
  const qtys = form.getAll("qty[]") as string[];
  const rawItems: { variantId: string; qty: number }[] = [];
  for (let i = 0; i < variantIds.length; i++) {
    const qty = Number(String(qtys[i] ?? "").replace(",", "."));
    if (!variantIds[i] || !qty) continue;
    rawItems.push({ variantId: variantIds[i], qty });
  }
  if (!supplierOrgId) return { error: "Selecione o fornecedor." };
  if (!rawItems.length) return { error: "Adicione ao menos um item." };

  const supabase = await createClient();

  const { data: prices, error: pricesError } = await supabase
    .from("org_variant_prices")
    .select("variant_id, wholesale_cents, retail_cents")
    .eq("org_id", supplierOrgId)
    .in("variant_id", rawItems.map((i) => i.variantId));
  if (pricesError) return { error: "Não deu pra ler os preços do fornecedor: " + pricesError.message };

  const priceByVariant = new Map(prices?.map((p) => [p.variant_id, p]) ?? []);
  const items: { variantId: string; qty: number; cents: number }[] = [];
  for (const raw of rawItems) {
    const price = priceByVariant.get(raw.variantId);
    const cents = channel === "wholesale" ? price?.wholesale_cents : price?.retail_cents;
    if (!cents) {
      return { error: `O fornecedor ainda não definiu o preço de ${channel === "wholesale" ? "atacado" : "varejo"} para um dos itens selecionados.` };
    }
    items.push({ ...raw, cents });
  }

  const total = items.reduce((sum, i) => sum + i.qty * i.cents, 0);

  const paymentMethodId = s(form, "payment_method_id");
  let feeCents: number | null = null;
  let dueDate: string | null = null;
  if (paymentMethodId) {
    const { data: method } = await supabase
      .from("payment_methods")
      .select("fee_percent, is_deferred")
      .eq("id", paymentMethodId)
      .eq("org_id", supplierOrgId)
      .maybeSingle();
    if (method) {
      feeCents = Math.round((total * Number(method.fee_percent)) / 100);
      if (method.is_deferred) dueDate = s(form, "due_date") || null;
    }
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      supplier_org_id: supplierOrgId,
      buyer_org_id: profile.org.id,
      status: "requested",
      channel,
      total_cents: total,
      payment_method_id: paymentMethodId || null,
      fee_cents: feeCents,
      due_date: dueDate,
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
