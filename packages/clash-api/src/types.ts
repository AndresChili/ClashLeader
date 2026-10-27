/**
 * Subconjunto de las formas de respuesta de la API oficial de Clash of
 * Clans que lee esta app, contrastado contra el wrapper tipado comunitario
 * clashofclans.js (clashofclans.js.org/docs/api — fuente en
 * github.com/clashperk/clashofclans.js) porque el portal oficial
 * developer.clashofclans.com no tiene un esquema descargable.
 * ClashApiVerifyTokenResult está confirmado directamente contra el código
 * fuente de ese wrapper (src/rest/RestManager.ts, src/types/api.ts), no
 * solo su documentación, porque el registro de clanes depende de que esto
 * esté bien.
 */

export type ClanMemberRole = "member" | "admin" | "coLeader" | "leader";

export interface ClashApiLeague {
  id: number;
  name: string;
}

export interface ClashApiClanMember {
  tag: string;
  name: string;
  role: ClanMemberRole;
  expLevel: number;
  townHallLevel: number;
  league?: ClashApiLeague;
  trophies: number;
  clanRank: number;
  previousClanRank: number;
  donations: number;
  donationsReceived: number;
}

export interface ClashApiBadgeUrls {
  small: string;
  medium: string;
  large: string;
}

export interface ClashApiClan {
  tag: string;
  name: string;
  badgeUrls?: ClashApiBadgeUrls;
  memberList: ClashApiClanMember[];
}

// ---------------------------------------------------------------------------
// Guerra (guerras normales, amistosas e individuales de CWL comparten esta forma)
// ---------------------------------------------------------------------------
export type WarState = "notInWar" | "preparation" | "inWar" | "warEnded";

export interface ClashApiWarAttack {
  order: number;
  attackerTag: string;
  defenderTag: string;
  stars: number;
  duration: number;
  destructionPercentage: number;
}

export interface ClashApiWarMember {
  tag: string;
  name: string;
  mapPosition: number;
  townhallLevel: number;
  opponentAttacks: number;
  bestOpponentAttack?: ClashApiWarAttack;
  attacks?: ClashApiWarAttack[];
}

export interface ClashApiWarClan {
  tag: string;
  name: string;
  clanLevel: number;
  attacks: number;
  stars: number;
  destructionPercentage: number;
  members: ClashApiWarMember[];
}

export interface ClashApiWar {
  state: WarState;
  teamSize: number;
  startTime: string | null;
  preparationStartTime: string | null;
  endTime: string | null;
  clan: ClashApiWarClan;
  opponent: ClashApiWarClan;
}

// ---------------------------------------------------------------------------
// Liga de Clanes (CWL)
// ---------------------------------------------------------------------------
export type CwlState = "notInWar" | "preparation" | "inWar" | "ended";

export interface ClashApiCwlRound {
  warTags: string[];
}

export interface ClashApiCwlGroup {
  state: CwlState;
  season: string;
  rounds: ClashApiCwlRound[];
}

// ---------------------------------------------------------------------------
// Capital del clan
// ---------------------------------------------------------------------------
export interface ClashApiCapitalRaidSeasonMember {
  tag: string;
  name: string;
  attacks: number;
  attackLimit: number;
  bonusAttackLimit: number;
  capitalResourcesLooted: number;
}

export interface ClashApiCapitalRaidSeason {
  state: string;
  startTime: string;
  endTime: string;
  capitalTotalLoot: number;
  totalAttacks: number;
  members?: ClashApiCapitalRaidSeasonMember[];
}

// ---------------------------------------------------------------------------
// Jugador (logros para actividad y Juegos del Clan, y oro aportado a la capital)
// ---------------------------------------------------------------------------
export interface ClashApiAchievement {
  name: string;
  value: number;
}

export interface ClashApiPlayer {
  tag: string;
  name: string;
  achievements: ClashApiAchievement[];
  /** Total de por vida de oro aportado a capitales de clan (de cualquier clan). */
  clanCapitalContributions?: number;
}

export const CLAN_GAMES_ACHIEVEMENT_NAME = "Games Champion";

// ---------------------------------------------------------------------------
// Verificación del token del jugador (alta de clan, fase 6)
// ---------------------------------------------------------------------------
export interface ClashApiVerifyTokenResult {
  tag: string;
  token: string;
  status: "ok" | "invalid";
}
