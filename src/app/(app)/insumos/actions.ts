"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { toCents } from "@/lib/format";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createRawMaterialAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const name = s(form, "name");
  const unit = s(form, "unit") || "un";
  if (!name) return { error: "Informe o nome do insumo." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("raw_materials")
    .insert({ owner_org_id: profile.org.id, name, unit });
  if (error) return { error: "Não deu pra criar: " + error.message };

  revalidatePath("/insumos");
  return { ok: true };
}

export async function recordRawMaterialMovementAction(_: unknown, form: FormData) {
  const rawMaterialId = s(form, "raw_material_id");
  const direction = s(form, "direction");
  const qty = Number(s(form, "qty").replace(",", "."));
  const unitCost = toCents(s(form, "unit_cost"));
  const batchNumber = s(form, "batch_number");
  const expiresOn = s(form, "expires_on");
  const reason = s(form, "reason");

  if (!qty || qty <= 0) return { error: "Informe uma quantidade válida." };

  const supabase = await createClient();
  const { error } = await supabase.from("raw_material_movements").insert({
    raw_material_id: rawMaterialId,
    direction,
    qty,
    unit_cost_cents: unitCost,
    batch_number: batchNumber || null,
    expires_on: expiresOn || null,
    reason: reason || null,
  });
  if (error) return { error: "Não deu pra lançar: " + error.message };

  revalidatePath(`/insumos/${rawMaterialId}`);
  return { ok: true };
}
