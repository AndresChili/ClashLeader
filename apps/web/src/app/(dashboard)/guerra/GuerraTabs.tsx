"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pill, toneClasses, type PillTone } from "@/components/ui/Pill";
import type { WarSummary } from "@/lib/data/wars";
import { WarAttacksProgress } from "@/components/WarAttacksProgress";
import { WarScore } from "@/components/WarScore";
import { warPhase } from "@/lib/format-war";
import { useUrlState } from "@/lib/use-url-state";
import { recommendLineup, WAR_SIZES, type LineupCandidate, type LineupPick } from "@/lib/war-lineup";

type Tab = "en-curso" | "alineacion" | "historial" | "liga";

const TABS: { id: Tab; label: string }[] = [
  { id: "en-curso", label: "En curso" },
  { id: "alineacion", label: "Alineación" },
  { id: "historial", label: "Historial" },
  { id: "liga", label: "Liga" },
];

export interface RosterAttack {
  playerTag: string;
  playerName: string;
  mapPosition: number;
  townHallLevel: number | null;
  attacksUsed: number;
  attacksAllowed: number;
}

/** Verde: ya hizo todos; amarillo: le falta alguno; rojo: no ha atacado. */
function attackTone(p: RosterAttack): PillTone {
  if (p.attacksUsed >= p.attacksAllowed) return "good";
  return p.attacksUsed > 0 ? "warn" : "bad";
}

function attackLabel(p: RosterAttack): string {
  const left = p.attacksAllowed - p.attacksUsed;
  if (left <= 0) return "Hecho";
  return left === 1 ? "Le queda 1" : `Le quedan ${left}`;
}

export function GuerraTabs({
  currentWar,
  rosterAttacks,
  lineupCandidates,
  kickInactivityDays,
  history,
  cwlGroup,
}: {
  currentWar: WarSummary | null;
  rosterAttacks: RosterAttack[];
  lineupCandidates: LineupCandidate[];
  kickInactivityDays: number;
  history: WarSummary[];
  cwlGroup: { season: string; state: string; wars: WarSummary[] } | null;
}) {
  const [tab, setTab] = useUrlState<Tab>("pestana", "en-curso", TABS.map((t) => t.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 surface rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              tab === t.id ? "accent-gradient" : "text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "en-curso" ? (
        <EnCurso currentWar={currentWar} rosterAttacks={rosterAttacks} />
      ) : tab === "alineacion" ? (
        <Alineacion
          candidates={lineupCandidates}
          kickInactivityDays={kickInactivityDays}
          defaultSize={currentWar?.teamSize ?? 15}
          currentWarTags={currentWar?.members.map((m) => m.playerTag) ?? []}
        />
      ) : tab === "historial" ? (
        <Historial wars={history} />
      ) : (
        <Liga group={cwlGroup} />
      )}
    </div>
  );
}

