"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { MovementsPage } from "@/lib/data/members";
import { loadMovementsPage } from "./actions";
import { MOVEMENTS_PAGE_SIZE } from "./movements-config";

function daysAgoLabel(at: string, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(at).getTime()) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "hoy";
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

export function Movements({ clanId, initial }: { clanId: string; initial: MovementsPage }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();

  const pageCount = Math.max(1, Math.ceil(data.total / MOVEMENTS_PAGE_SIZE));
  const now = new Date();

  function goTo(next: number) {
    startTransition(async () => {
      const result = await loadMovementsPage(clanId, next);
      setData(result);
      setPage(next);
    });
  }

  if (data.total === 0) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">Sin entradas ni salidas registradas todavía.</p>
      </Card>
    );
  }

  const first = page * MOVEMENTS_PAGE_SIZE + 1;
  const last = page * MOVEMENTS_PAGE_SIZE + data.items.length;

  return (
    <Card className={`flex flex-col divide-y divide-border p-0 transition-opacity ${pending ? "opacity-60" : ""}`}>
      {data.items.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-3 p-4">
          <span className="truncate text-sm">{m.playerName}</span>
          <Pill tone={m.eventType === "joined" ? "good" : "bad"}>
            {m.eventType === "joined" ? "Entró" : "Salió"} {daysAgoLabel(m.detectedAt, now)}
          </Pill>
        </div>
      ))}
      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <button
            type="button"
            aria-label="Movimientos más recientes"
            disabled={page === 0 || pending}
            onClick={() => goTo(page - 1)}
            className="rounded-full p-2 text-text-secondary transition hover:text-text active:scale-90 disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs text-text-secondary">
            {first}–{last} de {data.total}
          </span>
          <button
            type="button"
            aria-label="Movimientos anteriores"
            disabled={page >= pageCount - 1 || pending}
            onClick={() => goTo(page + 1)}
            className="rounded-full p-2 text-text-secondary transition hover:text-text active:scale-90 disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      ) : null}
    </Card>
  );
}
