import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClashApiClient } from "./clash-api/client";
import { donationActivitySignals, hasDetectableActivity } from "./collect/activity";
import { diffMembership } from "./collect/diff-membership";
import { didSeasonReset, seasonIdForDate } from "./collect/donation-season";
import {
  getCurrentMembers,
  insertNewMember,
  markMembersLeft,
  updateLastActivity,
  updateMemberProfile,
} from "./db/clan-members";
import { upsertDonationSeasonTotal } from "./db/donation-totals";
import { insertMembershipEvents, type MembershipEventInput } from "./db/membership-events";
import { getLatestSnapshots, insertMemberSnapshots, type MemberSnapshotInput } from "./db/snapshots";
import type { RegisteredClan } from "./db/registered-clans";

export interface RunClanResult {
  clanTag: string;
  memberCount: number;
  joined: number;
  left: number;
  activityDetected: number;
}

export async function runClanCollection(
  clashApi: ClashApiClient,
  supabase: SupabaseClient,
  clan: RegisteredClan,
  now: Date = new Date(),
): Promise<RunClanResult> {
  const apiClan = await clashApi.getClan(clan.tag);

  const currentMembers = await getCurrentMembers(supabase, clan.id);
  const currentByTag = new Map(currentMembers.map((member) => [member.playerTag, member]));

  const apiTags = new Set(apiClan.memberList.map((member) => member.tag));
  const { joinedTags, leftTags } = diffMembership(new Set(currentByTag.keys()), apiTags);

  const leftMemberIds = [...leftTags]
    .map((tag) => currentByTag.get(tag)?.id)
    .filter((id): id is string => Boolean(id));
  await markMembersLeft(supabase, leftMemberIds);

  const membershipEvents: MembershipEventInput[] = [];
  for (const tag of leftTags) {
    const member = currentByTag.get(tag);
    if (member) {
      membershipEvents.push({
        clanId: clan.id,
        clanMemberId: member.id,
        playerTag: tag,
        playerName: member.name,
        eventType: "left",
      });
    }
  }

  // clanMemberId for every player present in this poll, whether brand new
  // or already tracked, so the snapshot/activity pass below can use it.
  const clanMemberIdByTag = new Map<string, string>();

  for (const apiMember of apiClan.memberList) {
    const existing = currentByTag.get(apiMember.tag);
    if (existing) {
      clanMemberIdByTag.set(apiMember.tag, existing.id);
      if (existing.name !== apiMember.name || existing.inGameRole !== apiMember.role) {
        await updateMemberProfile(supabase, existing.id, { name: apiMember.name, role: apiMember.role });
      }
      continue;
    }

    const newId = await insertNewMember(supabase, clan.id, {
      tag: apiMember.tag,
      name: apiMember.name,
      role: apiMember.role,
    });
    clanMemberIdByTag.set(apiMember.tag, newId);
    membershipEvents.push({
      clanId: clan.id,
      clanMemberId: newId,
      playerTag: apiMember.tag,
      playerName: apiMember.name,
      eventType: "joined",
    });
  }

  await insertMembershipEvents(supabase, membershipEvents);

  const latestSnapshots = await getLatestSnapshots(supabase, clan.id);

  const snapshotsToInsert: MemberSnapshotInput[] = [];
  let activityDetected = 0;

  for (const apiMember of apiClan.memberList) {
    const clanMemberId = clanMemberIdByTag.get(apiMember.tag);
    if (!clanMemberId) continue; // unreachable, but keeps this loop type-safe

    const previous = latestSnapshots.get(clanMemberId);
    const resetHappened = previous ? didSeasonReset(previous, apiMember) : false;

    if (resetHappened && previous) {
      await upsertDonationSeasonTotal(supabase, {
        clanMemberId,
        seasonId: seasonIdForDate(new Date(previous.collectedAt)),
        donations: previous.donations,
        donationsReceived: previous.donationsReceived,
      });
    }

    const activityBaseline = resetHappened ? { donations: 0, donationsReceived: 0 } : previous;
    const signals = donationActivitySignals(activityBaseline, apiMember);
    if (hasDetectableActivity(signals)) {
      activityDetected += 1;
      await updateLastActivity(supabase, clanMemberId, now);
    }

    snapshotsToInsert.push({
      clanMemberId,
      donations: apiMember.donations,
      donationsReceived: apiMember.donationsReceived,
      expLevel: apiMember.expLevel,
      trophies: apiMember.trophies,
      townHallLevel: apiMember.townHallLevel,
      leagueName: apiMember.league?.name ?? null,
      inGameRole: apiMember.role,
    });
  }

  await insertMemberSnapshots(supabase, snapshotsToInsert);

  return {
    clanTag: clan.tag,
    memberCount: apiClan.memberList.length,
    joined: joinedTags.size,
    left: leftTags.size,
    activityDetected,
  };
}
