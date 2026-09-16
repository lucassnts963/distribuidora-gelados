"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { recalcVariantCost } from "@/lib/costing";
import { parseItems } from "@/lib/formItems";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createSaleAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const contactId = s(form, "contact_id");
  const channel = s(form, "channel") || "retail";
  const items = parseItems(form, "unit_price");
  if (!items.length) return { error: "Adicione ao menos um item." };

  const supabase = await createClient();
  const total = items.reduce((sum, i) => sum + i.qty * i.cents, 0);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      supplier_org_id: profile.org.id,
      buyer_contact_id: contactId || null,
      status: "delivered",
      channel,
      total_cents: total,
      created_by: profile.userId,
      decided_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (orderError || !order) return { error: "Não deu pra registrar a venda: " + orderError?.message };

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      variant_id: i.variantId,
      qty: i.qty,
      unit_price_cents: i.cents,
    }))
  );
  if (itemsError) return { error: "Itens não foram salvos: " + itemsError.message };

  const { error: moveError } = await supabase.from("inventory_movements").insert(
    items.map((i) => ({
      org_id: profile.org.id,
      variant_id: i.variantId,
      movement_type: "sale" as const,
      qty: -i.qty,
      unit_cost_cents: 0,
      channel,
      occurred_on: new Date().toISOString().slice(0, 10),
      reference_type: "order" as const,
      reference_id: order.id,
    }))
  );
  if (moveError) return { error: "Estoque não foi atualizado: " + moveError.message };

  await Promise.all(items.map((i) => recalcVariantCost(profile.org.id, i.variantId)));

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  return { ok: true };
}
