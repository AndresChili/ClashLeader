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
