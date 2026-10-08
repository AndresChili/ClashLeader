import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { NoClanCard } from "@/components/NoClanCard";
import { getPromotionDecisions } from "@/lib/data/promotions";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { daysInClan } from "@/lib/format-member";
import { getClanEvaluations } from "@/lib/get-clan-evaluations";
import { createClient } from "@/lib/supabase/server";
import { CandidateCard, DiscardedCard } from "./CandidateCard";

export const metadata = { title: "Ascensos · ClashLeader" };

export default async function AscensosPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return (
      <NoClanCard />
    );
  }

  const { members, evaluations } = await getClanEvaluations(supabase, viewerClan.clanId);
  const decisions = await getPromotionDecisions(supabase, members.map((m) => m.id));
  const canEdit = viewerClan.role === "admin";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const decidedByLabel = (decidedByUserId: string | null, decidedByName: string | null) =>
    decidedByUserId && decidedByUserId === user?.id ? "ti" : decidedByName;

  const coleaderCandidates = members.filter((m) => evaluations.get(m.id)?.isColeaderCandidate);
  const veteranCandidates = members.filter((m) => evaluations.get(m.id)?.isVeteranCandidate);

  const discarded = [...coleaderCandidates, ...veteranCandidates]
    .flatMap((m) => {
      const type = coleaderCandidates.includes(m) ? ("coleader" as const) : ("veteran" as const);
      const decision = decisions.get(`${m.id}:${type}`);
      return decision?.status === "discarded" ? [{ member: m, type, decision }] : [];
    });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/equipo" className="text-sm text-accent">
        ‹ Equipo
      </Link>
      <div>
        <h1 className="font-heading text-2xl">Ascensos</h1>
        <p className="text-sm text-text-secondary">La app propone y tú decides.</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-text-secondary">A colíder · {coleaderCandidates.length} cumple{coleaderCandidates.length === 1 ? "" : "n"} las reglas</h2>
        {coleaderCandidates.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">Nadie cumple las reglas de colíder todavía.</p>
          </Card>
        ) : (
          coleaderCandidates.map((m) => {
            const decision = decisions.get(`${m.id}:coleader`);
            if (decision?.status === "discarded") return null;
            return (
              <CandidateCard
                key={m.id}
                name={m.name}
                merits={`${daysInClan(m)} días en el clan · usa el ${m.attackUsagePct ?? "—"}% de sus ataques · ${m.donations ?? 0} donadas`}
                decisionInput={{ clanMemberId: m.id, candidateType: "coleader", clanId: viewerClan.clanId }}
                status={decision?.status === "approved" ? "approved" : "pending"}
                decidedByName={decidedByLabel(decision?.decidedByUserId ?? null, decision?.decidedByName ?? null)}
                canEdit={canEdit}
              />
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-text-secondary">A veterano · {veteranCandidates.length} cumple{veteranCandidates.length === 1 ? "" : "n"} las reglas</h2>
        {veteranCandidates.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary">Nadie cumple las reglas de veterano todavía.</p>
          </Card>
        ) : (
          veteranCandidates.map((m) => {
            const decision = decisions.get(`${m.id}:veteran`);
            if (decision?.status === "discarded") return null;
            return (
              <CandidateCard
                key={m.id}
                name={m.name}
                merits={`${daysInClan(m)} días en el clan · atacó en ${m.warsAttacked} de ${m.warsRostered} guerras · ${m.donations ?? 0} donadas`}
                decisionInput={{ clanMemberId: m.id, candidateType: "veteran", clanId: viewerClan.clanId }}
                status={decision?.status === "approved" ? "approved" : "pending"}
                decidedByName={decidedByLabel(decision?.decidedByUserId ?? null, decision?.decidedByName ?? null)}
                canEdit={canEdit}
              />
            );
          })
        )}
      </section>

      {discarded.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-text-secondary">Descartados por ti</h2>
          {discarded.map(({ member, type, decision }) => (
            <DiscardedCard
              key={`${member.id}:${type}`}
              name={member.name}
              decidedAt={decision.decidedAt}
              decisionInput={{ clanMemberId: member.id, candidateType: type, clanId: viewerClan.clanId }}
              canEdit={canEdit}
            />
          ))}
        </section>
      ) : null}

      {!canEdit ? (
        <p className="text-xs text-text-secondary">Como colíder puedes ver los candidatos, pero solo el líder puede aprobar o descartar.</p>
      ) : null}
    </div>
  );
}
