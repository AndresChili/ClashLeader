"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

export type AuthActionState = {
  error: string | null;
  info?: string | null;
};

const RATE_LIMIT = { maxAttempts: 5, windowSeconds: 15 * 60 };

async function checkRateLimit(supabase: Awaited<ReturnType<typeof createClient>>, email: string, action: string) {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_identifier: email.toLowerCase(),
    p_action: action,
    p_max_attempts: RATE_LIMIT.maxAttempts,
    p_window_seconds: RATE_LIMIT.windowSeconds,
  });
  if (error) {
    // Fail closed: if the limiter itself is unreachable, don't let the
    // auth attempt through unchecked.
    return false;
  }
  return data === true;
}

export async function signUpWithPassword(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const supabase = await createClient();

  const allowed = await checkRateLimit(supabase, parsed.data.email, "sign_up");
  if (!allowed) {
    return { error: "Demasiados intentos. Prueba de nuevo en unos minutos." };
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.displayName } },
  });

  if (error) {
    return { error: "No se pudo crear la cuenta. Prueba con otro correo." };
  }

  return { error: null, info: "Revisa tu correo para verificar la cuenta antes de iniciar sesión." };
}

export async function signInWithPassword(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const supabase = await createClient();

  const allowed = await checkRateLimit(supabase, parsed.data.email, "sign_in");
  if (!allowed) {
    return { error: "Demasiados intentos. Prueba de nuevo en unos minutos." };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/panel");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/iniciar-sesion?error=google");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/iniciar-sesion");
}
