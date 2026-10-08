import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClanMemberRole } from "../clash-api/types";

export interface CurrentClanMember {
  id: string;
  playerTag: string;
  name: string;
  inGameRole: ClanMemberRole;
}

export async function getCurrentMembers(supabase: SupabaseClient, clanId: string): Promise<CurrentClanMember[]> {
  const { data, error } = await supabase
    .from("clan_members")
    .select("id, player_tag, name, in_game_role")
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
  }));
}

/** Creates a new membership episode for a player who just joined. */
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

/** Keeps name/role in sync for a member who was already current. */
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
