import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase server-only con service_role. NUNCA importar desde un
 * Client Component — "server-only" rompe el build si algo lo intenta.
 * SUPABASE_SERVICE_ROLE_KEY todavía no está configurada (falta que
 * Christian la entregue) — las llamadas fallan con un error claro hasta
 * entonces, no silenciosamente.
 */
export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no configuradas en el entorno del servidor.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
