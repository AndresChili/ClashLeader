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
import { createClient } from "@supabase/supabase-js";
import type { ClanMemberRole } from "../clash-api/types";
import { insertNewMember } from "../db/clan-members";
import { insertMemberSnapshots, type MemberSnapshotInput } from "../db/snapshots";

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
}

const FIXTURE_MEMBERS: FixtureMember[] = [
  { tag: "#P001", name: "Dragon77", role: "coLeader", donations: 1840, donationsReceived: 620, expLevel: 180, trophies: 5200, townHallLevel: 15, daysInClan: 210 },
  { tag: "#P002", name: "Lucia_TH15", role: "admin", donations: 1210, donationsReceived: 540, expLevel: 165, trophies: 4800, townHallLevel: 15, daysInClan: 205 },
  { tag: "#P003", name: "Nerea", role: "coLeader", donations: 960, donationsReceived: 410, expLevel: 150, trophies: 4600, townHallLevel: 14, daysInClan: 150 },
  { tag: "#P004", name: "Marcos", role: "member", donations: 320, donationsReceived: 180, expLevel: 120, trophies: 4100, townHallLevel: 13, daysInClan: 95 },
  { tag: "#P005", name: "Rober_92", role: "member", donations: 0, donationsReceived: 90, expLevel: 110, trophies: 3900, townHallLevel: 13, daysInClan: 60 },
  { tag: "#P006", name: "xKiller", role: "member", donations: 0, donationsReceived: 40, expLevel: 95, trophies: 3600, townHallLevel: 12, daysInClan: 40 },
  { tag: "#P007", name: "ElPekas", role: "member", donations: 120, donationsReceived: 60, expLevel: 80, trophies: 3200, townHallLevel: 11, daysInClan: 2 },
  { tag: "#P008", name: "Zarko", role: "member", donations: 450, donationsReceived: 300, expLevel: 140, trophies: 4300, townHallLevel: 14, daysInClan: 130 },
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

  for (const member of FIXTURE_MEMBERS) {
    const clanMemberId = await insertNewMember(supabase, clan.id, member);

    const firstSeenAt = new Date(now - member.daysInClan * 24 * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await supabase
      .from("clan_members")
      .update({ first_seen_at: firstSeenAt })
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

  console.log(`Seeded "Clan Ficticio" (${FIXTURE_CLAN_TAG}) with ${FIXTURE_MEMBERS.length} members for ${DEMO_LEADER_ID}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
