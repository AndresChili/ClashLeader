import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const supabaseOrigin = new URL(getSupabaseUrl()).origin;

// CSP con nonce por petición: es la única forma de permitir los <script>
// inline que Next.js inyecta para hidratar React sin abrir la puerta a
// cualquier script inline (unsafe-inline). Sin esto la app no hidrata en
// ningún navegador, aunque el HTML server-rendered se vea normal.
function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `connect-src 'self' ${supabaseOrigin}`,
    "img-src 'self' data: https://lh3.googleusercontent.com",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join("; ");
}

/**
 * Refresca la cookie de autenticación de Supabase en cada navegación para
 * que los server components siempre vean una sesión válida. Es el único
 * uso legítimo de Proxy aquí; la autorización real la sigue imponiendo
 * RLS en cada petición, nunca solo esta comprobación.
 */
export async function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request: { headers: requestHeaders } });
        response.headers.set("Content-Security-Policy", csp);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)"],
};
