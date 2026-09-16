"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { toCents } from "@/lib/format";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function savePriceAction(form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return;

  const variantId = s(form, "variant_id");
  const wholesale = toCents(s(form, "wholesale"));
  const retail = toCents(s(form, "retail"));
  const minQtyRaw = s(form, "min_qty");
  const minQty = minQtyRaw ? Number(minQtyRaw.replace(",", ".")) : null;

  const supabase = await createClient();
  await supabase.from("org_variant_prices").upsert(
    {
      org_id: profile.org.id,
      variant_id: variantId,
      wholesale_cents: wholesale,
      retail_cents: retail,
      min_qty: minQty,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,variant_id" }
  );

  revalidatePath("/precos");
}

export async function addPaymentMethodAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const name = s(form, "name");
  if (!name) return { error: "Informe um nome." };
  const feeInput = s(form, "fee_percent").replace(",", ".");
  const feePercent = feeInput ? Number(feeInput) : 0;

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_methods")
    .insert({ org_id: profile.org.id, name, fee_percent: Number.isFinite(feePercent) ? feePercent : 0 });
  if (error) return { error: "Não deu pra salvar: " + error.message };

  revalidatePath("/precos");
  return { ok: true };
}

export async function setPaymentMethodFeeAction(form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return;

  const id = s(form, "id");
  const feeInput = s(form, "fee_percent").replace(",", ".");
  const feePercent = feeInput ? Number(feeInput) : 0;

  const supabase = await createClient();
  await supabase
    .from("payment_methods")
    .update({ fee_percent: Number.isFinite(feePercent) ? feePercent : 0 })
    .eq("id", id)
    .eq("org_id", profile.org.id);

  revalidatePath("/precos");
}

export async function togglePaymentMethodAction(form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return;

  const id = s(form, "id");
  const active = s(form, "active") === "true";

  const supabase = await createClient();
  await supabase
    .from("payment_methods")
    .update({ active: !active })
    .eq("id", id)
    .eq("org_id", profile.org.id);

  revalidatePath("/precos");
}
