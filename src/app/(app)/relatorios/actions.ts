"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function markOrderPaidAction(form: FormData) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") return;

  const orderId = s(form, "id");
  const supabase = await createClient();
  await supabase
    .from("orders")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", orderId)
    .or(`supplier_org_id.eq.${profile.org.id},buyer_org_id.eq.${profile.org.id}`)
    .is("paid_at", null);

  revalidatePath("/relatorios");
}
