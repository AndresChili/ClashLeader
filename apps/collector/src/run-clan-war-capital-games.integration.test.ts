import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ClashApiClient,
  type ClashApiCapitalRaidSeason,
  type ClashApiClan,
  type ClashApiCwlGroup,
  type ClashApiPlayer,
  type ClashApiWar,
} from "@clashleader/clash-api";
import { runClanCollection } from "./run-clan";

// Same local-dev-only defaults as run-clan.integration.test.ts.
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const DEMO_LEADER_ID = "a0000000-0000-0000-0000-000000000001";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const clanTag = "#QVCLJ2PYR";
const opponentTag = "#QVCLJ2PYL";

const clan: ClashApiClan = {
  tag: clanTag,
  name: "Clan Guerra",
  memberList: [
    { tag: "#P1", name: "Marcos", role: "member", expLevel: 50, townHallLevel: 12, trophies: 3000, clanRank: 1, previousClanRank: 1, donations: 10, donationsReceived: 0 },
  ],
};

const war: ClashApiWar = {
  state: "warEnded",
  teamSize: 1,
  preparationStartTime: "2026-10-01T00:00:00.000Z",
  startTime: "2026-10-01T01:00:00.000Z",
  endTime: "2026-10-02T01:00:00.000Z",
  clan: {
    tag: clanTag,
    name: "Clan Guerra",
    clanLevel: 10,
    attacks: 1,
    stars: 3,
    destructionPercentage: 100,
    members: [
      {
        tag: "#P1",
        name: "Marcos",
        mapPosition: 1,
        townhallLevel: 12,
        opponentAttacks: 0,
        attacks: [{ order: 1, attackerTag: "#P1", defenderTag: "#O1", stars: 3, duration: 60, destructionPercentage: 100 }],
      },
    ],
  },
  opponent: {
    tag: opponentTag,
    name: "Rival",
    clanLevel: 9,
    attacks: 0,
    stars: 0,
    destructionPercentage: 0,
    members: [],
  },
};

const cwlGroup: ClashApiCwlGroup = { state: "notInWar", season: "2026-10", rounds: [] };

const capitalSeason: ClashApiCapitalRaidSeason = {
  state: "ended",
  startTime: "2026-10-03T07:00:00.000Z",
  endTime: "2026-10-06T07:00:00.000Z",
  capitalTotalLoot: 50000,
  totalAttacks: 1,
  members: [{ tag: "#P1", name: "Marcos", attacks: 1, attackLimit: 5, bonusAttackLimit: 1, capitalResourcesLooted: 1200 }],
};

const player: ClashApiPlayer = {
  tag: "#P1",
  name: "Marcos",
  achievements: [{ name: "Games Champion", value: 15000 }],
};

function fakeClient(): ClashApiClient {
  const fetchImpl = (async (url: string) => {
    const path = new URL(url).pathname;
    const body =
      path.includes("/currentwar/leaguegroup")
        ? cwlGroup
        : path.includes("/currentwar")
          ? war
          : path.includes("/capitalraidseasons")
            ? { items: [capitalSeason] }
            : path.startsWith("/players/")
              ? player
              : path.startsWith("/clans/")
                ? clan
                : null;
    return { ok: true, json: async () => body };
  }) as unknown as typeof fetch;

  return new ClashApiClient({ baseUrl: "https://example.test", token: "x", fetchImpl });
}

describe("runClanCollection: war, capital and clan games (integration)", () => {
  let clanId: string;

  beforeAll(async () => {
    const { data, error } = await supabase
      .from("clans")
      .insert({ tag: clanTag, name: "Clan Guerra", created_by: DEMO_LEADER_ID })
      .select("id")
      .single();
    if (error) throw error;
    clanId = data.id as string;
  });

  afterAll(async () => {
    if (clanId) await supabase.from("clans").delete().eq("id", clanId);
  });

  it("stores the ended war, the capital season and opens a clan games season, end to end", async () => {
    const now = new Date("2026-10-08T12:00:00Z");
    const result = await runClanCollection(fakeClient(), supabase, { id: clanId, tag: clanTag, name: "x" }, now);

    expect(result.warnings).toEqual([]);
    expect(result.currentWarState).toBe("warEnded");
    expect(result.capitalCollected).toBe(true);
    expect(result.clanGamesMembersTracked).toBe(1);

    const { data: wars } = await supabase.from("wars").select("*").eq("clan_id", clanId);
    expect(wars).toHaveLength(1);
    expect(wars![0]!.result).toBe("win");
    expect(wars![0]!.clan_stars).toBe(3);
    expect(wars![0]!.opponent_tag).toBe(opponentTag);

    const { data: warMembers } = await supabase.from("war_members").select("*").eq("war_id", wars![0]!.id);
    expect(warMembers).toHaveLength(1);
    expect(warMembers![0]!.attacks_used).toBe(1);

    const { data: warAttacks } = await supabase.from("war_attacks").select("*").eq("war_id", wars![0]!.id);
    expect(warAttacks).toHaveLength(1);
    expect(warAttacks![0]!.stars).toBe(3);

    const { data: member } = await supabase.from("clan_members").select("last_activity_detected_at").eq("clan_id", clanId).eq("player_tag", "#P1").single();
    // Both the war attack and the capital attack happened this poll, so
    // activity must be detected even though donations didn't move.
    expect(member!.last_activity_detected_at).not.toBeNull();

    const { data: capitalSeasons } = await supabase.from("capital_seasons").select("*").eq("clan_id", clanId);
    expect(capitalSeasons).toHaveLength(1);

    const { data: contributions } = await supabase
      .from("capital_contributions")
      .select("*")
      .eq("capital_season_id", capitalSeasons![0]!.id);
    expect(contributions).toHaveLength(1);
    expect(contributions![0]!.capital_gold_looted).toBe(1200);
    expect(contributions![0]!.attack_limit).toBe(6); // attackLimit + bonusAttackLimit

    const { data: gamesSeasons } = await supabase.from("clan_games_seasons").select("*").eq("clan_id", clanId);
    expect(gamesSeasons).toHaveLength(1);
    expect(gamesSeasons![0]!.end_time).toBeNull();

    const { data: gamesPoints } = await supabase
      .from("clan_games_points")
      .select("*")
      .eq("clan_games_season_id", gamesSeasons![0]!.id);
    expect(gamesPoints).toHaveLength(1);
    // First poll this season: before == after == current value, so 0 points yet.
    expect(gamesPoints![0]!.achievement_value_before).toBe(15000);
    expect(gamesPoints![0]!.points).toBe(0);

    // A second poll later the same month, after the member earned points.
    const playerLater: ClashApiPlayer = { ...player, achievements: [{ name: "Games Champion", value: 18500 }] };
    const fetchImpl = (async (url: string) => {
      const path = new URL(url).pathname;
      const body = path.startsWith("/players/") ? playerLater : path.startsWith("/clans/") && !path.includes("war") ? clan : { items: [] };
      return { ok: true, json: async () => body };
    }) as unknown as typeof fetch;
    const laterClient = new ClashApiClient({ baseUrl: "https://example.test", token: "x", fetchImpl });

    await runClanCollection(laterClient, supabase, { id: clanId, tag: clanTag, name: "x" }, new Date("2026-10-08T13:00:00Z"));

    const { data: gamesPointsAfter } = await supabase
      .from("clan_games_points")
      .select("*")
      .eq("clan_games_season_id", gamesSeasons![0]!.id);
    expect(gamesPointsAfter![0]!.points).toBe(3500);
  });
});
