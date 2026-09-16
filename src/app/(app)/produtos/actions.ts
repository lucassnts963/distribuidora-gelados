"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function saveCustomFieldAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const key = s(form, "key");
  const label = s(form, "label");
  const field_type = s(form, "field_type");
  const required = form.get("required") === "on";
  const optionsRaw = s(form, "options");
  const options = optionsRaw
    ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
    : null;

  if (!key || !label || !field_type) return { error: "Preencha chave, rótulo e tipo." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("product_custom_fields")
    .select("id", { count: "exact", head: true })
    .eq("owner_org_id", profile.org.id);

  const { error } = await supabase.from("product_custom_fields").insert({
    owner_org_id: profile.org.id,
    key,
    label,
    field_type,
    options,
    required,
    sort_order: count ?? 0,
  });
  if (error) return { error: "Não deu pra salvar: " + error.message };

  revalidatePath("/produtos/campos");
  return { ok: true };
}

export async function toggleCustomFieldAction(form: FormData) {
  const id = s(form, "id");
  const active = s(form, "active") === "true";
  const supabase = await createClient();
  await supabase.from("product_custom_fields").update({ active: !active }).eq("id", id);
  revalidatePath("/produtos/campos");
}

export async function saveProductAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const name = s(form, "name");
  const sku = s(form, "sku");
  const description = s(form, "description");
  if (!name) return { error: "Informe o nome do produto." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ owner_org_id: profile.org.id, name, sku: sku || null, description: description || null })
    .select("id")
    .single();
  if (error || !data) return { error: "Não deu pra criar: " + error?.message };

  revalidatePath("/produtos");
  return { ok: true, id: data.id };
}

export async function addVariantAction(_: unknown, form: FormData) {
  const productId = s(form, "product_id");
  const name = s(form, "name");
  const sku = s(form, "sku");
  if (!name) return { error: "Informe o nome da variação." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_variants")
    .insert({ product_id: productId, name, sku: sku || null });
  if (error) return { error: "Não deu pra adicionar: " + error.message };

  revalidatePath(`/produtos/${productId}`);
  return { ok: true };
}

export async function toggleVariantAction(form: FormData) {
  const id = s(form, "id");
  const productId = s(form, "product_id");
  const active = s(form, "active") === "true";
  const supabase = await createClient();
  await supabase.from("product_variants").update({ active: !active }).eq("id", id);
  revalidatePath(`/produtos/${productId}`);
}

/**
 * O upload em si acontece no client (bucket product-photos, policy de
 * storage já garante que só a própria organização escreve no próprio
 * caminho) — isso só grava a URL pública já pronta na variação.
 */
export async function setVariantPhotoAction(form: FormData) {
  const id = s(form, "id");
  const productId = s(form, "product_id");
  const photoUrl = s(form, "photo_url");
  const supabase = await createClient();
  await supabase.from("product_variants").update({ photo_url: photoUrl || null }).eq("id", id);
  revalidatePath(`/produtos/${productId}`);
}

export async function addRecipeItemAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const productId = s(form, "product_id");
  const variantId = s(form, "variant_id");
  const rawMaterialId = s(form, "raw_material_id");
  const qtyPerUnit = Number(s(form, "qty_per_unit").replace(",", "."));
  if (!variantId) return { error: "Selecione a variação." };
  if (!rawMaterialId) return { error: "Selecione o insumo." };
  if (!qtyPerUnit || qtyPerUnit <= 0) return { error: "Informe a quantidade por unidade." };

  const supabase = await createClient();
  const { error } = await supabase.from("recipe_items").upsert(
    { owner_org_id: profile.org.id, variant_id: variantId, raw_material_id: rawMaterialId, qty_per_unit: qtyPerUnit },
    { onConflict: "variant_id,raw_material_id" }
  );
  if (error) return { error: "Não deu pra salvar: " + error.message };

  revalidatePath(`/produtos/${productId}`);
  return { ok: true };
}

export async function removeRecipeItemAction(form: FormData) {
  const id = s(form, "id");
  const productId = s(form, "product_id");
  const supabase = await createClient();
  await supabase.from("recipe_items").delete().eq("id", id);
  revalidatePath(`/produtos/${productId}`);
}

export async function saveCustomValuesAction(form: FormData) {
  const productId = s(form, "product_id");
  const fieldIds = form.getAll("field_id") as string[];
  const supabase = await createClient();

  const { data: defs } = await supabase
    .from("product_custom_fields")
    .select("id, field_type")
    .in("id", fieldIds);
  const typeById = new Map((defs ?? []).map((d) => [d.id, d.field_type]));

  const rows = fieldIds.map((fieldId) => {
    const type = typeById.get(fieldId);
    let value: string | number | boolean | null;
    if (type === "boolean") {
      value = form.get(`value_${fieldId}`) === "on";
    } else if (type === "number") {
      const raw = s(form, `value_${fieldId}`);
      value = raw === "" ? null : Number(raw);
    } else {
      const raw = s(form, `value_${fieldId}`);
      value = raw === "" ? null : raw;
    }
    return { product_id: productId, field_id: fieldId, value };
  });

  await supabase
    .from("product_custom_field_values")
    .upsert(rows, { onConflict: "product_id,field_id" });

  revalidatePath(`/produtos/${productId}`);
}
