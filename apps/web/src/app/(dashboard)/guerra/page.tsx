import { Card } from "@/components/ui/Card";
import { getKickInactivityDays } from "@/lib/data/clan-rules";
import { getClanMembers } from "@/lib/data/members";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { getCurrentWar, getCwlGroup, getMemberReliability, getWarHistory } from "@/lib/data/wars";
import { attacksAllowedFor } from "@/lib/format-war";
import { createClient } from "@/lib/supabase/server";
import { GuerraTabs, type LineupEntry, type PendingAttack } from "./GuerraTabs";

export const metadata = { title: "Guerra · ClashLeader" };

export default async function GuerraPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">Todavía no tienes un clan. La alta de clanes llega en la fase 6.</p>
      </Card>
    );
  }

  const kickInactivityDays = await getKickInactivityDays(supabase, viewerClan.clanId);
  const [currentWar, history, cwlGroup, members, reliability] = await Promise.all([
    getCurrentWar(supabase, viewerClan.clanId),
    getWarHistory(supabase, viewerClan.clanId),
    getCwlGroup(supabase, viewerClan.clanId),
    getClanMembers(supabase, viewerClan.clanId, kickInactivityDays),
    getMemberReliability(supabase, viewerClan.clanId),
  ]);

  const pendingAttacks: PendingAttack[] = currentWar
    ? currentWar.members
        .map((m) => ({
          playerTag: m.playerTag,
          playerName: m.playerName,
          attacksUsed: m.attacksUsed,
          attacksAllowed: attacksAllowedFor(currentWar.warType),
        }))
        .filter((p) => p.attacksUsed < p.attacksAllowed)
    : [];

  const currentWarTags = currentWar ? new Set(currentWar.members.map((m) => m.playerTag)) : new Set<string>();

  const lineup: LineupEntry[] = members
    .map((member) => {
      const r = reliability.get(member.id);
      return {
        playerTag: member.playerTag,
        playerName: member.name,
        usagePct: r?.usagePct ?? null,
        avgStars: r?.avgStars ?? null,
        inCurrentWar: currentWarTags.has(member.playerTag),
      };
    })
    .sort((a, b) => (b.usagePct ?? -1) - (a.usagePct ?? -1) || (b.avgStars ?? -1) - (a.avgStars ?? -1));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl">Guerra</h1>
      <GuerraTabs currentWar={currentWar} pendingAttacks={pendingAttacks} lineup={lineup} history={history} cwlGroup={cwlGroup} />
    </div>
  );
}
