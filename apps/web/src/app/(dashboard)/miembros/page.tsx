import { Card } from "@/components/ui/Card";
import { getKickInactivityDays } from "@/lib/data/clan-rules";
import { getClanMembers } from "@/lib/data/members";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { createClient } from "@/lib/supabase/server";
import { MembersList } from "./MembersList";

export const metadata = { title: "Miembros · ClashLeader" };

export default async function MiembrosPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">
          Todavía no tienes un clan. La alta de clanes llega en la fase 6.
        </p>
      </Card>
    );
  }

  const kickInactivityDays = await getKickInactivityDays(supabase, viewerClan.clanId);
  const members = await getClanMembers(supabase, viewerClan.clanId, kickInactivityDays);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="font-heading text-2xl">Miembros</h1>
        <span className="text-sm text-text-secondary">{members.length} de 50</span>
      </div>

      <MembersList members={members} />
    </div>
  );
}
