import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClashApiClient } from "./clash-api/client";
import type { ClashApiWar } from "./clash-api/types";
import { hasNewAttacks } from "./collect/activity";
import { resolveWarSides } from "./collect/war-sides";
import { updateLastActivity } from "./db/clan-members";
import {
  findWarStateByTag,
  getAttacksUsedByTag,
  upsertCwlGroup,
  upsertWar,
  upsertWarAttacks,
  upsertWarRoster,
} from "./db/wars";

async function persistWar(
  supabase: SupabaseClient,
  clanId: string,
  clanTag: string,
  war: ClashApiWar,
  opts: { warType: "random" | "cwl"; warTag: string | null; cwlGroupId: string | null },
  clanMemberIdByTag: Map<string, string>,
  now: Date,
): Promise<void> {
  const sides = resolveWarSides(war, clanTag);
  if (!sides) return; // defensive: API returned a war that doesn't involve this clan

  const warId = await upsertWar(supabase, { clanId, war, ...sides, ...opts });

  const previousAttacksUsed = await getAttacksUsedByTag(supabase, warId);
  await upsertWarRoster(supabase, warId, sides.ours, clanMemberIdByTag);
  await upsertWarAttacks(supabase, warId, sides.ours);

  for (const member of sides.ours.members) {
    const newCount = member.attacks?.length ?? 0;
    if (!hasNewAttacks(previousAttacksUsed.get(member.tag), newCount)) continue;
    const clanMemberId = clanMemberIdByTag.get(member.tag);
    if (clanMemberId) await updateLastActivity(supabase, clanMemberId, now);
  }
}

export async function collectCurrentWar(
  clashApi: ClashApiClient,
  supabase: SupabaseClient,
  clanId: string,
  clanTag: string,
  clanMemberIdByTag: Map<string, string>,
  now: Date = new Date(),
): Promise<string | null> {
  const war = await clashApi.getCurrentWar(clanTag);
  if (!war || war.state === "notInWar") return null;

  await persistWar(supabase, clanId, clanTag, war, { warType: "random", warTag: null, cwlGroupId: null }, clanMemberIdByTag, now);
  return war.state;
}

export async function collectClanWarLeague(
  clashApi: ClashApiClient,
  supabase: SupabaseClient,
  clanId: string,
  clanTag: string,
  clanMemberIdByTag: Map<string, string>,
  now: Date = new Date(),
): Promise<number> {
  const group = await clashApi.getWarLeagueGroup(clanTag);
  if (!group || group.state === "notInWar") return 0;

  const cwlGroupId = await upsertCwlGroup(supabase, clanId, group.season, group.state);

  const warTags = group.rounds.flatMap((round) => round.warTags).filter((tag) => tag !== "#0");

  let updated = 0;
  for (const warTag of warTags) {
    // Once a war is final, nothing about it changes — skip re-fetching it
    // every 15 minutes for the rest of the season.
    const existingState = await findWarStateByTag(supabase, clanId, warTag);
    if (existingState === "warEnded") continue;

    const war = await clashApi.getCwlWar(warTag);
    if (!war) continue;

    await persistWar(supabase, clanId, clanTag, war, { warType: "cwl", warTag, cwlGroupId }, clanMemberIdByTag, now);
    updated += 1;
  }

  return updated;
}
