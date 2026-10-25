import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { authCookieOptions } from "./cookie-options";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Cliente de Supabase del lado del servidor, con alcance a las cookies de
 * la petición actual. Es RLS (no este cliente) lo que impone de verdad el
 * aislamiento por clan; esto solo lleva el JWT del usuario autenticado
 * para que RLS tenga algo que comprobar.
 *
 * Envuelto en React cache(): sin esto, cada layout/página/helper que pide
 * un cliente dispara su propia llamada a auth.getUser() (ida y vuelta real
 * a Supabase), y como se encadenan en serie en el árbol de Server
 * Components, cada navegación sumaba varios cientos de ms de golpe.
 */
export const createClient = cache(async function createClient() {
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
});

/**
 * Usuario autenticado, memoizado para la petición actual. Sustituye a
 * llamar `supabase.auth.getUser()` directamente: así layout, página y
 * helpers de datos comparten una única comprobación de sesión en vez de
 * repetirla cada uno por su cuenta.
 */
export const getAuthUser = cache(async function getAuthUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});
