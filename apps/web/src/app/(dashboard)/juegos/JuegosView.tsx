"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { CLAN_GAMES_PLAYER_MAX, CLAN_GAMES_TOTAL_VIEW as TOTAL_VIEW, formatClanGamesSeason } from "@/lib/clan-games";

export interface ClanGamesRow {
  playerTag: string;
  playerName: string;
  points: number;
  /** false = ya no está en el clan. */
  inClan: boolean;
}

type SortOrder = "puntos-desc" | "puntos-asc" | "nombre";

const SORTS: { id: SortOrder; label: string }[] = [
  { id: "puntos-desc", label: "Más puntos" },
  { id: "puntos-asc", label: "Menos puntos" },
  { id: "nombre", label: "Nombre" },
];

/** Verde: llegó al máximo; amarillo: ha jugado algo; rojo: nada. */
function pointsTone(points: number): PillTone {
  if (points >= CLAN_GAMES_PLAYER_MAX) return "good";
  return points > 0 ? "warn" : "bad";
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

/** Todas las temporadas y el total llegan ya calculados: cambiar de una a otra no vuelve al servidor. */
export function JuegosView({
  views,
  seasons,
  firstSeason,
  trackingStartedAt,
}: {
  views: Record<string, ClanGamesRow[]>;
  /** De la más reciente a la más antigua. */
  seasons: string[];
  /** Primera temporada, si empezó a seguirse a medias; null si no hay aviso que dar. */
  firstSeason: string | null;
  trackingStartedAt: string | null;
}) {
  const [view, setView] = useState(seasons[0]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("puntos-desc");

  const rows = useMemo(() => views[view] ?? [], [views, view]);
  const isTotal = view === TOTAL_VIEW;

  const filtered = useMemo(() => {
    const byQuery = rows.filter((r) => r.playerName.toLowerCase().includes(query.trim().toLowerCase()));
    return [...byQuery].sort((a, b) => {
      if (sort === "nombre") return a.playerName.localeCompare(b.playerName, "es", { sensitivity: "base" });
      const diff = sort === "puntos-desc" ? b.points - a.points : a.points - b.points;
      return diff !== 0 ? diff : a.playerName.localeCompare(b.playerName, "es", { sensitivity: "base" });
    });
  }, [rows, query, sort]);

  const totalPoints = rows.reduce((sum, r) => sum + r.points, 0);
  const participants = rows.filter((r) => r.points > 0).length;
  const atMax = rows.filter((r) => r.points >= CLAN_GAMES_PLAYER_MAX).length;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center justify-between gap-3 text-sm text-text-secondary">
        Mes
        <select
          value={view}
          onChange={(event) => setView(event.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        >
          {seasons.map((s) => (
            <option key={s} value={s}>
              {formatClanGamesSeason(s)}
            </option>
          ))}
          <option value={TOTAL_VIEW}>Total de todos los meses</option>
        </select>
      </label>

      <Card className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-text-secondary">Puntos del clan</span>
          <span className="font-heading text-2xl">{totalPoints.toLocaleString("es-ES")}</span>
        </div>
        <p className="text-xs text-text-secondary">
          {participants} de {rows.length} han sumado puntos
          {isTotal ? "" : ` · ${atMax} al máximo (${CLAN_GAMES_PLAYER_MAX.toLocaleString("es-ES")})`}
        </p>
        {firstSeason && (isTotal || view === firstSeason) && trackingStartedAt ? (
          <p className="text-xs text-text-secondary">
            Se cuentan desde el {formatDay(trackingStartedAt)}, cuando la app empezó a seguir el clan: lo que se hizo antes no se pudo
            registrar.
          </p>
        ) : null}
      </Card>

      <input
        type="search"
        placeholder="Buscar por nombre"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-accent focus:outline-none"
      />

      <label className="flex items-center justify-between gap-3 text-sm text-text-secondary">
        Ordenar por
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortOrder)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-text-secondary">Nadie coincide con esa búsqueda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r) => {
            const content = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {r.playerName}
                    {r.inClan ? null : <span className="font-normal text-text-secondary"> · ya no está</span>}
                  </p>
                  {isTotal ? null : (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.min(100, (100 * r.points) / CLAN_GAMES_PLAYER_MAX)}%` }}
                      />
                    </div>
                  )}
                </div>
                {isTotal ? (
                  <span className="font-heading text-lg text-text">{r.points.toLocaleString("es-ES")}</span>
                ) : (
                  <Pill tone={pointsTone(r.points)}>{r.points.toLocaleString("es-ES")}</Pill>
                )}
              </>
            );
            return (
              <li key={r.playerTag}>
                {r.inClan ? (
                  <Link
                    href={`/miembros/${encodeURIComponent(r.playerTag.replace("#", ""))}`}
                    prefetch={false}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 opacity-70">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
