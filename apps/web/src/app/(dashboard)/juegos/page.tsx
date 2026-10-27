import { NoClanCard } from "@/components/NoClanCard";
import { Card } from "@/components/ui/Card";
import { CLAN_GAMES_TIERS, clanGamesTierProgress } from "@/lib/clan-games-tiers";
import { getClanGamesSeasonPoints, getClanGamesSeasons } from "@/lib/data/clan-games";
import { getClanMembers } from "@/lib/data/members";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { createClient } from "@/lib/supabase/server";
import { JuegosList, type ClanGamesRow } from "./JuegosList";

export const metadata = { title: "Juegos del Clan · ClashLeader" };

export default async function JuegosPage({ searchParams }: { searchParams: Promise<{ temporada?: string }> }) {
  const { temporada } = await searchParams;
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return <NoClanCard />;
  }

  const seasons = await getClanGamesSeasons(supabase, viewerClan.clanId);
  const season = seasons.find((s) => s.seasonId === temporada) ?? seasons[0] ?? null;

  if (!season) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-2xl">Juegos del Clan</h1>
        <Card>
          <p className="text-sm text-text-secondary">Todavía no hay datos de Juegos del Clan registrados.</p>
        </Card>
      </div>
    );
  }

  const [points, members] = await Promise.all([
    getClanGamesSeasonPoints(supabase, season.id),
    getClanMembers(supabase, viewerClan.clanId),
  ]);

  const pointsByTag = new Map(points.map((p) => [p.playerTag, p.points]));
  const currentTags = new Set(members.map((m) => m.playerTag));

  // Temporada abierta: todo el clan actual (quien aún no ha jugado, con 0)
  // más quien sumó puntos y ya se fue. Temporadas pasadas: quien estaba entonces.
  const rows: ClanGamesRow[] = season.isOpen
    ? [
        ...members.map((m) => ({ playerTag: m.playerTag, playerName: m.name, points: pointsByTag.get(m.playerTag) ?? 0, inClan: true })),
        ...points
          .filter((p) => !currentTags.has(p.playerTag) && p.points > 0)
          .map((p) => ({ playerTag: p.playerTag, playerName: p.playerName, points: p.points, inClan: false })),
      ]
    : points.map((p) => ({ playerTag: p.playerTag, playerName: p.playerName, points: p.points, inClan: currentTags.has(p.playerTag) }));

  const totalPoints = rows.reduce((sum, r) => sum + r.points, 0);
  const tiers = clanGamesTierProgress(totalPoints);
  const lastTier = CLAN_GAMES_TIERS[CLAN_GAMES_TIERS.length - 1];
  const participants = rows.filter((r) => r.points > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl">Juegos del Clan</h1>

      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-text-secondary">Puntos del clan</span>
          <span className="font-heading text-2xl">{totalPoints.toLocaleString("es-ES")}</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (100 * totalPoints) / lastTier)}%` }} />
          {CLAN_GAMES_TIERS.slice(0, -1).map((threshold) => (
            <span
              key={threshold}
              className="absolute top-0 h-full w-0.5 bg-bg"
              style={{ left: `${(100 * threshold) / lastTier}%` }}
              aria-hidden
            />
          ))}
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
          <span className="text-text">
            Nivel {tiers.reached} de {CLAN_GAMES_TIERS.length}
          </span>
          <span className="text-text-secondary">
            {tiers.nextTarget != null
              ? `Faltan ${(tiers.nextTarget - totalPoints).toLocaleString("es-ES")} para el nivel ${tiers.reached + 1}`
              : "Todas las recompensas desbloqueadas"}
          </span>
        </div>
        <p className="text-xs text-text-secondary">
          {participants} de {rows.length} han sumado puntos
          {season.isOpen && totalPoints === 0 ? " · los Juegos todavía no han empezado" : ""}
        </p>
      </Card>

      <JuegosList rows={rows} seasons={seasons.map((s) => s.seasonId)} selectedSeason={season.seasonId} />
    </div>
  );
}
