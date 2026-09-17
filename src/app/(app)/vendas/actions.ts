"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { recalcVariantCost } from "@/lib/costing";
import { parseItems } from "@/lib/formItems";
import { reverseSale } from "@/lib/reversals";
import { getLoyaltySettings, loyaltyBalance } from "@/lib/queries";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createSaleAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const contactId = s(form, "contact_id");
  const channel = s(form, "channel") || "retail";
  const paymentMethodId = s(form, "payment_method_id");
  const items = parseItems(form, "unit_price");
  if (!items.length) return { error: "Adicione ao menos um item." };

  const supabase = await createClient();
  const rawTotal = items.reduce((sum, i) => sum + i.qty * i.cents, 0);

  // Fidelidade: resgate de pontos desconta do total ANTES de calcular
  // comissão/taxa, que precisam refletir o valor de verdade cobrado do
  // cliente — mesmo princípio de congelar tudo no momento da venda.
  let redeemPoints = 0;
  let redeemCents = 0;
  let loyalty: Awaited<ReturnType<typeof getLoyaltySettings>> | null = null;
  if (contactId) {
    loyalty = await getLoyaltySettings(profile.org.id);
    if (loyalty.enabled && loyalty.redeem_cents_per_point > 0) {
      const requested = Number(s(form, "redeem_points").replace(",", ".")) || 0;
      if (requested > 0) {
        const balance = await loyaltyBalance(profile.org.id, contactId);
        const maxByTotal = Math.floor(rawTotal / loyalty.redeem_cents_per_point);
        redeemPoints = Math.max(0, Math.min(requested, balance, maxByTotal));
        redeemCents = Math.round(redeemPoints * loyalty.redeem_cents_per_point);
      }
    }
  }
  const total = rawTotal - redeemCents;

  // Comissão congelada no momento da venda — mesmo princípio do custo
  // médio e do preço de pedido: mudar a taxa do vendedor depois não pode
  // alterar venda já feita.
  const commissionCents =
    profile.role === "vendedor" && profile.commissionRateBp
      ? Math.round((total * profile.commissionRateBp) / 10000)
      : null;

  // Mesmo princípio pra taxa da forma de pagamento: congela o percentual
  // vigente agora, mudar a taxa depois não altera venda já feita.
  let feeCents: number | null = null;
  if (paymentMethodId) {
    const { data: method } = await supabase
      .from("payment_methods")
      .select("fee_percent")
      .eq("id", paymentMethodId)
      .eq("org_id", profile.org.id)
      .maybeSingle();
    if (method) feeCents = Math.round((total * Number(method.fee_percent)) / 100);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      supplier_org_id: profile.org.id,
      buyer_contact_id: contactId || null,
      status: "delivered",
      channel,
      total_cents: total,
      commission_cents: commissionCents,
      payment_method_id: paymentMethodId || null,
      fee_cents: feeCents,
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

  if (contactId && loyalty?.enabled) {
    const rate = channel === "wholesale" ? loyalty.points_per_100_wholesale : loyalty.points_per_100_retail;
    const pointsEarned = rate > 0 ? Math.floor((total / 100) * rate) : 0;
    const ledgerRows: { org_id: string; contact_id: string; order_id: string; points: number }[] = [];
    if (pointsEarned > 0) {
      ledgerRows.push({ org_id: profile.org.id, contact_id: contactId, order_id: order.id, points: pointsEarned });
    }
    if (redeemPoints > 0) {
      ledgerRows.push({ org_id: profile.org.id, contact_id: contactId, order_id: order.id, points: -redeemPoints });
    }
    if (ledgerRows.length) await supabase.from("loyalty_ledger").insert(ledgerRows);
  }

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/contatos");
  return { ok: true };
}

export async function cancelSaleAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };
  if (profile.role !== "admin") return { error: "Só um administrador pode cancelar uma venda." };

  const orderId = s(form, "id");
  const result = await reverseSale(orderId, profile.org.id);
  if (result.error) return { error: result.error };

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  return { ok: true };
}
