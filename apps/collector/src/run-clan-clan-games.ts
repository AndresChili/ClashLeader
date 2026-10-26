import type { SupabaseClient } from "@supabase/supabase-js";
import { CLAN_GAMES_ACHIEVEMENT_NAME, type ClashApiPlayer } from "@clashleader/clash-api";
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

/** players: perfiles ya pedidos por run-clan (ausente = la consulta de ese jugador falló en este ciclo). */
export async function collectClanGames(
  supabase: SupabaseClient,
  clanId: string,
  members: { tag: string; name: string }[],
  players: Map<string, ClashApiPlayer | null>,
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
    const player = players.get(member.tag);
    const achievementValue =
      player?.achievements.find((a) => a.name === CLAN_GAMES_ACHIEVEMENT_NAME)?.value ?? null;
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
