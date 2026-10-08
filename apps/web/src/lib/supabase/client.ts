"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// No cookieOptions here: an HttpOnly cookie cannot be written from
// document.cookie, so the browser client keeps the library's own
// non-HttpOnly defaults. The authoritative, HttpOnly session cookie is the
// one set server-side (see server.ts and proxy.ts) after every sign-in.
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
