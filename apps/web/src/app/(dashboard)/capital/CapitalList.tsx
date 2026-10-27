"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pill, type PillTone } from "@/components/ui/Pill";

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

type Chip = "todos" | "completos" | "a-medias" | "sin-atacar";

const CHIPS: { id: Chip; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "completos", label: "Todos los ataques" },
  { id: "a-medias", label: "A medias" },
  { id: "sin-atacar", label: "Sin atacar" },
];

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

export function CapitalList({ rows }: { rows: CapitalRow[] }) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>("todos");
  const [sort, setSort] = useState<SortOrder>("saqueado");

  const filtered = useMemo(() => {
    const byQuery = rows.filter((r) => r.playerName.toLowerCase().includes(query.trim().toLowerCase()));
    const byChip = byQuery.filter((r) => {
      const tone = attacksTone(r);
      if (chip === "completos") return tone === "good";
      if (chip === "a-medias") return tone === "warn";
      if (chip === "sin-atacar") return tone === "bad";
      return true;
    });
    return [...byChip].sort((a, b) => {
      if (sort === "nombre") return a.playerName.localeCompare(b.playerName, "es", { sensitivity: "base" });
      const diff = sortValue(b, sort) - sortValue(a, sort);
      return diff !== 0 ? diff : a.playerName.localeCompare(b.playerName, "es", { sensitivity: "base" });
    });
  }, [rows, query, chip, sort]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        placeholder="Buscar por nombre"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-accent focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
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
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-text-secondary">Nadie coincide con ese filtro.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r) => (
            <li key={r.playerTag}>
              <Link
                href={`/miembros/${encodeURIComponent(r.playerTag.replace("#", ""))}`}
                prefetch={false}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{r.playerName}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {r.goldLooted.toLocaleString("es-ES")} saqueado ·{" "}
                    {r.goldContributed != null ? r.goldContributed.toLocaleString("es-ES") : "—"} aportado
                    {r.weekends > 1 ? ` · ${r.weekends} fines de semana` : ""}
                  </p>
                </div>
                <Pill tone={attacksTone(r)}>
                  {r.attacksAvailable > 0 ? `${r.attacksUsed}/${r.attacksAvailable}` : "No estaba"}
                </Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
