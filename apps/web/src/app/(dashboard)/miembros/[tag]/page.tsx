import Link from "next/link";
import { notFound } from "next/navigation";
import { IndexBadge } from "@/components/IndexBadge";
import { LastWarsRow } from "@/components/LastWarsRow";
import { ProgressBar } from "@/components/ProgressBar";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getLeaderNotes } from "@/lib/data/notes";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { getMemberRecentWars } from "@/lib/data/wars";
import { daysInClan, formatLastActivity } from "@/lib/format-member";
import { getClanEvaluations } from "@/lib/get-clan-evaluations";
import { getMemberStatus } from "@/lib/member-status";
import { ROLE_LABELS } from "@/lib/role-labels";
import { createClient } from "@/lib/supabase/server";
import { FichaActions } from "./FichaActions";

export default async function FichaPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const playerTag = `#${tag}`;

  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);
  if (!viewerClan) notFound();

  const { members, evaluations } = await getClanEvaluations(supabase, viewerClan.clanId);
  const member = members.find((m) => m.playerTag === playerTag);
  if (!member) notFound();
  const evaluation = evaluations.get(member.id)!;

  const [notes, recentWars] = await Promise.all([
    getLeaderNotes(supabase, member.id),
    getMemberRecentWars(supabase, member.id),
  ]);
  const status = getMemberStatus(evaluation);
  // Oldest first, most recent last — matches the "de la más antigua a la
  // más reciente" caption; recentWars comes back most-recent-first.
  const warStars = [...recentWars].reverse().map((w) => w.stars);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/miembros" className="text-sm text-accent">
        ‹ Miembros
      </Link>

      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl">{member.name}</h1>
          <Pill tone={status.tone}>{status.label}</Pill>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {ROLE_LABELS[member.inGameRole]} · {daysInClan(member)} días en el clan · {formatLastActivity(member.lastActivityDetectedAt)}
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <IndexBadge tone={status.tone} value={evaluation.index.score} />
          <div className="flex-1 flex-col gap-2">
            <ProgressBar label="Guerra" value={evaluation.index.breakdown.war} />
            <ProgressBar label="Donaciones" value={evaluation.index.breakdown.donations} />
            <ProgressBar label="Capital" value={evaluation.index.breakdown.capital} />
            <ProgressBar label="Juegos" value={evaluation.index.breakdown.games} />
          </div>
        </div>
      </Card>

      <div>
        <p className="mb-2 text-sm text-text-secondary">Últimas 10 guerras</p>
        <LastWarsRow stars={warStars} />
        <p className="mt-1 text-xs text-text-secondary">Estrellas por guerra, de la más antigua a la más reciente.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-text-secondary">Media por ataque</p>
          <p className="font-heading text-lg">{member.avgStarsPerAttack ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary">Ataques usados</p>
          <p className="font-heading text-lg">
            {member.attacksUsed ?? "—"} de {member.attacksAvailable ?? "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary">Donadas y recibidas</p>
          <p className="font-heading text-lg">
            {member.donations ?? "—"} / {member.donationsReceived ?? "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary">Liga</p>
          <p className="font-heading text-lg">{member.leagueName ?? "—"}</p>
        </Card>
      </div>

      {notes.length > 0 ? (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <Card key={note.id}>
              <p className="text-xs text-text-secondary">
                Nota de {note.authorName} · {new Date(note.createdAt).toLocaleDateString("es-ES")}
              </p>
              <p className="mt-1 text-sm text-text">{note.note}</p>
            </Card>
          ))}
        </div>
      ) : null}

      <FichaActions
        clanMemberId={member.id}
        clanId={viewerClan.clanId}
        tagSlug={tag}
        onWatch={member.onWatch}
        canEdit={viewerClan.role === "admin"}
      />
    </div>
  );
}
