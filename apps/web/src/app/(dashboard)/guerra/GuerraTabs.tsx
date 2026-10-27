"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pill, toneClasses, type PillTone } from "@/components/ui/Pill";
import type { WarSummary } from "@/lib/data/wars";
import { WarScore } from "@/components/WarScore";
import { warPhase } from "@/lib/format-war";

type Tab = "en-curso" | "historial" | "liga";

const TABS: { id: Tab; label: string }[] = [
  { id: "en-curso", label: "En curso" },
  { id: "historial", label: "Historial" },
  { id: "liga", label: "Liga" },
];

export interface RosterAttack {
  playerTag: string;
  playerName: string;
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

export interface LineupEntry {
  playerTag: string;
  playerName: string;
  usagePct: number | null;
  avgStars: number | null;
  inCurrentWar: boolean;
}

export function GuerraTabs({
  currentWar,
  rosterAttacks,
  lineup,
  history,
  cwlGroup,
}: {
  currentWar: WarSummary | null;
  rosterAttacks: RosterAttack[];
  lineup: LineupEntry[];
  history: WarSummary[];
  cwlGroup: { season: string; state: string; wars: WarSummary[] } | null;
}) {
  const [tab, setTab] = useState<Tab>("en-curso");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 rounded-xl bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              tab === t.id ? "bg-accent text-accent-foreground" : "text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "en-curso" ? (
        <EnCurso currentWar={currentWar} rosterAttacks={rosterAttacks} lineup={lineup} />
      ) : tab === "historial" ? (
        <Historial wars={history} />
      ) : (
        <Liga group={cwlGroup} />
      )}
    </div>
  );
}

function EnCurso({
  currentWar,
  rosterAttacks,
  lineup,
}: {
  currentWar: WarSummary | null;
  rosterAttacks: RosterAttack[];
  lineup: LineupEntry[];
}) {
  if (!currentWar) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No hay guerra en curso registrada todavía.</p>
      </Card>
    );
  }

  const phase = warPhase(currentWar);
  const pendingCount = rosterAttacks.filter((p) => p.attacksUsed < p.attacksAllowed).length;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Guerra {currentWar.teamSize} contra {currentWar.teamSize}</span>
          <Pill tone={phase.label === "Preparación" ? "info" : "warn"}>{phase.label}</Pill>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <WarScore className="font-heading text-xl" clanStars={currentWar.clanStars} opponentStars={currentWar.opponentStars} />
          {phase.countdown ? <span className="text-sm text-text-secondary">{phase.countdown}</span> : null}
        </div>
      </Card>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm text-text-secondary">Ataques pendientes</h2>
          <span className="text-sm text-text-secondary">{pendingCount}</span>
        </div>
        <ul className="flex flex-col gap-2">
          {rosterAttacks.map((p) => (
            <li key={p.playerTag} className={`flex items-center justify-between rounded-2xl p-3 ${toneClasses[attackTone(p)]}`}>
              <span className="text-sm font-medium">{p.playerName}</span>
              <span className="text-sm">
                {attackLabel(p)} · {p.attacksUsed}/{p.attacksAllowed}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm text-text-secondary">Alineación recomendada</h2>
          <span className="text-xs text-text-secondary">Para {currentWar.teamSize} contra {currentWar.teamSize}</span>
        </div>
        <ul className="flex flex-col gap-2">
          {lineup.slice(0, 5).map((entry, i) => (
            <li key={entry.playerTag} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <span className="w-5 shrink-0 text-sm text-text-secondary">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text">{entry.playerName}</p>
                <p className="text-xs text-text-secondary">
                  Usa el {entry.usagePct ?? "—"}% · {entry.avgStars ?? "—"} por ataque
                </p>
              </div>
              <Pill tone={entry.inCurrentWar ? "good" : "info"}>{entry.inCurrentWar ? "Dentro" : "Fuera"}</Pill>
            </li>
          ))}
        </ul>
      </div>
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
        <li key={war.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
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
        <div key={war.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
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
