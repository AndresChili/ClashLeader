/**
 * Populates a realistic fake clan so the web app can be built and tested
 * without a Clash of Clans API key — see "Lo que no puedes hacer tú" in
 * the top-level prompt and SETUP.md. Talks to Supabase directly (the same
 * db/ helpers the real collector uses) and never touches the Clash API.
 *
 * Usage: npm run seed:fixtures --workspace=collector
 * Requires a local Supabase (`npx supabase start`) with migrations and
 * seed.sql applied, since it attaches the fixture clan to the demo leader
 * account created there.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ClanMemberRole, ClashApiCapitalRaidSeason, ClashApiWar, ClashApiWarClan } from "../clash-api/types";
import { upsertCapitalContributions, upsertCapitalSeason } from "../db/capital";
import { insertNewMember } from "../db/clan-members";
import { openClanGamesSeason, upsertClanGamesPoints } from "../db/clan-games";
import { insertMemberSnapshots, type MemberSnapshotInput } from "../db/snapshots";
import { upsertWar, upsertWarAttacks, upsertWarRoster } from "../db/wars";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const DEMO_LEADER_ID = "a0000000-0000-0000-0000-000000000001"; // supabase/seed.sql
const FIXTURE_CLAN_TAG = "#QVCLJ2PY0";

interface FixtureMember {
  tag: string;
  name: string;
  role: ClanMemberRole;
  donations: number;
  donationsReceived: number;
  expLevel: number;
  trophies: number;
  townHallLevel: number;
  daysInClan: number;
  /** Hours since last detected activity — kept recent for most, stale (>kick_inactivity_days) for the two meant to demo "Expulsar". */
  activityHoursAgo: number;
}

const FIXTURE_MEMBERS: FixtureMember[] = [
  { tag: "#P001", name: "Dragon77", role: "coLeader", donations: 1840, donationsReceived: 620, expLevel: 180, trophies: 5200, townHallLevel: 15, daysInClan: 210, activityHoursAgo: 2 },
  { tag: "#P002", name: "Lucia_TH15", role: "admin", donations: 1210, donationsReceived: 540, expLevel: 165, trophies: 4800, townHallLevel: 15, daysInClan: 205, activityHoursAgo: 1 },
  { tag: "#P003", name: "Nerea", role: "coLeader", donations: 960, donationsReceived: 410, expLevel: 150, trophies: 4600, townHallLevel: 14, daysInClan: 150, activityHoursAgo: 3 },
  { tag: "#P004", name: "Marcos", role: "member", donations: 320, donationsReceived: 180, expLevel: 120, trophies: 4100, townHallLevel: 13, daysInClan: 95, activityHoursAgo: 5 },
  { tag: "#P005", name: "Rober_92", role: "member", donations: 0, donationsReceived: 90, expLevel: 110, trophies: 3900, townHallLevel: 13, daysInClan: 60, activityHoursAgo: 4 * 24 },
  { tag: "#P006", name: "xKiller", role: "member", donations: 0, donationsReceived: 40, expLevel: 95, trophies: 3600, townHallLevel: 12, daysInClan: 40, activityHoursAgo: 4 * 24 },
  { tag: "#P007", name: "ElPekas", role: "member", donations: 120, donationsReceived: 60, expLevel: 80, trophies: 3200, townHallLevel: 11, daysInClan: 2, activityHoursAgo: 1 },
  { tag: "#P008", name: "Zarko", role: "member", donations: 450, donationsReceived: 300, expLevel: 140, trophies: 4300, townHallLevel: 14, daysInClan: 130, activityHoursAgo: 6 },
];

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: existing } = await supabase.from("clans").select("id").eq("tag", FIXTURE_CLAN_TAG).maybeSingle();
  if (existing) {
    await supabase.from("clans").delete().eq("id", existing.id);
    console.log("Removed previous fixture clan before reseeding.");
  }

  const { data: clan, error: clanError } = await supabase
    .from("clans")
    .insert({ tag: FIXTURE_CLAN_TAG, name: "Clan Ficticio", created_by: DEMO_LEADER_ID, last_collected_at: new Date().toISOString() })
    .select("id")
    .single();
  if (clanError) throw new Error(`Could not create fixture clan: ${clanError.message}`);

  const { error: accessError } = await supabase
    .from("clan_access")
    .insert({ clan_id: clan.id, user_id: DEMO_LEADER_ID, role: "admin" });
  if (accessError) throw new Error(`Could not grant demo leader access: ${accessError.message}`);

  const snapshots: MemberSnapshotInput[] = [];
  const now = Date.now();
  const clanMemberIdByTag = new Map<string, string>();

  for (const member of FIXTURE_MEMBERS) {
    const clanMemberId = await insertNewMember(supabase, clan.id, member);
    clanMemberIdByTag.set(member.tag, clanMemberId);

    const firstSeenAt = new Date(now - member.daysInClan * 24 * 60 * 60 * 1000).toISOString();
    const lastActivityDetectedAt = new Date(now - member.activityHoursAgo * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await supabase
      .from("clan_members")
      .update({ first_seen_at: firstSeenAt, last_activity_detected_at: lastActivityDetectedAt })
      .eq("id", clanMemberId);
    if (updateError) throw new Error(`Could not backdate ${member.name}: ${updateError.message}`);

    snapshots.push({
      clanMemberId,
      donations: member.donations,
      donationsReceived: member.donationsReceived,
      expLevel: member.expLevel,
      trophies: member.trophies,
      townHallLevel: member.townHallLevel,
      leagueName: null,
      inGameRole: member.role,
    });
  }

  await insertMemberSnapshots(supabase, snapshots);

  await seedWars(supabase, clan.id, clanMemberIdByTag);
  await seedCapital(supabase, clan.id);
  await seedClanGames(supabase, clan.id);

  console.log(`Seeded "Clan Ficticio" (${FIXTURE_CLAN_TAG}) with ${FIXTURE_MEMBERS.length} members for ${DEMO_LEADER_ID}.`);
}

