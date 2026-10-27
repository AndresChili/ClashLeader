import Link from "next/link";
import { NoClanCard } from "@/components/NoClanCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getPendingInvites, getTeamMembers } from "@/lib/data/team";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { deleteInvite, removeAccess } from "./actions";
import { ConfirmSubmitButton } from "./ConfirmSubmitButton";
import { InviteCard } from "./InviteCard";

export const metadata = { title: "Equipo · ClashLeader" };

export default async function EquipoPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return <NoClanCard />;
  }

  const user = await getAuthUser();
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
            <span className="flex items-center gap-3">
              <Avatar name={member.displayName} avatarUrl={member.avatarUrl} />
              <span className="text-sm text-text">{member.userId === user?.id ? "Tú" : member.displayName}</span>
            </span>
            <span className="flex items-center gap-2">
              <Pill tone={member.role === "admin" ? "good" : "info"}>
                {member.role === "admin" ? "Administra" : "Solo lectura"}
              </Pill>
              {viewerClan.role === "admin" && member.role === "reader" ? (
                <form action={removeAccess}>
                  <input type="hidden" name="clanId" value={viewerClan.clanId} />
                  <input type="hidden" name="userId" value={member.userId} />
                  <ConfirmSubmitButton message={`¿Quitar el acceso a ${member.displayName}? Para volver a entrar necesitará un código nuevo.`}>
                    Quitar
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </span>
          </Card>
        ))}
        {pendingInvites.map((invite) => (
          <Card key={invite.id} className="flex items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-sm text-text-secondary">Código pendiente de usar</span>
              <span className="text-xs text-text-secondary">
                Caduca el {new Date(invite.expiresAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </span>
            </span>
            <form action={deleteInvite}>
              <input type="hidden" name="clanId" value={viewerClan.clanId} />
              <input type="hidden" name="inviteId" value={invite.id} />
              <Button type="submit" variant="secondary" className="px-3 py-1.5 text-status-bad-text">
                Borrar
              </Button>
            </form>
          </Card>
        ))}
      </section>

      {viewerClan.role === "admin" ? <InviteCard clanId={viewerClan.clanId} pendingInviteIds={pendingInvites.map((i) => i.id)} /> : null}

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
