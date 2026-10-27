import { NoClanCard } from "@/components/NoClanCard";
import { Card } from "@/components/ui/Card";
import { getLatestCapitalWeekend, getMemberCapitalStats, type MemberCapitalStats } from "@/lib/data/capital";
import { getCurrentMemberIdentities, type MemberIdentity } from "@/lib/data/members";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { createClient } from "@/lib/supabase/server";
import { CapitalView, type CapitalPeriod, type CapitalRow } from "./CapitalView";

export const metadata = { title: "Capital del Clan · ClashLeader" };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toRows(members: MemberIdentity[], byMemberId: Map<string, MemberCapitalStats>): CapitalRow[] {
  return members.map((m) => {
    const stats = byMemberId.get(m.id);
    return {
      playerTag: m.playerTag,
      playerName: m.name,
      weekends: stats?.weekends ?? 0,
      attacksUsed: stats?.attacksUsed ?? 0,
      attacksAvailable: stats?.attacksAvailable ?? 0,
      goldLooted: stats?.goldLooted ?? 0,
      goldContributed: stats?.goldContributed ?? null,
    };
  });
}

export default async function CapitalPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return <NoClanCard />;
  }

  const now = new Date();
  const latestWeekend = await getLatestCapitalWeekend(supabase, viewerClan.clanId);

  if (!latestWeekend) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-2xl">Capital del Clan</h1>
        <Card>
          <p className="text-sm text-text-secondary">Todavía no hay fines de semana de asalto registrados.</p>
        </Card>
      </div>
    );
  }

  // Los tres periodos de una vez: cambiar de uno a otro no vuelve al servidor.
  const [members, weekend, month, total] = await Promise.all([
    getCurrentMemberIdentities(supabase, viewerClan.clanId),
    getMemberCapitalStats(supabase, viewerClan.clanId, new Date(latestWeekend.startTime)),
    getMemberCapitalStats(supabase, viewerClan.clanId, new Date(now.getTime() - 30 * MS_PER_DAY)),
    getMemberCapitalStats(supabase, viewerClan.clanId, null),
  ]);

  const periods: Record<CapitalPeriod, CapitalRow[]> = {
    semana: toRows(members, weekend.byMemberId),
    mes: toRows(members, month.byMemberId),
    total: toRows(members, total.byMemberId),
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl">Capital del Clan</h1>
      <CapitalView
        periods={periods}
        latestWeekend={latestWeekend}
        weekendOngoing={latestWeekend.endTime != null && Date.parse(latestWeekend.endTime) > now.getTime()}
        contributionsTrackedSince={total.contributionsTrackedSince}
      />
    </div>
  );
}
