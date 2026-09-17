"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { recalcVariantCost } from "@/lib/costing";
import { parseItems } from "@/lib/formItems";
import { today } from "@/lib/format";
import { reverseExternalPurchase } from "@/lib/reversals";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createExternalPurchaseAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const supplierName = s(form, "supplier_name");
  const note = s(form, "note");
  const occurredOn = s(form, "occurred_on") || today();
  const items = parseItems(form, "unit_cost");
  if (!items.length) return { error: "Adicione ao menos um item." };

  const supabase = await createClient();
  const total = items.reduce((sum, i) => sum + i.qty * i.cents, 0);

  const { data: purchase, error: purchaseError } = await supabase
    .from("external_purchases")
    .insert({ org_id: profile.org.id, supplier_name: supplierName || null, note: note || null, occurred_on: occurredOn, total_cents: total })
    .select("id")
    .single();
  if (purchaseError || !purchase) return { error: "Não deu pra registrar: " + purchaseError?.message };

  const { error: itemsError } = await supabase.from("external_purchase_items").insert(
    items.map((i) => ({
      external_purchase_id: purchase.id,
      variant_id: i.variantId,
      qty: i.qty,
      unit_cost_cents: i.cents,
    }))
  );
  if (itemsError) return { error: "Itens não foram salvos: " + itemsError.message };

  const { error: moveError } = await supabase.from("inventory_movements").insert(
    items.map((i) => ({
      org_id: profile.org.id,
      variant_id: i.variantId,
      movement_type: "purchase" as const,
      qty: i.qty,
      unit_cost_cents: i.cents,
      occurred_on: occurredOn,
      reference_type: "external_purchase" as const,
      reference_id: purchase.id,
    }))
  );
  if (moveError) return { error: "Estoque não foi atualizado: " + moveError.message };

  await Promise.all(items.map((i) => recalcVariantCost(profile.org.id, i.variantId)));

  revalidatePath("/compras");
  revalidatePath("/estoque");
  return { ok: true };
}

export async function cancelExternalPurchaseAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };
  if (profile.role !== "admin") return { error: "Só um administrador pode cancelar uma compra." };

  const purchaseId = s(form, "id");
  const reasonKind = s(form, "reason_kind") || "Outro";
  const reasonNote = s(form, "reason_note");
  const reason = reasonNote ? `${reasonKind} — ${reasonNote}` : reasonKind;

  const result = await reverseExternalPurchase(purchaseId, profile.org.id, reason);
  if (result.error) return { error: result.error };

  revalidatePath("/compras");
  revalidatePath("/estoque");
  return { ok: true };
}
