"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ClashApiError } from "@clashleader/clash-api";
import { createClashApiServerClient } from "@/lib/clash-api-server";
import { createClient } from "@/lib/supabase/server";

const TAG_REGEX = /^#[0289PYLQGRJCUV]{3,10}$/;

const schema = z.object({
  clanTag: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => (v.startsWith("#") ? v : `#${v}`))
    .refine((v) => TAG_REGEX.test(v), "Tag de clan no válido."),
  playerTag: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => (v.startsWith("#") ? v : `#${v}`))
    .refine((v) => TAG_REGEX.test(v), "Tag de jugador no válido."),
  playerToken: z.string().trim().min(1, "Pon el token de tu cuenta."),
});

export interface AltaClanActionState {
  error: string | null;
}

const RATE_LIMIT = { maxAttempts: 5, windowSeconds: 15 * 60 };

export async function registerClan(_prev: AltaClanActionState, formData: FormData): Promise<AltaClanActionState> {
  const parsed = schema.safeParse({
    clanTag: formData.get("clanTag"),
    playerTag: formData.get("playerTag"),
    playerToken: formData.get("playerToken"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tienes que iniciar sesión." };

  const { data: allowed, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
    p_identifier: user.id,
    p_action: "register_clan",
    p_max_attempts: RATE_LIMIT.maxAttempts,
    p_window_seconds: RATE_LIMIT.windowSeconds,
  });
  if (rateLimitError || allowed !== true) {
    return { error: "Demasiados intentos. Prueba de nuevo en unos minutos." };
  }

  const clashApi = createClashApiServerClient();

  const verification = await clashApi.verifyPlayerToken(parsed.data.playerTag, parsed.data.playerToken);
  if (!verification || verification.status !== "ok") {
    return { error: "Ese token no es válido para ese jugador. Cópialo de Ajustes › Más ajustes en el juego." };
  }

  let clan;
  try {
    clan = await clashApi.getClan(parsed.data.clanTag);
  } catch (error) {
    if (error instanceof ClashApiError && error.status === 404) {
      return { error: "No se encontró ningún clan con ese tag." };
    }
    return { error: "No se pudo comprobar el clan ahora mismo. Inténtalo de nuevo." };
  }

  const member = clan.memberList.find((m) => m.tag === parsed.data.playerTag);
  if (!member || member.role !== "leader") {
    return { error: "Tu cuenta no es la líder de ese clan según la API." };
  }

  const { error: registerError } = await supabase.rpc("register_clan", {
    p_tag: parsed.data.clanTag,
    p_name: clan.name,
  });

  if (registerError) {
    const alreadyRegistered = registerError.message.includes("clans_tag_key") || registerError.code === "23505";
    return { error: alreadyRegistered ? "Ese clan ya está registrado en ClashLeader." : "No se pudo dar de alta el clan." };
  }

  redirect("/miembros");
}
