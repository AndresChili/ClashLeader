import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CollectorConfig } from "../config";

/**
 * El único sitio de todo el código que usa la clave de servicio de
 * Supabase. Se salta RLS por completo, que es justo lo que necesita el
 * recolector (escribe datos de todos los clanes registrados, no solo
 * uno), y justo por lo que esta clave nunca debe llegar a apps/web.
 */
export function createServiceRoleClient(config: Pick<CollectorConfig, "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY">): SupabaseClient {
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
