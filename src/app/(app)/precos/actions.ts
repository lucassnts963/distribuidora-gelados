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
