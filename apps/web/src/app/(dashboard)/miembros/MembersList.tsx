"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IndexBadge } from "@/components/IndexBadge";
import { Pill } from "@/components/ui/Pill";
import type { MemberSummary } from "@/lib/data/members";
import type { MemberEvaluation } from "@/lib/member-evaluation";
import { getMemberStatus } from "@/lib/member-status";
import { ROLE_LABELS } from "@/lib/role-labels";

export type MembersChip = "todos" | "colideres" | "veteranos";

const CHIPS: { id: MembersChip; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "colideres", label: "Colíderes" },
  { id: "veteranos", label: "Veteranos" },
];

type SortOrder = "puntuacion-desc" | "puntuacion-asc" | "nombre";

const SORTS: { id: SortOrder; label: string }[] = [
  { id: "puntuacion-desc", label: "Más puntuación" },
  { id: "puntuacion-asc", label: "Menos puntuación" },
  { id: "nombre", label: "Nombre" },
];

export function MembersList({
  members,
  evaluations,
  initialChip = "todos",
}: {
  members: MemberSummary[];
  evaluations: Map<string, MemberEvaluation>;
  /** Chip con el que arranca la lista, para enlazar desde el Panel directamente filtrado. */
  initialChip?: MembersChip;
}) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<MembersChip>(initialChip);
  const [sort, setSort] = useState<SortOrder>("puntuacion-desc");

  const filtered = useMemo(() => {
    const byQuery = members.filter((member) => member.name.toLowerCase().includes(query.trim().toLowerCase()));

    const byChip =
      chip === "colideres"
        ? byQuery.filter((member) => member.inGameRole === "coLeader")
        : chip === "veteranos"
          ? byQuery.filter((member) => member.inGameRole === "admin")
          : byQuery;

    const score = (member: MemberSummary) => evaluations.get(member.id)?.index.score ?? -1;
    return [...byChip].sort((a, b) => {
      if (sort === "nombre") return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      const diff = sort === "puntuacion-desc" ? score(b) - score(a) : score(a) - score(b);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });
  }, [members, query, chip, sort, evaluations]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        placeholder="Buscar por nombre"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="field rounded-xl px-3.5 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-accent focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChip(c.id)}
            className={`rounded-full border px-3.5 py-2 text-sm ${
              chip === c.id ? "border-transparent accent-gradient" : "surface text-text"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <label className="flex items-center justify-between gap-3 text-sm text-text-secondary">
        Ordenar por
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortOrder)}
          className="field rounded-xl px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {filtered.length === 0 ? (
        <p className="surface rounded-xl p-4 text-sm text-text-secondary">
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
                  prefetch={false}
                  className="flex items-center gap-3 surface rounded-2xl p-3"
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
