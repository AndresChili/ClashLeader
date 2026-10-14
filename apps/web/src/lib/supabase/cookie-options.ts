import type { CookieOptions } from "@supabase/ssr";

/** HttpOnly, Secure, SameSite=Lax en toda cookie de autenticación (OWASP A05/A07). */
export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
