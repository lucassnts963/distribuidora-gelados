"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { toCents, today } from "@/lib/format";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createExpenseAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const category = s(form, "category");
  const description = s(form, "description");
  const occurredOn = s(form, "occurred_on") || today();
  const amount = toCents(s(form, "amount"));
  if (!category) return { error: "Informe a categoria." };
  if (!amount) return { error: "Informe o valor." };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    org_id: profile.org.id,
    category,
    description: description || null,
    occurred_on: occurredOn,
    amount_cents: amount,
  });
  if (error) return { error: "Não deu pra lançar: " + error.message };

  revalidatePath("/despesas");
  return { ok: true };
}
