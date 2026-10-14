import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ProgressBar";
import { NoClanCard } from "@/components/NoClanCard";
import { getLatestCapitalSeason } from "@/lib/data/capital";
import { getRecentExits } from "@/lib/data/members";
import { getPromotionDecisions } from "@/lib/data/promotions";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { attacksAllowedFor, formatRemainingTime, formatScore, formatUpdatedAgo } from "@/lib/format-war";
import { getClanEvaluations } from "@/lib/get-clan-evaluations";
import { getKickReasonLabel } from "@/lib/member-status";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Panel · ClashLeader" };

const MAX_FLAGGED = 5;
const MAX_MOVEMENTS = 5;

function daysAgoLabel(at: string, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(at).getTime()) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "hoy";
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

export default async function PanelPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return <NoClanCard />;
  }

  const now = new Date();
  const { members, evaluations, currentWar } = await getClanEvaluations(supabase, viewerClan.clanId, now);

  const [capitalSeason, recentExits, decisions] = await Promise.all([
    getLatestCapitalSeason(supabase, viewerClan.clanId),
    getRecentExits(supabase, viewerClan.clanId, MAX_MOVEMENTS),
    getPromotionDecisions(supabase, members.map((m) => m.id)),
  ]);

  const recentEntries = [...members]
    .sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime())
    .slice(0, MAX_MOVEMENTS);

  const flagged = members
    .map((m) => ({ member: m, evaluation: evaluations.get(m.id) }))
    .filter((f) => f.evaluation && (f.evaluation.kick.shouldKick || f.evaluation.atRisk))
    .sort((a, b) => Number(b.evaluation!.kick.shouldKick) - Number(a.evaluation!.kick.shouldKick))
    .slice(0, MAX_FLAGGED);

  const promotionCandidateCount = members.filter((m) => {
    const evaluation = evaluations.get(m.id);
    if (!evaluation) return false;
    const coleaderDecision = decisions.get(`${m.id}:coleader`);
    const veteranDecision = decisions.get(`${m.id}:veteran`);
    const isColeaderPending = evaluation.isColeaderCandidate && coleaderDecision?.status !== "discarded";
    const isVeteranPending = evaluation.isVeteranCandidate && veteranDecision?.status !== "discarded";
    return isColeaderPending || isVeteranPending;
  }).length;

  const pendingAttacks = currentWar
    ? currentWar.members.filter((m) => m.attacksUsed < attacksAllowedFor(currentWar.warType))
    : [];

  const totalAttacksUsed = currentWar ? currentWar.members.reduce((sum, m) => sum + m.attacksUsed, 0) : 0;
  const totalAttacksAvailable = currentWar ? currentWar.teamSize * attacksAllowedFor(currentWar.warType) : 0;
  const attacksUsedPct = currentWar && totalAttacksAvailable > 0 ? Math.round((100 * totalAttacksUsed) / totalAttacksAvailable) : null;

  const remainingTime = currentWar ? formatRemainingTime(currentWar.endTime, now) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl">{viewerClan.name}</h1>
        <p className="text-sm text-text-secondary">{formatUpdatedAgo(viewerClan.lastCollectedAt, now)}</p>
      </div>

      <Card>
        {currentWar ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Guerra {currentWar.teamSize} contra {currentWar.teamSize}</span>
              {remainingTime ? (
                <Pill tone="warn">{remainingTime}</Pill>
              ) : (
                <Pill tone="warn">{currentWar.state === "preparation" ? "Preparación" : "Sin hora"}</Pill>
              )}
            </div>
            <p className="font-heading text-2xl">{formatScore(currentWar.clanStars, currentWar.opponentStars)}</p>
            <ProgressBar label="Ataques" value={attacksUsedPct} />
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            Sin guerra en curso.{" "}
            <Link href="/guerra" className="text-accent">
              Ver historial
            </Link>
            .
          </p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Miembros</span>
          <span className="font-heading text-xl">{members.length}/50</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Ataques pendientes</span>
          <span className="font-heading text-xl">{currentWar ? pendingAttacks.length : "—"}</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Capital</span>
          <span className="font-heading text-xl">{capitalSeason ? capitalSeason.capitalTotalLoot.toLocaleString("es-ES") : "—"}</span>
        </Card>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-text-secondary">Para expulsar</h2>
        {flagged.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">Nadie está marcado para expulsar ni en riesgo.</p>
          </Card>
        ) : (
          <Card className="flex flex-col divide-y divide-border p-0">
            {flagged.map(({ member, evaluation }) => {
              const status = evaluation!.kick.shouldKick ? { label: "Expulsar", tone: "bad" as const } : { label: "En riesgo", tone: "warn" as const };
              return (
                <Link
                  key={member.id}
                  href={`/miembros/${encodeURIComponent(member.playerTag.replace("#", ""))}`}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="truncate text-xs text-text-secondary">{getKickReasonLabel(evaluation!, 3)}</p>
                  </div>
                  <Pill tone={status.tone}>{status.label}</Pill>
                </Link>
              );
            })}
          </Card>
        )}
      </section>

      <Link href="/ascensos">
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-medium">Candidatos a ascender</p>
            <p className="text-sm text-text-secondary">{promotionCandidateCount} pendiente{promotionCandidateCount === 1 ? "" : "s"}</p>
          </div>
          <ChevronRight size={20} className="shrink-0 text-text-secondary" aria-hidden />
        </Card>
      </Link>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-text-secondary">Movimientos</h2>
        <Card className="flex flex-col divide-y divide-border p-0">
          {recentEntries.length === 0 && recentExits.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">Sin entradas ni salidas registradas todavía.</p>
          ) : (
            <>
              {recentEntries.map((m) => (
                <div key={`in:${m.id}`} className="flex items-center justify-between gap-3 p-4">
                  <span className="truncate text-sm">{m.name}</span>
                  <Pill tone="good">Entró {daysAgoLabel(m.firstSeenAt, now)}</Pill>
                </div>
              ))}
              {recentExits.map((m) => (
                <div key={`out:${m.playerTag}`} className="flex items-center justify-between gap-3 p-4">
                  <span className="truncate text-sm">{m.name}</span>
                  <Pill tone="bad">Salió {daysAgoLabel(m.leftAt, now)}</Pill>
                </div>
              ))}
            </>
          )}
        </Card>
      </section>
    </div>
  );
}
