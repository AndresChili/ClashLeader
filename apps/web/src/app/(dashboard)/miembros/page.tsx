import { NoClanCard } from "@/components/NoClanCard";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { getClanEvaluations } from "@/lib/get-clan-evaluations";
import { createClient } from "@/lib/supabase/server";
import { MembersList, type MembersChip } from "./MembersList";

export const metadata = { title: "Miembros · ClashLeader" };

const VALID_CHIPS: MembersChip[] = ["todos", "colideres", "veteranos"];

export default async function MiembrosPage({ searchParams }: { searchParams: Promise<{ chip?: string }> }) {
  const { chip } = await searchParams;
  const initialChip = VALID_CHIPS.find((c) => c === chip) ?? "todos";

  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return (
      <NoClanCard />
    );
  }

  const { members, evaluations } = await getClanEvaluations(supabase, viewerClan.clanId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="font-heading text-2xl">Miembros</h1>
        <span className="text-sm text-text-secondary">{members.length} de 50</span>
      </div>

      <MembersList members={members} evaluations={evaluations} initialChip={initialChip} />
    </div>
  );
}
