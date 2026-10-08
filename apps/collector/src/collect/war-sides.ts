import type { ClashApiWar, ClashApiWarClan } from "../clash-api/types";

export interface ResolvedWarSides {
  ours: ClashApiWarClan;
  theirs: ClashApiWarClan;
}

/**
 * /clans/{tag}/currentwar always puts the requested clan in `war.clan`,
 * but /clanwarleagues/wars/{warTag} (used for every CWL war, since each
 * round's two clans both hit the same war object) makes no such promise —
 * either side can be `war.clan`. Always resolving by tag, instead of
 * assuming `war.clan` is "us", keeps both call sites correct.
 */
export function resolveWarSides(war: ClashApiWar, ourClanTag: string): ResolvedWarSides | null {
  if (war.clan.tag === ourClanTag) {
    return { ours: war.clan, theirs: war.opponent };
  }
  if (war.opponent.tag === ourClanTag) {
    return { ours: war.opponent, theirs: war.clan };
  }
  return null;
}
