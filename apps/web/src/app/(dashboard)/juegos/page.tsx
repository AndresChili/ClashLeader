import { NoClanCard } from "@/components/NoClanCard";
import { Card } from "@/components/ui/Card";
import { getAllClanGamesPoints, getClanGamesSeasons } from "@/lib/data/clan-games";
import { getCurrentMemberIdentities } from "@/lib/data/members";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { createClient } from "@/lib/supabase/server";
import { CLAN_GAMES_TOTAL_VIEW } from "@/lib/clan-games";
import { JuegosView, type ClanGamesRow } from "./JuegosView";

export const metadata = { title: "Juegos del Clan · ClashLeader" };

export default async function JuegosPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return <NoClanCard />;
  }

  const [seasons, points, members] = await Promise.all([
    getClanGamesSeasons(supabase, viewerClan.clanId),
    getAllClanGamesPoints(supabase, viewerClan.clanId),
    getCurrentMemberIdentities(supabase, viewerClan.clanId),
  ]);

  if (seasons.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-2xl">Juegos del Clan</h1>
        <Card>
          <p className="text-sm text-text-secondary">Todavía no hay datos de Juegos del Clan registrados.</p>
        </Card>
      </div>
    );
  }

  const currentTags = new Set(members.map((m) => m.playerTag));

  // Todo el clan actual (quien no ha jugado, con 0) más quien sumó puntos y ya se fue.
  function withCurrentMembers(pointsByTag: Map<string, { name: string; points: number }>): ClanGamesRow[] {
    return [
      ...members.map((m) => ({ playerTag: m.playerTag, playerName: m.name, points: pointsByTag.get(m.playerTag)?.points ?? 0, inClan: true })),
      ...[...pointsByTag]
        .filter(([tag, p]) => !currentTags.has(tag) && p.points > 0)
        .map(([tag, p]) => ({ playerTag: tag, playerName: p.name, points: p.points, inClan: false })),
    ];
  }

  const views: Record<string, ClanGamesRow[]> = {};
  for (const season of seasons) {
    const seasonPoints = points.filter((p) => p.seasonId === season.seasonId);
    // Temporada abierta: el clan de ahora. Pasadas: quien estaba entonces.
    views[season.seasonId] = season.isOpen
      ? withCurrentMembers(new Map(seasonPoints.map((p) => [p.playerTag, { name: p.playerName, points: p.points }])))
      : seasonPoints.map((p) => ({ playerTag: p.playerTag, playerName: p.playerName, points: p.points, inClan: currentTags.has(p.playerTag) }));
  }

  const totalByTag = new Map<string, { name: string; points: number }>();
  for (const p of points) {
    const entry = totalByTag.get(p.playerTag);
    totalByTag.set(p.playerTag, { name: entry?.name ?? p.playerName, points: (entry?.points ?? 0) + p.points });
  }
  views[CLAN_GAMES_TOTAL_VIEW] = withCurrentMembers(totalByTag);

  // La primera temporada empezó a contarse cuando la app se puso a seguir el
  // clan, quizá con los Juegos ya empezados: lo de antes no se pudo ver.
  const firstSeason = seasons[seasons.length - 1];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl">Juegos del Clan</h1>
      <JuegosView
        views={views}
        seasons={seasons.map((s) => s.seasonId)}
        firstSeason={firstSeason.seasonId}
        trackingStartedAt={firstSeason.startTime}
      />
    </div>
  );
}
