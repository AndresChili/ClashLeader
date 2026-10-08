"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { WarSummary } from "@/lib/data/wars";
import { formatRemainingTime, formatScore } from "@/lib/format-war";

type Tab = "en-curso" | "historial" | "liga";

const TABS: { id: Tab; label: string }[] = [
  { id: "en-curso", label: "En curso" },
  { id: "historial", label: "Historial" },
  { id: "liga", label: "Liga" },
];

export interface PendingAttack {
  playerTag: string;
  playerName: string;
  attacksUsed: number;
  attacksAllowed: number;
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
  pendingAttacks,
  lineup,
  history,
  cwlGroup,
}: {
  currentWar: WarSummary | null;
  pendingAttacks: PendingAttack[];
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
        <EnCurso currentWar={currentWar} pendingAttacks={pendingAttacks} lineup={lineup} />
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
  pendingAttacks,
  lineup,
}: {
  currentWar: WarSummary | null;
  pendingAttacks: PendingAttack[];
  lineup: LineupEntry[];
}) {
  if (!currentWar) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No hay guerra en curso registrada todavía.</p>
      </Card>
    );
  }

  const remaining = formatRemainingTime(currentWar.endTime);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Guerra {currentWar.teamSize} contra {currentWar.teamSize}</span>
          {remaining ? <Pill tone="warn">{remaining}</Pill> : null}
        </div>
        <p className="font-heading text-xl">{formatScore(currentWar.clanStars, currentWar.opponentStars)}</p>
      </Card>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm text-text-secondary">Ataques pendientes</h2>
          <span className="text-sm text-text-secondary">{pendingAttacks.length}</span>
        </div>
        {pendingAttacks.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">Todos han usado sus ataques.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendingAttacks.map((p) => (
              <li key={p.playerTag} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
                <span className="text-sm text-text">{p.playerName}</span>
                <span className="text-sm text-text-secondary">
                  Le quedan {p.attacksAllowed - p.attacksUsed} de {p.attacksAllowed}
                </span>
              </li>
            ))}
          </ul>
        )}
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
            <p className="text-xs text-text-secondary">{formatScore(war.clanStars, war.opponentStars)}</p>
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
            <p className="text-xs text-text-secondary">{formatScore(war.clanStars, war.opponentStars)}</p>
          </div>
          <Pill tone={war.state === "warEnded" ? (war.result === "win" ? "good" : war.result === "tie" ? "info" : "bad") : "warn"}>
            {war.state === "warEnded" ? (war.result === "win" ? "Victoria" : war.result === "tie" ? "Empate" : "Derrota") : "En curso"}
          </Pill>
        </div>
      ))}
    </div>
  );
}
