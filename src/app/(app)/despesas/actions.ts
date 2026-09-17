"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { toCents, today } from "@/lib/format";
import { reverseExpense } from "@/lib/reversals";

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
  const costType = s(form, "cost_type") === "fixed" ? "fixed" : "variable";
  if (!category) return { error: "Informe a categoria." };
  if (!amount) return { error: "Informe o valor." };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    org_id: profile.org.id,
    category,
    description: description || null,
    occurred_on: occurredOn,
    amount_cents: amount,
    cost_type: costType,
  });
  if (error) return { error: "Não deu pra lançar: " + error.message };

  revalidatePath("/despesas");
  return { ok: true };
}

export async function cancelExpenseAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };
  if (profile.role !== "admin") return { error: "Só um administrador pode cancelar uma despesa." };

  const expenseId = s(form, "id");
  const reasonKind = s(form, "reason_kind") || "Outro";
  const reasonNote = s(form, "reason_note");
  const reason = reasonNote ? `${reasonKind} — ${reasonNote}` : reasonKind;

  const result = await reverseExpense(expenseId, profile.org.id, reason);
  if (result.error) return { error: result.error };

  revalidatePath("/despesas");
  return { ok: true };
}
