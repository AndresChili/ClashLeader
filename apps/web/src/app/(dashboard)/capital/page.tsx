import Link from "next/link";
import { NoClanCard } from "@/components/NoClanCard";
import { Card } from "@/components/ui/Card";
import { getLatestCapitalWeekend, getMemberCapitalStats } from "@/lib/data/capital";
import { getClanMembers } from "@/lib/data/members";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { createClient } from "@/lib/supabase/server";
import { CapitalList, type CapitalRow } from "./CapitalList";

export const metadata = { title: "Capital del Clan · ClashLeader" };

type Period = "semana" | "mes" | "total";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default async function CapitalPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { periodo } = await searchParams;
  const period: Period = periodo === "mes" || periodo === "total" ? periodo : "semana";

  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return <NoClanCard />;
  }

  const now = new Date();
  const latestWeekend = await getLatestCapitalWeekend(supabase, viewerClan.clanId);
  const weekendOngoing = latestWeekend?.endTime != null && Date.parse(latestWeekend.endTime) > now.getTime();

  const since =
    period === "semana"
      ? latestWeekend
        ? new Date(latestWeekend.startTime)
        : now
      : period === "mes"
        ? new Date(now.getTime() - 30 * MS_PER_DAY)
        : null;

  const [members, { byMemberId, contributionsTrackedSince }] = await Promise.all([
    getClanMembers(supabase, viewerClan.clanId),
    getMemberCapitalStats(supabase, viewerClan.clanId, since),
  ]);

  const rows: CapitalRow[] = members.map((m) => {
    const stats = byMemberId.get(m.id);
    return {
      playerTag: m.playerTag,
      playerName: m.name,
      weekends: stats?.weekends ?? 0,
      attacksUsed: stats?.attacksUsed ?? 0,
      attacksAvailable: stats?.attacksAvailable ?? 0,
      goldLooted: stats?.goldLooted ?? 0,
      goldContributed: stats?.goldContributed ?? null,
    };
  });

  const totalAttacksUsed = rows.reduce((sum, r) => sum + r.attacksUsed, 0);
  const totalAttacksAvailable = rows.reduce((sum, r) => sum + r.attacksAvailable, 0);
  const totalLooted = rows.reduce((sum, r) => sum + r.goldLooted, 0);
  const totalContributed = rows.reduce((sum, r) => sum + (r.goldContributed ?? 0), 0);
  const withoutAttacks = rows.filter((r) => r.attacksAvailable > 0 && r.attacksUsed === 0).length;

  const periods: { id: Period; label: string }[] = [
    { id: "semana", label: weekendOngoing ? "Este fin de semana" : "Último fin de semana" },
    { id: "mes", label: "Último mes" },
    { id: "total", label: "Total" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl">Capital del Clan</h1>

      <div className="flex flex-wrap gap-2">
        {periods.map((p) => (
          <Link
            key={p.id}
            href={p.id === "semana" ? "/capital" : `/capital?periodo=${p.id}`}
            className={`rounded-full border px-3.5 py-2 text-sm ${
              period === p.id ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-text"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <Card className="flex flex-col gap-3">
        {period === "semana" && latestWeekend ? (
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
            <span className="font-heading text-xl">{totalLooted.toLocaleString("es-ES")}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-secondary">Oro aportado</span>
            <span className="font-heading text-xl">{totalContributed.toLocaleString("es-ES")}</span>
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

      {latestWeekend ? (
        <CapitalList rows={rows} />
      ) : (
        <Card>
          <p className="text-sm text-text-secondary">Todavía no hay fines de semana de asalto registrados.</p>
        </Card>
      )}
    </div>
  );
}
