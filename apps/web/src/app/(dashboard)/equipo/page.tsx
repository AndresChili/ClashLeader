import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getPendingInvites, getTeamMembers } from "@/lib/data/team";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { createClient } from "@/lib/supabase/server";
import { InviteCard } from "./InviteCard";

export const metadata = { title: "Equipo · ClashLeader" };

export default async function EquipoPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">
          Todavía no tienes un clan.{" "}
          <Link href="/alta-clan" className="text-accent">
            Dalo de alta
          </Link>
          .
        </p>
      </Card>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [team, pendingInvites] = await Promise.all([
    getTeamMembers(supabase, viewerClan.clanId),
    viewerClan.role === "admin" ? getPendingInvites(supabase, viewerClan.clanId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl">Equipo</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-text-secondary">Quién tiene acceso</h2>
        {team.map((member) => (
          <Card key={member.userId} className="flex items-center justify-between">
            <span className="text-sm text-text">{member.userId === user?.id ? "Tú" : member.displayName}</span>
            <Pill tone={member.role === "admin" ? "good" : "info"}>
              {member.role === "admin" ? "Administra" : "Solo lectura"}
            </Pill>
          </Card>
        ))}
        {pendingInvites.map((invite) => (
          <Card key={invite.id} className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Código pendiente de usar</span>
            <Pill tone="warn">Invitación enviada</Pill>
          </Card>
        ))}
      </section>

      {viewerClan.role === "admin" ? <InviteCard clanId={viewerClan.clanId} /> : null}

      <div className="flex flex-col gap-2">
        <Link href="/reglas" className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <span className="text-sm text-text">Reglas del clan</span>
          <span className="text-text-secondary">›</span>
        </Link>
        <Link href="/ascensos" className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <span className="text-sm text-text">Candidatos a ascender</span>
          <span className="text-text-secondary">›</span>
        </Link>
      </div>
    </div>
  );
}
