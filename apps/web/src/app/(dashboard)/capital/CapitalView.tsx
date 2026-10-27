"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pill, type PillTone } from "@/components/ui/Pill";

export type CapitalPeriod = "semana" | "mes" | "total";

export interface CapitalRow {
  playerTag: string;
  playerName: string;
  /** Fines de semana de asalto del periodo en los que estaba en el clan. */
  weekends: number;
  attacksUsed: number;
  attacksAvailable: number;
  goldLooted: number;
  /** null = todavía no hay datos de oro aportado para este miembro. */
  goldContributed: number | null;
}

type SortOrder = "saqueado" | "aportado" | "ataques" | "nombre";

const SORTS: { id: SortOrder; label: string }[] = [
  { id: "saqueado", label: "Oro saqueado" },
  { id: "aportado", label: "Oro aportado" },
  { id: "ataques", label: "Ataques" },
  { id: "nombre", label: "Nombre" },
];

/** Verde: usó todos sus ataques; amarillo: alguno; rojo: ninguno. Sin fines de semana en el periodo, neutro. */
function attacksTone(r: CapitalRow): PillTone {
  if (r.attacksAvailable === 0) return "info";
  if (r.attacksUsed >= r.attacksAvailable) return "good";
  return r.attacksUsed > 0 ? "warn" : "bad";
}

function sortValue(r: CapitalRow, sort: SortOrder): number {
  if (sort === "saqueado") return r.goldLooted;
  if (sort === "aportado") return r.goldContributed ?? -1;
  return r.attacksUsed;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

/** Los tres periodos llegan ya calculados: cambiar de uno a otro no vuelve al servidor. */
export function CapitalView({
  periods,
  latestWeekend,
  weekendOngoing,
  contributionsTrackedSince,
}: {
  periods: Record<CapitalPeriod, CapitalRow[]>;
  latestWeekend: { startTime: string; endTime: string | null };
  weekendOngoing: boolean;
  contributionsTrackedSince: string | null;
}) {
  const [period, setPeriod] = useState<CapitalPeriod>("semana");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("saqueado");

  const rows = periods[period];

  const filtered = useMemo(() => {
    const byQuery = rows.filter((r) => r.playerName.toLowerCase().includes(query.trim().toLowerCase()));
    return [...byQuery].sort((a, b) => {
      if (sort === "nombre") return a.playerName.localeCompare(b.playerName, "es", { sensitivity: "base" });
      const diff = sortValue(b, sort) - sortValue(a, sort);
      return diff !== 0 ? diff : a.playerName.localeCompare(b.playerName, "es", { sensitivity: "base" });
    });
  }, [rows, query, sort]);

  const totalAttacksUsed = rows.reduce((sum, r) => sum + r.attacksUsed, 0);
  const totalAttacksAvailable = rows.reduce((sum, r) => sum + r.attacksAvailable, 0);
  const totalLooted = rows.reduce((sum, r) => sum + r.goldLooted, 0);
  const totalContributed = rows.reduce((sum, r) => sum + (r.goldContributed ?? 0), 0);
  const withoutAttacks = rows.filter((r) => r.attacksAvailable > 0 && r.attacksUsed === 0).length;

  const periodOptions: { id: CapitalPeriod; label: string }[] = [
    { id: "semana", label: weekendOngoing ? "Este fin de semana" : "Último fin de semana" },
    { id: "mes", label: "Último mes" },
    { id: "total", label: "Total" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 rounded-xl bg-card p-1">
        {periodOptions.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              period === p.id ? "bg-accent text-accent-foreground" : "text-text-secondary"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Card className="flex flex-col gap-3">
        {period === "semana" ? (
          <span className="text-sm text-text-secondary">
            Asaltos del {formatDay(latestWeekend.startTime)}
            {latestWeekend.endTime ? ` al ${formatDay(latestWeekend.endTime)}` : ""}
            {weekendOngoing ? " · en curso" : ""}
          </span>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-text-secondary">Ataques realizados</span>
            <span className="font-medium text-text">
              {totalAttacksUsed}/{totalAttacksAvailable}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${totalAttacksAvailable > 0 ? (100 * totalAttacksUsed) / totalAttacksAvailable : 0}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-secondary">Oro saqueado</span>
            <span className="font-heading text-2xl">{totalLooted.toLocaleString("es-ES")}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-secondary">Oro aportado</span>
            <span className="font-heading text-2xl">{totalContributed.toLocaleString("es-ES")}</span>
          </div>
        </div>
        {withoutAttacks > 0 ? (
          <p className="text-xs text-status-bad-text">
            {withoutAttacks} {withoutAttacks === 1 ? "miembro no ha atacado" : "miembros no han atacado"} en este periodo
          </p>
        ) : null}
        <p className="text-xs text-text-secondary">
          {contributionsTrackedSince
            ? `El oro aportado se registra desde el ${formatDay(contributionsTrackedSince)}.`
            : "El oro aportado empezará a registrarse en la próxima recogida de datos."}
        </p>
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
          {filtered.map((r) => (
            <li key={r.playerTag}>
              <Link
                href={`/miembros/${encodeURIComponent(r.playerTag.replace("#", ""))}`}
                prefetch={false}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate text-sm font-medium text-text">{r.playerName}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Pill tone={attacksTone(r)}>
                      {r.attacksAvailable > 0 ? `${r.attacksUsed}/${r.attacksAvailable} ataques` : "No estaba"}
                    </Pill>
                    <span className="text-xs text-text-secondary">
                      {r.goldContributed != null ? r.goldContributed.toLocaleString("es-ES") : "—"} aportado
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="font-heading text-xl text-text">{r.goldLooted.toLocaleString("es-ES")}</span>
                  <span className="text-xs text-text-secondary">saqueado</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
