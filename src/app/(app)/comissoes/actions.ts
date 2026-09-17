"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { listCommissions, listCommissionPayouts } from "@/lib/queries";
import { today, fmtMonth, monthOf } from "@/lib/format";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function payCommissionAction(form: FormData) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") return;

  const vendorId = s(form, "vendor_id");
  const from = s(form, "from");
  const to = s(form, "to");
  if (!vendorId || !from || !to) return;

  const [accrued, paid] = await Promise.all([
    listCommissions(profile.org.id, from, to),
    listCommissionPayouts(profile.org.id, from, to),
  ]);
  const vendor = accrued.find((c) => c.vendorId === vendorId);
  if (!vendor) return;

  const pendingCents = vendor.commissionCents - (paid.get(vendorId) ?? 0);
  if (pendingCents <= 0) return;

  const supabase = await createClient();
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      org_id: profile.org.id,
      category: "Comissão",
      description: `Comissão — ${vendor.vendorName} (${fmtMonth(monthOf())})`,
      occurred_on: today(),
      amount_cents: pendingCents,
      cost_type: "variable",
    })
    .select("id")
    .single();
  if (expenseError || !expense) return;

  await supabase.from("commission_payouts").insert({
    org_id: profile.org.id,
    vendor_id: vendorId,
    amount_cents: pendingCents,
    expense_id: expense.id,
  });

  revalidatePath("/comissoes");
  revalidatePath("/despesas");
  revalidatePath("/relatorios");
}
