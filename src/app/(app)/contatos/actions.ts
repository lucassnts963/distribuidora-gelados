"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function saveContactAction(_: unknown, form: FormData) {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sessão inválida." };

  const name = s(form, "name");
  const phone = s(form, "phone");
  const kind = s(form, "kind") || "varejo";
  const note = s(form, "note");
  if (!name) return { error: "Informe o nome." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .insert({ org_id: profile.org.id, name, phone: phone || null, kind, note: note || null });
  if (error) return { error: "Não deu pra salvar: " + error.message };

  revalidatePath("/contatos");
  return { ok: true };
}
