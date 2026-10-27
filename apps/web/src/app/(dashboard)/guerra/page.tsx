import { NoClanCard } from "@/components/NoClanCard";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { getCwlGroup, getWarHistory } from "@/lib/data/wars";
import { attacksAllowedFor } from "@/lib/format-war";
import { getClanEvaluations } from "@/lib/get-clan-evaluations";
import { createClient } from "@/lib/supabase/server";
import type { LineupCandidate } from "@/lib/war-lineup";
import { GuerraTabs, type RosterAttack } from "./GuerraTabs";

export const metadata = { title: "Guerra · ClashLeader" };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default async function GuerraPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return <NoClanCard />;
  }

  const now = new Date();
  const [{ rules, members, evaluations, currentWar, recentWarByMemberId, missedLastWarIds }, history, cwlGroup] = await Promise.all([
    getClanEvaluations(supabase, viewerClan.clanId, now),
    getWarHistory(supabase, viewerClan.clanId),
    getCwlGroup(supabase, viewerClan.clanId),
  ]);

  const rosterAttacks: RosterAttack[] = currentWar
    ? currentWar.members.map((m) => ({
        playerTag: m.playerTag,
        playerName: m.playerName,
        mapPosition: m.mapPosition,
        townHallLevel: m.townHallLevel,
        attacksUsed: m.attacksUsed,
        attacksAllowed: attacksAllowedFor(currentWar.warType),
      }))
    : [];

  const lineupCandidates: LineupCandidate[] = members.map((member) => {
    const recent = recentWarByMemberId.get(member.id);
    const lastSeen = member.lastActivityDetectedAt ?? member.manualJoinDate ?? member.firstSeenAt;
    return {
      id: member.id,
      playerTag: member.playerTag,
      name: member.name,
      townHallLevel: member.townHallLevel,
      recentUsagePct: recent && recent.warsCounted > 0 && recent.usagePct != null ? Number(recent.usagePct) : null,
      recentAvgStars: recent?.avgStars != null ? Number(recent.avgStars) : null,
      recentWars: recent?.warsCounted ?? 0,
      daysSinceActivity: (now.getTime() - new Date(lastSeen).getTime()) / MS_PER_DAY,
      missedLastWar: missedLastWarIds.has(member.id),
      flaggedForKick: evaluations.get(member.id)?.kick.shouldKick ?? false,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl">Guerra</h1>
      <GuerraTabs
        currentWar={currentWar}
        rosterAttacks={rosterAttacks}
        lineupCandidates={lineupCandidates}
        kickInactivityDays={rules.kickInactivityDays}
        history={history}
        cwlGroup={cwlGroup}
      />
    </div>
  );
}
