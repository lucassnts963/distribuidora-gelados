import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client com a service role — bypassa RLS. Só pra ações administrativas
 * bem específicas (convite de usuário via Admin API), sempre depois de
 * confirmar com o client normal (RLS) que quem chamou tem permissão.
 * Nunca importar isso de um componente de cliente — `server-only`
 * garante isso em build time.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não está definida no ambiente.");
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
