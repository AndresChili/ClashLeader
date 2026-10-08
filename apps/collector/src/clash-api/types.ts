/**
 * Subset of the official Clash of Clans API response shapes that this
 * phase actually reads, cross-checked against the community-maintained
 * typed wrapper clashofclans.js (clashofclans.js.org/docs/api) since the
 * official developer.clashofclans.com portal has no downloadable schema.
 * Extend as later phases need more fields (war, capital, achievements).
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

export interface ClashApiClan {
  tag: string;
  name: string;
  memberList: ClashApiClanMember[];
}

// ---------------------------------------------------------------------------
// War (regular, friendly and CWL individual wars share this shape)
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
// Clan War League
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
// Clan Capital
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
// Player (only used to read the "Games Champion" achievement)
// ---------------------------------------------------------------------------
export interface ClashApiAchievement {
  name: string;
  value: number;
}

export interface ClashApiPlayer {
  tag: string;
  name: string;
  achievements: ClashApiAchievement[];
}

export const CLAN_GAMES_ACHIEVEMENT_NAME = "Games Champion";
