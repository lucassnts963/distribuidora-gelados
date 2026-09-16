"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function s(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/**
 * Update direto pelo client normal (RLS) — a policy organizations_update já
 * libera isso só pra quem está em platform_admins; sem checagem extra aqui
 * porque, se a policy negar, o update simplesmente afeta 0 linhas.
 */
export async function toggleOrgAccessAction(form: FormData) {
  const id = s(form, "id");
  const active = s(form, "active") === "true";

  const supabase = await createClient();
  await supabase.from("organizations").update({ active }).eq("id", id);

  revalidatePath("/admin");
}
