import Link from "next/link";
import { ClanBadge } from "@/components/ClanBadge";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { NoClanCard } from "@/components/NoClanCard";
import { getMovements } from "@/lib/data/members";
import { getPromotionDecisions } from "@/lib/data/promotions";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { attacksAllowedFor, formatUpdatedAgo, warPhase } from "@/lib/format-war";
import { WarScore } from "@/components/WarScore";
import { getClanEvaluations } from "@/lib/get-clan-evaluations";
import type { MemberEvaluation } from "@/lib/member-evaluation";
import { getKickReasonLabel } from "@/lib/member-status";
import { createClient } from "@/lib/supabase/server";
import { Movements } from "./Movements";
import { MOVEMENTS_PAGE_SIZE } from "./movements-config";

export const metadata = { title: "Panel · ClashLeader" };

const MAX_FLAGGED = 5;
const MAX_CANDIDATES = 6;

export default async function PanelPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return <NoClanCard />;
  }

  const now = new Date();
  const { rules, members, evaluations, currentWar } = await getClanEvaluations(supabase, viewerClan.clanId, now);

  const [movements, decisions] = await Promise.all([
    getMovements(supabase, viewerClan.clanId, 0, MOVEMENTS_PAGE_SIZE),
    getPromotionDecisions(supabase, members.map((m) => m.id)),
  ]);

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

  const phase = currentWar ? warPhase(currentWar, now) : null;

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
              {phase ? <Pill tone={phase.label === "Preparación" ? "info" : "warn"}>{phase.label}</Pill> : null}
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <WarScore className="font-heading text-2xl" clanStars={currentWar.clanStars} opponentStars={currentWar.opponentStars} />
              {phase?.countdown ? <span className="text-sm text-text-secondary">{phase.countdown}</span> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-text-secondary">Ataques realizados</span>
                <span className="font-medium text-text">
                  {totalAttacksUsed}/{totalAttacksAvailable}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-accent" style={{ width: `${attacksUsedPct ?? 0}%` }} />
              </div>
            </div>
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
                  <p className="truncate text-xs text-text-secondary">{getKickReasonLabel(evaluation, rules.kickInactivityDays)}</p>
                </div>
                <Pill tone="bad">Expulsar</Pill>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-text-secondary">Movimientos</h2>
        <Movements clanId={viewerClan.clanId} initial={movements} />
      </section>
    </div>
  );
}
