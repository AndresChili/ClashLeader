import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClanMemberRole } from "@clashleader/clash-api";

export interface CurrentClanMember {
  id: string;
  playerTag: string;
  name: string;
  inGameRole: ClanMemberRole;
  activityScore: number | null;
  capitalContributions: number | null;
}

export async function getCurrentMembers(supabase: SupabaseClient, clanId: string): Promise<CurrentClanMember[]> {
  const { data, error } = await supabase
    .from("clan_members")
    .select("id, player_tag, name, in_game_role, activity_score, capital_contributions")
    .eq("clan_id", clanId)
    .eq("is_current", true);

  if (error) {
    throw new Error(`Failed to load current members for clan ${clanId}: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id as string,
    playerTag: row.player_tag as string,
    name: row.name as string,
    inGameRole: row.in_game_role as ClanMemberRole,
    // bigint llega como número o como texto según el tamaño; se normaliza.
    activityScore: row.activity_score === null ? null : Number(row.activity_score),
    capitalContributions: row.capital_contributions === null ? null : Number(row.capital_contributions),
  }));
}

/** Crea un episodio de membresía nuevo para un jugador que acaba de entrar. */
export async function insertNewMember(
  supabase: SupabaseClient,
  clanId: string,
  member: { tag: string; name: string; role: ClanMemberRole },
): Promise<string> {
  const { data, error } = await supabase
    .from("clan_members")
    .insert({ clan_id: clanId, player_tag: member.tag, name: member.name, in_game_role: member.role })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to insert new member ${member.tag} in clan ${clanId}: ${error.message}`);
  }

  return data.id as string;
}

/** Mantiene nombre/rol al día para un miembro que ya estaba activo. */
export async function updateMemberProfile(
  supabase: SupabaseClient,
  clanMemberId: string,
  member: { name: string; role: ClanMemberRole },
): Promise<void> {
  const { error } = await supabase
    .from("clan_members")
    .update({ name: member.name, in_game_role: member.role })
    .eq("id", clanMemberId);

  if (error) {
    throw new Error(`Failed to update member ${clanMemberId}: ${error.message}`);
  }
}

export async function markMembersLeft(supabase: SupabaseClient, clanMemberIds: string[]): Promise<void> {
  if (clanMemberIds.length === 0) return;

  const { error } = await supabase
    .from("clan_members")
    .update({ is_current: false, left_at: new Date().toISOString() })
    .in("id", clanMemberIds);

  if (error) {
    throw new Error(`Failed to mark members left: ${error.message}`);
  }
}

export async function updateLastActivity(supabase: SupabaseClient, clanMemberId: string, at: Date): Promise<void> {
  const { error } = await supabase
    .from("clan_members")
    .update({ last_activity_detected_at: at.toISOString() })
    .eq("id", clanMemberId);

  if (error) {
    throw new Error(`Failed to update last activity for member ${clanMemberId}: ${error.message}`);
  }
}

export async function updateActivityScore(supabase: SupabaseClient, clanMemberId: string, score: number): Promise<void> {
  const { error } = await supabase.from("clan_members").update({ activity_score: score }).eq("id", clanMemberId);

  if (error) {
    throw new Error(`Failed to update activity score for member ${clanMemberId}: ${error.message}`);
  }
}

export interface CapitalContributionInput {
  clanMemberId: string;
  value: number;
}

/**
 * Guarda el total de por vida de oro aportado solo de los miembros a los
 * que les ha cambiado: una fila en capital_contribution_snapshots (de ahí
 * sale lo aportado en cada periodo) y el valor al día en clan_members para
 * la comparación del ciclo siguiente.
 */
export async function recordCapitalContributions(supabase: SupabaseClient, changes: CapitalContributionInput[]): Promise<void> {
  if (changes.length === 0) return;

  const { error } = await supabase
    .from("capital_contribution_snapshots")
    .insert(changes.map((change) => ({ clan_member_id: change.clanMemberId, value: change.value })));

  if (error) {
    throw new Error(`Failed to insert capital contribution snapshots: ${error.message}`);
  }

  for (const change of changes) {
    const { error: updateError } = await supabase
      .from("clan_members")
      .update({ capital_contributions: change.value })
      .eq("id", change.clanMemberId);

    if (updateError) {
      throw new Error(`Failed to update capital contributions for member ${change.clanMemberId}: ${updateError.message}`);
    }
  }
}
