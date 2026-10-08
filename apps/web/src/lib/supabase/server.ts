import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions } from "./cookie-options";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Server-side Supabase client, scoped to the current request's cookies.
 * RLS (not this client) is what actually enforces per-clan isolation; this
 * just carries the signed-in user's JWT so RLS has something to check.
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
          // Called from a Server Component render; the proxy below refreshes
          // the session on the way in, so this is safe to ignore.
        }
      },
    },
  });
}
