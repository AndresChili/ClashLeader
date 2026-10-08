import type { SupabaseClient } from "@supabase/supabase-js";
import { isInactiveBeyondThreshold } from "@clashleader/rules";
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
  /** All-time across every war on record (see member_war_reliability()); null until the member's first finished war. */
  avgStarsPerAttack: number | null;
  attackUsagePct: number | null;
  attacksUsed: number | null;
  attacksAvailable: number | null;
  /**
   * Only the inactivity half of "Expulsar" — "no attacks in a finished
   * war" (the other half) needs packages/rules' war-based kick rule,
   * which lands in phase 5 alongside the índice.
   */
  isInactive: boolean;
}

export async function getClanMembers(
  supabase: SupabaseClient,
  clanId: string,
  kickInactivityDays: number,
  now: Date = new Date(),
): Promise<MemberSummary[]> {
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
    const firstSeenAt = (member.manual_join_date as string | null) ?? (member.first_seen_at as string);

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
      isInactive: isInactiveBeyondThreshold({
        lastActivityDetectedAt: member.last_activity_detected_at ? new Date(member.last_activity_detected_at as string) : null,
        firstSeenAt: new Date(firstSeenAt),
        now,
        kickInactivityDays,
      }),
    };
  });
}

export async function getClanMemberByTag(
  supabase: SupabaseClient,
  clanId: string,
  playerTag: string,
  kickInactivityDays: number,
  now: Date = new Date(),
): Promise<MemberSummary | null> {
  // A single clan has at most 50 members, so reusing the list query (which
  // already does one members fetch + one snapshot RPC) is simpler and no
  // slower in practice than two bespoke single-row queries would be.
  const members = await getClanMembers(supabase, clanId, kickInactivityDays, now);
  return members.find((member) => member.playerTag === playerTag) ?? null;
}
