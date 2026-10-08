"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hashInviteCode } from "@/lib/invite-code";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ code: z.string().trim().min(1, "Pon el código de invitación.") });

export interface UnirseActionState {
  error: string | null;
}

const RATE_LIMIT = { maxAttempts: 8, windowSeconds: 15 * 60 };

export async function redeemInvite(_prev: UnirseActionState, formData: FormData): Promise<UnirseActionState> {
  const parsed = schema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Código no válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tienes que iniciar sesión." };

  const { data: allowed, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
    p_identifier: user.id,
    p_action: "redeem_invite",
    p_max_attempts: RATE_LIMIT.maxAttempts,
    p_window_seconds: RATE_LIMIT.windowSeconds,
  });
  if (rateLimitError || allowed !== true) {
    return { error: "Demasiados intentos. Prueba de nuevo en unos minutos." };
  }

  const { error } = await supabase.rpc("redeem_clan_invite", { p_code_hash: hashInviteCode(parsed.data.code) });

  if (error) {
    const message = error.message.includes("invite_expired")
      ? "Ese código ha caducado."
      : error.message.includes("invite_already_used")
        ? "Ese código ya se ha usado."
        : "Código no válido.";
    return { error: message };
  }

  redirect("/miembros");
}
