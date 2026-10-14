import type { ClashApiWar, ClashApiWarClan } from "@clashleader/clash-api";

export interface ResolvedWarSides {
  ours: ClashApiWarClan;
  theirs: ClashApiWarClan;
}

/**
 * /clans/{tag}/currentwar siempre pone al clan consultado en `war.clan`,
 * pero /clanwarleagues/wars/{warTag} (se usa en toda guerra de CWL, ya que
 * los dos clanes de cada ronda comparten el mismo objeto de guerra) no
 * promete eso — cualquiera de los dos lados puede ser `war.clan`. Resolver
 * siempre por tag, en vez de asumir que `war.clan` somos "nosotros",
 * mantiene correctos los dos puntos de llamada.
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