function fixtureWarClan(
  tag: string,
  name: string,
  members: { tag: string; name: string; townHallLevel: number; attacks: { stars: number; destructionPercentage: number }[] }[],
): ClashApiWarClan {
  const allAttacks = members.flatMap((m) => m.attacks);
  return {
    tag,
    name,
    clanLevel: 12,
    attacks: allAttacks.length,
    stars: allAttacks.reduce((sum, a) => sum + a.stars, 0),
    destructionPercentage: allAttacks.length
      ? allAttacks.reduce((sum, a) => sum + a.destructionPercentage, 0) / allAttacks.length
      : 0,
    members: members.map((m, i) => ({
      tag: m.tag,
      name: m.name,
      mapPosition: i + 1,
      townhallLevel: m.townHallLevel,
      opponentAttacks: 0,
      attacks: m.attacks.map((a, order) => ({
        order: order + 1,
        attackerTag: m.tag,
        defenderTag: `#RIVAL${i + 1}`,
        stars: a.stars,
        duration: 90,
        destructionPercentage: a.destructionPercentage,
      })),
    })),
  };
}

/** One in-progress war (for the "En curso" tab) and one finished one (for "Historial"). */
async function seedWars(supabase: SupabaseClient, clanId: string, clanMemberIdByTag: Map<string, string>) {
  const ongoing: ClashApiWar = {
    state: "inWar",
    teamSize: FIXTURE_MEMBERS.length,
    preparationStartTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 5 * 60 * 60 * 1000 + 12 * 60 * 1000).toISOString(),
    clan: fixtureWarClan(FIXTURE_CLAN_TAG, "Clan Ficticio", [
      { tag: "#P001", name: "Dragon77", townHallLevel: 15, attacks: [{ stars: 3, destructionPercentage: 100 }] },
      { tag: "#P002", name: "Lucia_TH15", townHallLevel: 15, attacks: [{ stars: 2, destructionPercentage: 85 }] },
      { tag: "#P003", name: "Nerea", townHallLevel: 14, attacks: [{ stars: 3, destructionPercentage: 95 }] },
      { tag: "#P004", name: "Marcos", townHallLevel: 13, attacks: [] },
      { tag: "#P005", name: "Rober_92", townHallLevel: 13, attacks: [] },
      { tag: "#P006", name: "xKiller", townHallLevel: 12, attacks: [] },
      { tag: "#P007", name: "ElPekas", townHallLevel: 11, attacks: [] },
      { tag: "#P008", name: "Zarko", townHallLevel: 14, attacks: [{ stars: 2, destructionPercentage: 70 }] },
    ]),
    opponent: { tag: "#RIVAL", name: "Clan Rival", clanLevel: 11, attacks: 0, stars: 0, destructionPercentage: 0, members: [] },
  };

  const ongoingId = await upsertWar(supabase, {
    clanId,
    war: ongoing,
    ours: ongoing.clan,
    theirs: ongoing.opponent,
    warType: "random",
    warTag: null,
    cwlGroupId: null,
  });
  await upsertWarRoster(supabase, ongoingId, ongoing.clan, clanMemberIdByTag);
  await upsertWarAttacks(supabase, ongoingId, ongoing.clan);

  const finished: ClashApiWar = {
    state: "warEnded",
    teamSize: FIXTURE_MEMBERS.length,
    preparationStartTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    clan: fixtureWarClan(FIXTURE_CLAN_TAG, "Clan Ficticio", [
      { tag: "#P001", name: "Dragon77", townHallLevel: 15, attacks: [{ stars: 3, destructionPercentage: 100 }, { stars: 3, destructionPercentage: 100 }] },
      { tag: "#P002", name: "Lucia_TH15", townHallLevel: 15, attacks: [{ stars: 3, destructionPercentage: 97 }, { stars: 2, destructionPercentage: 80 }] },
      { tag: "#P003", name: "Nerea", townHallLevel: 14, attacks: [{ stars: 2, destructionPercentage: 88 }, { stars: 2, destructionPercentage: 90 }] },
      { tag: "#P004", name: "Marcos", townHallLevel: 13, attacks: [{ stars: 1, destructionPercentage: 45 }] },
      { tag: "#P008", name: "Zarko", townHallLevel: 14, attacks: [{ stars: 2, destructionPercentage: 75 }, { stars: 1, destructionPercentage: 50 }] },
    ]),
    opponent: { tag: "#RIVAL2", name: "Otro Rival", clanLevel: 11, attacks: 7, stars: 20, destructionPercentage: 72, members: [] },
  };

  const finishedId = await upsertWar(supabase, {
    clanId,
    war: finished,
    ours: finished.clan,
    theirs: finished.opponent,
    warType: "random",
    warTag: null,
    cwlGroupId: null,
  });
  await upsertWarRoster(supabase, finishedId, finished.clan, clanMemberIdByTag);
  await upsertWarAttacks(supabase, finishedId, finished.clan);
}

