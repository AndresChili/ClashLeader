"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateInviteCode, hashInviteCode, INVITE_EXPIRY_DAYS } from "@/lib/invite-code";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ clanId: z.guid() });

export interface CreateInviteState {
  code: string | null;
  /** Para que InviteCard deje de enseñar el código si se borra. */
  inviteId: string | null;
  error: string | null;
}

const RATE_LIMIT = { maxAttempts: 10, windowSeconds: 15 * 60 };

export async function createInvite(_prev: CreateInviteState, formData: FormData): Promise<CreateInviteState> {
  const parsed = schema.safeParse({ clanId: formData.get("clanId") });
  if (!parsed.success) return { code: null, inviteId: null, error: "Clan no válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { code: null, inviteId: null, error: "Tienes que iniciar sesión." };

  const { data: allowed, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
    p_identifier: user.id,
    p_action: "create_invite",
    p_max_attempts: RATE_LIMIT.maxAttempts,
    p_window_seconds: RATE_LIMIT.windowSeconds,
  });
  if (rateLimitError || allowed !== true) {
    return { code: null, inviteId: null, error: "Demasiados intentos. Prueba de nuevo en unos minutos." };
  }

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Un solo código vivo a la vez: el nuevo sustituye a los que siguen sin usar.
  // RLS (clan_invites_delete_admin / clan_invites_insert_admin) es la barrera real.
  const { error: deleteError } = await supabase
    .from("clan_invites")
    .delete()
    .eq("clan_id", parsed.data.clanId)
    .is("used_at", null);
  if (deleteError) {
    return { code: null, inviteId: null, error: "No se pudo crear la invitación. Solo el líder puede invitar." };
  }

  const { data: invite, error } = await supabase
    .from("clan_invites")
    .insert({
      clan_id: parsed.data.clanId,
      code_hash: hashInviteCode(code),
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return { code: null, inviteId: null, error: "No se pudo crear la invitación. Solo el líder puede invitar." };
  }

  await supabase.from("audit_log").insert({
    clan_id: parsed.data.clanId,
    actor_id: user.id,
    action: "invite_created",
    target_type: "clan_invite",
  });

  revalidatePath("/equipo");
  return { code, inviteId: invite.id as string, error: null };
}

const deleteSchema = z.object({ clanId: z.guid(), inviteId: z.guid() });

export async function deleteInvite(formData: FormData): Promise<void> {
  const parsed = deleteSchema.safeParse({ clanId: formData.get("clanId"), inviteId: formData.get("inviteId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS (clan_invites_delete_admin) solo deja borrar al líder, y solo códigos sin usar.
  const { data: deleted, error } = await supabase
    .from("clan_invites")
    .delete()
    .eq("id", parsed.data.inviteId)
    .eq("clan_id", parsed.data.clanId)
    .select("id");

  if (error || !deleted?.length) return;

  await supabase.from("audit_log").insert({
    clan_id: parsed.data.clanId,
    actor_id: user.id,
    action: "invite_deleted",
    target_type: "clan_invite",
    target_id: parsed.data.inviteId,
  });

  revalidatePath("/equipo");
}

const removeAccessSchema = z.object({ clanId: z.guid(), userId: z.guid() });

export async function removeAccess(formData: FormData): Promise<void> {
  const parsed = removeAccessSchema.safeParse({ clanId: formData.get("clanId"), userId: formData.get("userId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS (clan_access_delete_admin) solo deja al líder quitar lectores, nunca a un admin.
  const { data: removed, error } = await supabase
    .from("clan_access")
    .delete()
    .eq("clan_id", parsed.data.clanId)
    .eq("user_id", parsed.data.userId)
    .select("user_id");

  if (error || !removed?.length) return;

  await supabase.from("audit_log").insert({
    clan_id: parsed.data.clanId,
    actor_id: user.id,
    action: "access_removed",
    target_type: "clan_access",
    target_id: parsed.data.userId,
  });

  revalidatePath("/equipo");
}
