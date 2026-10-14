import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Completa el flujo de OAuth de Google y el del enlace de verificación de correo. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/panel`);
    }
  }

  return NextResponse.redirect(`${origin}/iniciar-sesion?error=callback`);
}
