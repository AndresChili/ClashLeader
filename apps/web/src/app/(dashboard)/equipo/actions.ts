"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateInviteCode, hashInviteCode, INVITE_EXPIRY_DAYS } from "@/lib/invite-code";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ clanId: z.string().uuid() });

export interface CreateInviteState {
  code: string | null;
  error: string | null;
}

export async function createInvite(_prev: CreateInviteState, formData: FormData): Promise<CreateInviteState> {
  const parsed = schema.safeParse({ clanId: formData.get("clanId") });
  if (!parsed.success) return { code: null, error: "Clan no válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { code: null, error: "Tienes que iniciar sesión." };

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // RLS (clan_invites_insert_admin) is the real gate.
  const { error } = await supabase.from("clan_invites").insert({
    clan_id: parsed.data.clanId,
    code_hash: hashInviteCode(code),
    created_by: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return { code: null, error: "No se pudo crear la invitación. Solo el líder puede invitar." };
  }

  await supabase.from("audit_log").insert({
    clan_id: parsed.data.clanId,
    actor_id: user.id,
    action: "invite_created",
    target_type: "clan_invite",
  });

  revalidatePath("/equipo");
  return { code, error: null };
}
