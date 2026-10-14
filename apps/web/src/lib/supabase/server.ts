import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions } from "./cookie-options";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Cliente de Supabase del lado del servidor, con alcance a las cookies de
 * la petición actual. Es RLS (no este cliente) lo que impone de verdad el
 * aislamiento por clan; esto solo lleva el JWT del usuario autenticado
 * para que RLS tenga algo que comprobar.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Se llama desde el render de un Server Component; el proxy de
          // abajo refresca la sesión a la entrada, así que es seguro ignorarlo.
        }
      },
    },
  });
}
