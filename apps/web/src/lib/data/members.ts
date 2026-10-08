import type { SupabaseClient } from "@supabase/supabase-js";
import { getMemberReliability } from "./wars";

export type MemberRole = "member" | "admin" | "coLeader" | "leader";

interface SnapshotRpcRow {
  clan_member_id: string;
  donations: number;
  donations_received: number;
  exp_level: number | null;
  trophies: number | null;
  town_hall_level: number | null;
  league_name: string | null;
  collected_at: string;
}

export interface MemberSummary {
  id: string;
  playerTag: string;
  name: string;
  inGameRole: MemberRole;
  firstSeenAt: string;
  manualJoinDate: string | null;
  lastActivityDetectedAt: string | null;
  onWatch: boolean;
  donations: number | null;
  donationsReceived: number | null;
  leagueName: string | null;
  trophies: number | null;
  townHallLevel: number | null;
  /** All-time across every finished war on record (see member_war_reliability()); null until the member's first finished war. */
  avgStarsPerAttack: number | null;
  attackUsagePct: number | null;
  attacksUsed: number | null;
  attacksAvailable: number | null;
  warsRostered: number;
  warsAttacked: number;
}

/**
 * Raw facts only — no rule evaluation here. Kick/at-risk/candidate/índice
 * verdicts are computed from this by lib/member-evaluation.ts, which also
 * needs war/capital/clan-games data this function doesn't fetch, so
 * mixing the two here would just mean fetching it twice.
 */
export async function getClanMembers(supabase: SupabaseClient, clanId: string): Promise<MemberSummary[]> {
  const [{ data: members, error: membersError }, { data: snapshots, error: snapshotsError }, reliabilityByMemberId] =
    await Promise.all([
      supabase
        .from("clan_members")
        .select("id, player_tag, name, in_game_role, first_seen_at, manual_join_date, last_activity_detected_at, on_watch")
        .eq("clan_id", clanId)
        .eq("is_current", true),
      supabase.rpc("latest_member_snapshots_for_viewer", { p_clan_id: clanId }) as unknown as Promise<{
        data: SnapshotRpcRow[] | null;
        error: { message: string } | null;
      }>,
      getMemberReliability(supabase, clanId),
    ]);

  if (membersError) throw new Error(`Failed to load clan members: ${membersError.message}`);
  if (snapshotsError) throw new Error(`Failed to load member snapshots: ${snapshotsError.message}`);

  const snapshotByMemberId = new Map((snapshots ?? []).map((row) => [row.clan_member_id, row]));

  return members.map((member) => {
    const snapshot = snapshotByMemberId.get(member.id as string);
    const reliability = reliabilityByMemberId.get(member.id as string);

    return {
      id: member.id as string,
      playerTag: member.player_tag as string,
      name: member.name as string,
      inGameRole: member.in_game_role as MemberRole,
      firstSeenAt: member.first_seen_at as string,
      manualJoinDate: member.manual_join_date as string | null,
      lastActivityDetectedAt: member.last_activity_detected_at as string | null,
      onWatch: member.on_watch as boolean,
      donations: snapshot?.donations ?? null,
      donationsReceived: snapshot?.donations_received ?? null,
      leagueName: snapshot?.league_name ?? null,
      trophies: snapshot?.trophies ?? null,
      townHallLevel: snapshot?.town_hall_level ?? null,
      avgStarsPerAttack: reliability?.avgStars ?? null,
      attackUsagePct: reliability?.usagePct ?? null,
      attacksUsed: reliability?.attacksUsed ?? null,
      attacksAvailable: reliability?.attacksAvailable ?? null,
      warsRostered: reliability?.warsCounted ?? 0,
      warsAttacked: reliability?.warsAttacked ?? 0,
    };
  });
}

export async function getClanMemberByTag(supabase: SupabaseClient, clanId: string, playerTag: string): Promise<MemberSummary | null> {
  // A single clan has at most 50 members, so reusing the list query is
  // simpler and no slower in practice than a bespoke single-row query.
  const members = await getClanMembers(supabase, clanId);
  return members.find((member) => member.playerTag === playerTag) ?? null;
}
