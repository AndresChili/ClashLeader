import { NoClanCard } from "@/components/NoClanCard";
import { Card } from "@/components/ui/Card";
import { getAllClanGamesPoints, getClanGamesSeasons } from "@/lib/data/clan-games";
import { getCurrentMemberIdentities } from "@/lib/data/members";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { createClient } from "@/lib/supabase/server";
import { CLAN_GAMES_TOTAL_VIEW, formatClanGamesSeason } from "@/lib/clan-games";
import { JuegosView, type ClanGamesRow } from "./JuegosView";

export const metadata = { title: "Juegos del Clan · ClashLeader" };

export default async function JuegosPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return <NoClanCard />;
  }

  const [allSeasons, points, members] = await Promise.all([
    getClanGamesSeasons(supabase, viewerClan.clanId),
    getAllClanGamesPoints(supabase, viewerClan.clanId),
    getCurrentMemberIdentities(supabase, viewerClan.clanId),
  ]);

  const seasons = allSeasons.filter((s) => !s.excluded);
  const excludedSeasons = allSeasons.filter((s) => s.excluded);

  if (seasons.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-2xl">Juegos del Clan</h1>
        <Card className="flex flex-col gap-2">
          <p className="text-sm text-text">Todavía no hay Juegos del Clan que cuenten.</p>
          {excludedSeasons.length > 0 ? (
            <p className="text-sm text-text-secondary">
              Los de {excludedSeasons.map((s) => formatClanGamesSeason(s.seasonId)).join(", ")} no cuentan para nadie: la app empezó a
              seguir el clan con los Juegos ya empezados y no pudo ver los puntos de quien jugó antes. Se contarán desde los próximos Juegos.
            </p>
          ) : null}
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

  // Si la primera temporada registrada cuenta, empezó a seguirse cuando la
  // app se puso a seguir el clan, quizá con los Juegos ya empezados.
  const firstSeason = excludedSeasons.length === 0 ? seasons[seasons.length - 1] : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl">Juegos del Clan</h1>
      <JuegosView
        views={views}
        seasons={seasons.map((s) => s.seasonId)}
        firstSeason={firstSeason?.seasonId ?? null}
        trackingStartedAt={firstSeason?.startTime ?? null}
      />
    </div>
  );
}
