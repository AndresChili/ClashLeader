import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClashApiClient } from "./clash-api/client";
import { hasNewAttacks } from "./collect/activity";
import { getCapitalAttacksUsedByTag, upsertCapitalContributions, upsertCapitalSeason } from "./db/capital";
import { updateLastActivity } from "./db/clan-members";

/** Only the most recent raid weekend matters for an ongoing poll; older ones never change again once fetched. */
export async function collectCapital(
  clashApi: ClashApiClient,
  supabase: SupabaseClient,
  clanId: string,
  clanTag: string,
  clanMemberIdByTag: Map<string, string>,
  now: Date = new Date(),
): Promise<boolean> {
  const [latestSeason] = await clashApi.getCapitalRaidSeasons(clanTag, 1);
  if (!latestSeason) return false;

  const seasonRowId = await upsertCapitalSeason(supabase, clanId, latestSeason);

  const previousAttacksUsed = await getCapitalAttacksUsedByTag(supabase, seasonRowId);
  await upsertCapitalContributions(supabase, seasonRowId, latestSeason);

  for (const member of latestSeason.members ?? []) {
    if (!hasNewAttacks(previousAttacksUsed.get(member.tag), member.attacks)) continue;
    const clanMemberId = clanMemberIdByTag.get(member.tag);
    if (clanMemberId) await updateLastActivity(supabase, clanMemberId, now);
  }

  return true;
}
