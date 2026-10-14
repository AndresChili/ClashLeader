"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// Sin cookieOptions aquí: una cookie HttpOnly no se puede escribir desde
// document.cookie, así que el cliente de navegador mantiene los valores
// por defecto no-HttpOnly de la propia librería. La cookie de sesión
// autoritativa, HttpOnly, es la que se fija del lado del servidor (ver
// server.ts y proxy.ts) después de cada inicio de sesión.
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