async function seedCapital(supabase: SupabaseClient, clanId: string) {
  const season: ClashApiCapitalRaidSeason = {
    state: "ended",
    startTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    capitalTotalLoot: 215000,
    totalAttacks: 30,
    members: FIXTURE_MEMBERS.slice(0, 6).map((m, i) => ({
      tag: m.tag,
      name: m.name,
      attacks: 6 - i,
      attackLimit: 5,
      bonusAttackLimit: 1,
      capitalResourcesLooted: 8000 - i * 900,
    })),
  };

  const seasonRowId = await upsertCapitalSeason(supabase, clanId, season);
  await upsertCapitalContributions(supabase, seasonRowId, season);
}

async function seedClanGames(supabase: SupabaseClient, clanId: string) {
  const seasonId = new Date().toISOString().slice(0, 7); // same scheme as seasonIdForDate()
  const seasonRowId = await openClanGamesSeason(supabase, clanId, seasonId, new Date());

  await upsertClanGamesPoints(
    supabase,
    seasonRowId,
    FIXTURE_MEMBERS.slice(0, 5).map((m, i) => ({
      playerTag: m.tag,
      playerName: m.name,
      achievementValueBefore: 42000,
      achievementValueAfter: 42000 + (3500 - i * 500),
      points: 3500 - i * 500,
    })),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
