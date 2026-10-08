import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClanMemberRole } from "../clash-api/types";

export interface LatestSnapshot {
  clanMemberId: string;
  donations: number;
  donationsReceived: number;
  collectedAt: string;
}

/** Backed by the public.latest_member_snapshots() SQL function (DISTINCT ON). */
export async function getLatestSnapshots(supabase: SupabaseClient, clanId: string): Promise<Map<string, LatestSnapshot>> {
  const { data, error } = await supabase.rpc("latest_member_snapshots", { p_clan_id: clanId });

  if (error) {
    throw new Error(`Failed to load latest snapshots for clan ${clanId}: ${error.message}`);
  }

  const byMemberId = new Map<string, LatestSnapshot>();
  for (const row of data) {
    byMemberId.set(row.clan_member_id as string, {
      clanMemberId: row.clan_member_id as string,
      donations: row.donations as number,
      donationsReceived: row.donations_received as number,
      collectedAt: row.collected_at as string,
    });
  }
  return byMemberId;
}

export interface MemberSnapshotInput {
  clanMemberId: string;
  donations: number;
  donationsReceived: number;
  expLevel: number;
  trophies: number;
  townHallLevel: number;
  leagueName: string | null;
  inGameRole: ClanMemberRole;
}

export async function insertMemberSnapshots(supabase: SupabaseClient, snapshots: MemberSnapshotInput[]): Promise<void> {
  if (snapshots.length === 0) return;

  const { error } = await supabase.from("member_snapshots").insert(
    snapshots.map((snapshot) => ({
      clan_member_id: snapshot.clanMemberId,
      donations: snapshot.donations,
      donations_received: snapshot.donationsReceived,
      exp_level: snapshot.expLevel,
      trophies: snapshot.trophies,
      town_hall_level: snapshot.townHallLevel,
      league_name: snapshot.leagueName,
      in_game_role: snapshot.inGameRole,
    })),
  );

  if (error) {
    throw new Error(`Failed to insert member snapshots: ${error.message}`);
  }
}
