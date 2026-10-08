import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClashApiClient } from "./clash-api/client";
import { CLAN_GAMES_ACHIEVEMENT_NAME } from "./clash-api/types";
import { computeClanGamesPoints, shouldOpenNewSeason } from "./collect/clan-games";
import { seasonIdForDate } from "./collect/donation-season";
import {
  closeClanGamesSeason,
  getExistingPointRows,
  getOpenClanGamesSeason,
  openClanGamesSeason,
  upsertClanGamesPoints,
  type ClanGamesPointInput,
} from "./db/clan-games";

export async function collectClanGames(
  clashApi: ClashApiClient,
  supabase: SupabaseClient,
  clanId: string,
  members: { tag: string; name: string }[],
  now: Date = new Date(),
): Promise<number> {
  const currentSeasonId = seasonIdForDate(now);
  let open = await getOpenClanGamesSeason(supabase, clanId);

  if (open && shouldOpenNewSeason(open.seasonId, currentSeasonId)) {
    await closeClanGamesSeason(supabase, open.id, now);
    open = null;
  }

  const seasonRowId = open?.id ?? (await openClanGamesSeason(supabase, clanId, currentSeasonId, now));
  const baselines = open ? await getExistingPointRows(supabase, seasonRowId) : new Map<string, number>();

  const rows: ClanGamesPointInput[] = [];

  for (const member of members) {
    let achievementValue: number | null = null;
    try {
      const player = await clashApi.getPlayer(member.tag);
      achievementValue = player?.achievements.find((a) => a.name === CLAN_GAMES_ACHIEVEMENT_NAME)?.value ?? null;
    } catch {
      // One player's lookup failing (rate limit, transient error) shouldn't
      // drop the rest of the clan's clan games tracking for this poll.
      continue;
    }
    if (achievementValue === null) continue;

    const before = baselines.get(member.tag) ?? achievementValue;
    rows.push({
      playerTag: member.tag,
      playerName: member.name,
      achievementValueBefore: before,
      achievementValueAfter: achievementValue,
      points: computeClanGamesPoints(before, achievementValue),
    });
  }

  await upsertClanGamesPoints(supabase, seasonRowId, rows);
  return rows.length;
}
