import Link from "next/link";
import { ClanBadge } from "@/components/ClanBadge";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ProgressBar";
import { NoClanCard } from "@/components/NoClanCard";
import { getRecentExits } from "@/lib/data/members";
import { getPromotionDecisions } from "@/lib/data/promotions";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { attacksAllowedFor, formatRemainingTime, formatScore, formatUpdatedAgo } from "@/lib/format-war";
import { getClanEvaluations } from "@/lib/get-clan-evaluations";
import type { MemberEvaluation } from "@/lib/member-evaluation";
import { getKickReasonLabel } from "@/lib/member-status";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Panel · ClashLeader" };

const MAX_FLAGGED = 5;
const MAX_MOVEMENTS = 5;
const MAX_CANDIDATES = 6;

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

  const [recentExits, decisions] = await Promise.all([
    getRecentExits(supabase, viewerClan.clanId, MAX_MOVEMENTS),
    getPromotionDecisions(supabase, members.map((m) => m.id)),
  ]);

  const recentEntries = [...members]
    .sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime())
    .slice(0, MAX_MOVEMENTS);

  const coleaderCount = members.filter((m) => m.inGameRole === "coLeader").length;
  const veteranCount = members.filter((m) => m.inGameRole === "admin").length;

  const toKick = members
    .map((m) => ({ member: m, evaluation: evaluations.get(m.id) }))
    .filter((f): f is { member: (typeof members)[number]; evaluation: MemberEvaluation } => Boolean(f.evaluation?.kick.shouldKick))
    .slice(0, MAX_FLAGGED);

  const promotionCandidates = members
    .flatMap((member) => {
      const evaluation = evaluations.get(member.id);
      if (!evaluation) return [];
      const coleaderDecision = decisions.get(`${member.id}:coleader`);
      const veteranDecision = decisions.get(`${member.id}:veteran`);
      const items: { member: typeof member; type: "coleader" | "veteran" }[] = [];
      if (evaluation.isColeaderCandidate && coleaderDecision?.status !== "discarded") {
        items.push({ member, type: "coleader" });
      }
      if (evaluation.isVeteranCandidate && veteranDecision?.status !== "discarded") {
        items.push({ member, type: "veteran" });
      }
      return items;
    })
    .slice(0, MAX_CANDIDATES);

  const totalAttacksUsed = currentWar ? currentWar.members.reduce((sum, m) => sum + m.attacksUsed, 0) : 0;
  const totalAttacksAvailable = currentWar ? currentWar.teamSize * attacksAllowedFor(currentWar.warType) : 0;
  const attacksUsedPct = currentWar && totalAttacksAvailable > 0 ? Math.round((100 * totalAttacksUsed) / totalAttacksAvailable) : null;

  const remainingTime = currentWar ? formatRemainingTime(currentWar.endTime, now) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <ClanBadge url={viewerClan.badgeUrl} size={52} />
        <div>
          <h1 className="font-heading text-[28px] leading-tight tracking-tight">{viewerClan.name}</h1>
          <p className="mt-0.5 text-sm text-text-secondary">{formatUpdatedAgo(viewerClan.lastCollectedAt, now)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link href="/miembros">
          <Card className="flex flex-col gap-1 transition active:scale-[0.97]">
            <span className="text-xs text-text-secondary">Miembros</span>
            <span className="font-heading text-xl">{members.length}/50</span>
          </Card>
        </Link>
        <Link href="/miembros?chip=colideres">
          <Card className="flex flex-col gap-1 transition active:scale-[0.97]">
            <span className="text-xs text-text-secondary">Colíderes</span>
            <span className="font-heading text-xl">{coleaderCount}</span>
          </Card>
        </Link>
        <Link href="/miembros?chip=veteranos">
          <Card className="flex flex-col gap-1 transition active:scale-[0.97]">
            <span className="text-xs text-text-secondary">Veteranos</span>
            <span className="font-heading text-xl">{veteranCount}</span>
          </Card>
        </Link>
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

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-text-secondary">Candidatos a ascender</h2>
        {promotionCandidates.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">Nadie cumple todavía los requisitos para ascender.</p>
          </Card>
        ) : (
          <Card className="flex flex-col divide-y divide-border p-0">
            {promotionCandidates.map(({ member, type }) => (
              <Link
                key={`${member.id}:${type}`}
                href={`/miembros/${encodeURIComponent(member.playerTag.replace("#", ""))}`}
                prefetch={false}
                className="flex items-center justify-between gap-3 p-4"
              >
                <p className="truncate font-medium">{member.name}</p>
                <Pill tone="good">a {type === "coleader" ? "Colíder" : "Veterano"}</Pill>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-text-secondary">Para expulsar</h2>
        {toKick.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">Nadie está marcado para expulsar.</p>
          </Card>
        ) : (
          <Card className="flex flex-col divide-y divide-border p-0">
            {toKick.map(({ member, evaluation }) => (
              <Link
                key={member.id}
                href={`/miembros/${encodeURIComponent(member.playerTag.replace("#", ""))}`}
                prefetch={false}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{member.name}</p>
                  <p className="truncate text-xs text-text-secondary">{getKickReasonLabel(evaluation, 3)}</p>
                </div>
                <Pill tone="bad">Expulsar</Pill>
              </Link>
            ))}
          </Card>
        )}
      </section>

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
