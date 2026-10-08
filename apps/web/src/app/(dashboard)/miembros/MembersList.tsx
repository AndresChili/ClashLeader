"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IndexBadge } from "@/components/IndexBadge";
import { Pill } from "@/components/ui/Pill";
import type { MemberSummary } from "@/lib/data/members";
import type { MemberEvaluation } from "@/lib/member-evaluation";
import { getMemberStatus } from "@/lib/member-status";
import { ROLE_LABELS } from "@/lib/role-labels";

type Chip = "todos" | "expulsar" | "guerra";

const CHIPS: { id: Chip; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "expulsar", label: "A expulsar" },
  { id: "guerra", label: "Para guerra" },
];

export function MembersList({
  members,
  evaluations,
  currentWarTags,
}: {
  members: MemberSummary[];
  evaluations: Map<string, MemberEvaluation>;
  /** Player tags rostered in the in-progress war, or null when there isn't one right now. */
  currentWarTags: Set<string> | null;
}) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>("todos");

  const filtered = useMemo(() => {
    const byQuery = members.filter((member) => member.name.toLowerCase().includes(query.trim().toLowerCase()));

    if (chip === "expulsar") return byQuery.filter((member) => evaluations.get(member.id)?.kick.shouldKick);
    if (chip === "guerra") return currentWarTags ? byQuery.filter((member) => currentWarTags.has(member.playerTag)) : [];
    return byQuery;
  }, [members, query, chip, currentWarTags, evaluations]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        placeholder="Buscar por nombre"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-accent focus:outline-none"
      />

      <div className="flex gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChip(c.id)}
            className={`rounded-full border px-3.5 py-2 text-sm ${
              chip === c.id ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-text"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {chip === "guerra" && !currentWarTags ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-text-secondary">
          No hay guerra en curso registrada todavía.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-text-secondary">
          Nadie coincide con esa búsqueda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((member) => {
            const evaluation = evaluations.get(member.id);
            const status = evaluation ? getMemberStatus(evaluation) : { label: "Sin datos", tone: "info" as const };
            return (
              <li key={member.id}>
                <Link
                  href={`/miembros/${encodeURIComponent(member.playerTag.replace("#", ""))}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <IndexBadge tone={status.tone} value={evaluation?.index.score} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {member.name} · {ROLE_LABELS[member.inGameRole]}
                    </p>
                    <p className="truncate text-xs text-text-secondary">
                      {member.donations ?? "—"} donadas · {member.avgStarsPerAttack ?? "—"} por ataque ·{" "}
                      {member.attackUsagePct ?? "—"}% usados
                    </p>
                  </div>
                  <Pill tone={status.tone}>{status.label}</Pill>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