function EnCurso({ currentWar, rosterAttacks }: { currentWar: WarSummary | null; rosterAttacks: RosterAttack[] }) {
  if (!currentWar) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No hay guerra en curso registrada todavía.</p>
      </Card>
    );
  }

  const phase = warPhase(currentWar);
  const used = rosterAttacks.reduce((sum, p) => sum + p.attacksUsed, 0);
  const available = rosterAttacks.reduce((sum, p) => sum + p.attacksAllowed, 0);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Guerra {currentWar.teamSize} contra {currentWar.teamSize}</span>
          <Pill tone={phase.label === "Preparación" ? "info" : "warn"}>{phase.label}</Pill>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <WarScore className="font-heading text-xl" clanStars={currentWar.clanStars} opponentStars={currentWar.opponentStars} />
          {phase.countdown ? <span className="text-sm text-text-secondary">{phase.countdown}</span> : null}
        </div>
        <WarAttacksProgress used={used} available={available} />
      </Card>

      <ul className="flex flex-col gap-2">
        {rosterAttacks.map((p) => (
          <li key={p.playerTag} className={`tone-ring flex items-center justify-between rounded-2xl p-3 ${toneClasses[attackTone(p)]}`}>
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="w-5 shrink-0 text-right text-sm opacity-70">{p.mapPosition}</span>
              <span className="truncate text-sm font-medium">{p.playerName}</span>
              {p.townHallLevel ? <span className="shrink-0 text-xs opacity-70">TH{p.townHallLevel}</span> : null}
            </span>
            <span className="shrink-0 text-sm">
              {attackLabel(p)} · {p.attacksUsed}/{p.attacksAllowed}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Verde: muy fiable; amarillo: aceptable; rojo: arriesgado. */
function scoreTone(score: number): PillTone {
  if (score >= 75) return "good";
  return score >= 50 ? "warn" : "bad";
}

function PickRow({ pick, position, inCurrentWar }: { pick: LineupPick; position: number | null; inCurrentWar: boolean }) {
  return (
    <li>
      <Link
        href={`/miembros/${encodeURIComponent(pick.playerTag.replace("#", ""))}`}
        prefetch={false}
        className="flex items-center gap-3 surface rounded-2xl p-3"
      >
        {position != null ? <span className="w-6 shrink-0 text-sm text-text-secondary">{position}</span> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">
            {pick.name}
            {pick.townHallLevel ? <span className="font-normal text-text-secondary"> · TH{pick.townHallLevel}</span> : null}
            {inCurrentWar ? <span className="font-normal text-text-secondary"> · en la guerra actual</span> : null}
          </p>
          <p className="truncate text-xs text-text-secondary">
            {pick.recentUsagePct != null ? `Usa el ${Math.round(pick.recentUsagePct)} %` : "Sin guerras"}
            {pick.recentAvgStars != null ? ` · ${pick.recentAvgStars.toFixed(1)} ★ por ataque` : ""}
            {pick.recentWars > 0 ? ` · ${pick.recentWars} ${pick.recentWars === 1 ? "guerra" : "guerras"}` : ""}
          </p>
          {pick.notes.length > 0 ? <p className="truncate text-xs text-status-warn-text">{pick.notes.join(" · ")}</p> : null}
        </div>
        <Pill tone={scoreTone(pick.score)}>{pick.score}</Pill>
      </Link>
    </li>
  );
}

function Alineacion({
  candidates,
  kickInactivityDays,
  defaultSize,
  currentWarTags,
}: {
  candidates: LineupCandidate[];
  kickInactivityDays: number;
  defaultSize: number;
  currentWarTags: string[];
}) {
  const fallbackSize = String(WAR_SIZES.some((n) => n === defaultSize) ? defaultSize : 15);
  const [sizeParam, setSizeParam] = useUrlState("tamano", fallbackSize, WAR_SIZES.map(String));
  const size = Number(sizeParam);
  const [showOut, setShowOut] = useState(false);
  const result = useMemo(() => recommendLineup(candidates, size, kickInactivityDays), [candidates, size, kickInactivityDays]);
  const inWar = new Set(currentWarTags);

  const thCounts = new Map<number, number>();
  for (const p of result.recommended) {
    if (p.townHallLevel) thCounts.set(p.townHallLevel, (thCounts.get(p.townHallLevel) ?? 0) + 1);
  }
  const avgScore =
    result.recommended.length > 0 ? Math.round(result.recommended.reduce((sum, p) => sum + p.score, 0) / result.recommended.length) : 0;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center justify-between gap-3 text-sm text-text-secondary">
        Participantes
        <select
          value={size}
          onChange={(event) => setSizeParam(event.target.value)}
          className="field rounded-xl px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        >
          {WAR_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} contra {n}
            </option>
          ))}
        </select>
      </label>

      <Card className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-text-secondary">Nota media de guerra</span>
          <span className="font-heading text-2xl">{avgScore}</span>
        </div>
        {thCounts.size > 0 ? (
          <p className="text-xs text-text-secondary">
            {[...thCounts]
              .sort((a, b) => b[0] - a[0])
              .map(([th, n]) => `${n}× TH${th}`)
              .join(" · ")}
          </p>
        ) : null}
        {result.shortBy > 0 ? (
          <p className="text-xs text-status-bad-text">
            Faltan {result.shortBy} para llenar {size} contra {size} con jugadores activos.
          </p>
        ) : null}
        <p className="text-xs text-text-secondary">
          La nota (0–100) junta el % de ataques que usa en sus últimas 10 guerras, las estrellas por ataque y su actividad
          reciente, y resta si no atacó en la última guerra o está marcado para expulsar. Entran las mejores notas, ordenadas por
          ayuntamiento para el mapa. Quien lleva más de {kickInactivityDays} días sin actividad queda fuera.
        </p>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-text-secondary">Recomendados · orden para el mapa</h2>
        <ul className="flex flex-col gap-2">
          {result.recommended.map((p, i) => (
            <PickRow key={p.id} pick={p} position={i + 1} inCurrentWar={inWar.has(p.playerTag)} />
          ))}
        </ul>
      </section>

      {result.reserves.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-text-secondary">Reservas, por si falla alguien</h2>
          <ul className="flex flex-col gap-2">
            {result.reserves.map((p) => (
              <PickRow key={p.id} pick={p} position={null} inCurrentWar={inWar.has(p.playerTag)} />
            ))}
          </ul>
        </section>
      ) : null}

      {result.out.length > 0 ? (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowOut((v) => !v)}
            className="flex items-center justify-between text-sm text-text-secondary"
          >
            <span>Fuera ({result.out.length})</span>
            <span className="text-accent">{showOut ? "Ocultar" : "Ver"}</span>
          </button>
          {showOut ? (
            <ul className="flex flex-col gap-2">
              {result.out.map((p) => (
                <PickRow key={p.id} pick={p} position={null} inCurrentWar={inWar.has(p.playerTag)} />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Historial({ wars }: { wars: WarSummary[] }) {
  if (wars.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">Todavía no hay guerras terminadas registradas.</p>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {wars.map((war) => (
        <li key={war.id} className="flex items-center justify-between surface rounded-2xl p-3">
          <div>
            <p className="text-sm text-text">vs. {war.opponentName ?? "—"}</p>
            <WarScore className="text-xs" clanStars={war.clanStars} opponentStars={war.opponentStars} />
          </div>
          <Pill tone={war.result === "win" ? "good" : war.result === "tie" ? "info" : "bad"}>
            {war.result === "win" ? "Victoria" : war.result === "tie" ? "Empate" : "Derrota"}
          </Pill>
        </li>
      ))}
    </ul>
  );
}

function Liga({ group }: { group: { season: string; state: string; wars: WarSummary[] } | null }) {
  if (!group) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">El clan no está en liga de clanes esta temporada.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-secondary">Temporada {group.season}</p>
      {group.wars.map((war) => (
        <div key={war.id} className="flex items-center justify-between surface rounded-2xl p-3">
          <div>
            <p className="text-sm text-text">vs. {war.opponentName ?? "—"}</p>
            <WarScore className="text-xs" clanStars={war.clanStars} opponentStars={war.opponentStars} />
          </div>
          <Pill tone={war.state === "warEnded" ? (war.result === "win" ? "good" : war.result === "tie" ? "info" : "bad") : "warn"}>
            {war.state === "warEnded" ? (war.result === "win" ? "Victoria" : war.result === "tie" ? "Empate" : "Derrota") : "En curso"}
          </Pill>
        </div>
      ))}
    </div>
  );
}
