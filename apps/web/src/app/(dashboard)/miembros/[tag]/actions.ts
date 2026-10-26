"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const noteSchema = z.object({
  clanMemberId: z.guid(),
  clanId: z.guid(),
  tagSlug: z.string().min(1), // segmento de URL: playerTag sin '#'
  note: z.string().trim().min(1, "Escribe algo antes de guardar.").max(2000),
});

export interface NoteActionState {
  error: string | null;
}

export async function addLeaderNote(_prev: NoteActionState, formData: FormData): Promise<NoteActionState> {
  const parsed = noteSchema.safeParse({
    clanMemberId: formData.get("clanMemberId"),
    clanId: formData.get("clanId"),
    tagSlug: formData.get("tagSlug"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nota no válida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tienes que iniciar sesión." };

  // RLS (leader_notes_insert_admin) es la barrera real aquí — esta
  // comprobación solo convierte una escritura denegada en un mensaje
  // claro en vez de un error crudo de Postgres.
  const { error } = await supabase
    .from("leader_notes")
    .insert({ clan_member_id: parsed.data.clanMemberId, author_id: user.id, note: parsed.data.note });

  if (error) {
    return { error: "No se pudo guardar la nota. Solo el líder puede añadir notas." };
  }

  await supabase.from("audit_log").insert({
    clan_id: parsed.data.clanId,
    actor_id: user.id,
    action: "leader_note_added",
    target_type: "clan_member",
    target_id: parsed.data.clanMemberId,
  });

  revalidatePath(`/miembros/${parsed.data.tagSlug}`);
  return { error: null };
}

const watchSchema = z.object({
  clanMemberId: z.guid(),
  clanId: z.guid(),
  tagSlug: z.string().min(1),
  onWatch: z.boolean(),
});

export async function setOnWatch(input: { clanMemberId: string; clanId: string; tagSlug: string; onWatch: boolean }) {
  const parsed = watchSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tienes que iniciar sesión." };

  const { error } = await supabase
    .from("clan_members")
    .update({
      on_watch: parsed.onWatch,
      on_watch_at: parsed.onWatch ? new Date().toISOString() : null,
      on_watch_by: parsed.onWatch ? user.id : null,
    })
    .eq("id", parsed.clanMemberId);

  if (error) {
    return { error: "No se pudo actualizar la observación." };
  }

  await supabase.from("audit_log").insert({
    clan_id: parsed.clanId,
    actor_id: user.id,
    action: parsed.onWatch ? "member_watch_enabled" : "member_watch_disabled",
    target_type: "clan_member",
    target_id: parsed.clanMemberId,
  });

  revalidatePath(`/miembros/${parsed.tagSlug}`);
  return { error: null };
}
