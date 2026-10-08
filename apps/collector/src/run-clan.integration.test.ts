import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ClashApiClient } from "./clash-api/client";
import type { ClashApiClan } from "./clash-api/types";
import { runClanCollection } from "./run-clan";

// Runs against `npx supabase start`. These are the Supabase CLI's public
// local-dev defaults (printed by every `supabase start`), never valid
// against a hosted project, so hardcoding them here is safe.
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const DEMO_LEADER_ID = "a0000000-0000-0000-0000-000000000001"; // from supabase/seed.sql

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function fakeClient(clan: ClashApiClan): ClashApiClient {
  const fetchImpl = (async () => ({ ok: true, json: async () => clan })) as unknown as typeof fetch;
  return new ClashApiClient({ baseUrl: "https://example.test", token: "x", fetchImpl });
}

describe("runClanCollection (integration, requires `npx supabase start`)", () => {
  let clanId: string;
  const clanTag = "#QVCLJ2PYG";

  beforeAll(async () => {
    const { data, error } = await supabase
      .from("clans")
      .insert({ tag: clanTag, name: "Clan Integración", created_by: DEMO_LEADER_ID })
      .select("id")
      .single();
    if (error) throw error;
    clanId = data.id as string;
  });

  afterAll(async () => {
    if (clanId) {
      await supabase.from("clans").delete().eq("id", clanId);
    }
  });

  it("tracks a join, a season reset, and a leave across two polls", async () => {
    const pollOne: ClashApiClan = {
      tag: clanTag,
      name: "Clan Integración",
      memberList: [
        {
          tag: "#P1",
          name: "Marcos",
          role: "member",
          expLevel: 50,
          townHallLevel: 12,
          trophies: 3000,
          clanRank: 1,
          previousClanRank: 1,
          donations: 100,
          donationsReceived: 20,
        },
        {
          tag: "#P2",
          name: "Ana",
          role: "member",
          expLevel: 40,
          townHallLevel: 10,
          trophies: 2000,
          clanRank: 2,
          previousClanRank: 2,
          donations: 0,
          donationsReceived: 0,
        },
      ],
    };

    const resultOne = await runClanCollection(fakeClient(pollOne), supabase, { id: clanId, tag: clanTag, name: "x" });
    expect(resultOne.joined).toBe(2);
    expect(resultOne.left).toBe(0);

    const { data: membersAfterPollOne } = await supabase
      .from("clan_members")
      .select("id, player_tag, is_current")
      .eq("clan_id", clanId);
    expect(membersAfterPollOne).toHaveLength(2);

    // Poll two, 15 minutes later: P1 donated then the season reset
    // (100 -> 10, a drop), P2 left, P3 joined.
    const pollTwo: ClashApiClan = {
      tag: clanTag,
      name: "Clan Integración",
      memberList: [
        {
          tag: "#P1",
          name: "Marcos",
          role: "member",
          expLevel: 50,
          townHallLevel: 12,
          trophies: 3010,
          clanRank: 1,
          previousClanRank: 1,
          donations: 10,
          donationsReceived: 5,
        },
        {
          tag: "#P3",
          name: "Nerea",
          role: "member",
          expLevel: 35,
          townHallLevel: 9,
          trophies: 1500,
          clanRank: 2,
          previousClanRank: 3,
          donations: 50,
          donationsReceived: 0,
        },
      ],
    };

    const resultTwo = await runClanCollection(fakeClient(pollTwo), supabase, { id: clanId, tag: clanTag, name: "x" });
    expect(resultTwo.joined).toBe(1);
    expect(resultTwo.left).toBe(1);

    const { data: membersAfterPollTwo } = await supabase
      .from("clan_members")
      .select("id, player_tag, is_current, left_at, last_activity_detected_at")
      .eq("clan_id", clanId)
      .order("player_tag");
    expect(membersAfterPollTwo).toHaveLength(3);

    const p1 = membersAfterPollTwo!.find((m) => m.player_tag === "#P1")!;
    const p2 = membersAfterPollTwo!.find((m) => m.player_tag === "#P2")!;
    const p3 = membersAfterPollTwo!.find((m) => m.player_tag === "#P3")!;

    expect(p1.is_current).toBe(true);
    expect(p1.last_activity_detected_at).not.toBeNull(); // donations changed (reset counts as activity)

    expect(p2.is_current).toBe(false);
    expect(p2.left_at).not.toBeNull();

    expect(p3.is_current).toBe(true);
    expect(p3.last_activity_detected_at).toBeNull(); // no prior snapshot to compare against yet

    const { data: seasonTotals } = await supabase
      .from("donation_season_totals")
      .select("donations, donations_received")
      .eq("clan_member_id", p1.id);
    expect(seasonTotals).toHaveLength(1);
    expect(seasonTotals![0]!.donations).toBe(100); // the pre-reset value, not the post-reset 10

    const { data: events } = await supabase
      .from("membership_events")
      .select("player_tag, event_type")
      .eq("clan_id", clanId)
      .order("detected_at");
    expect(events).toEqual([
      { player_tag: "#P1", event_type: "joined" },
      { player_tag: "#P2", event_type: "joined" },
      { player_tag: "#P2", event_type: "left" },
      { player_tag: "#P3", event_type: "joined" },
    ]);

    const { count: snapshotCount } = await supabase
      .from("member_snapshots")
      .select("id", { count: "exact", head: true })
      .in("clan_member_id", [p1.id, p2.id, p3.id]);
    expect(snapshotCount).toBe(4); // 2 members in poll one + 2 in poll two
  });
});
