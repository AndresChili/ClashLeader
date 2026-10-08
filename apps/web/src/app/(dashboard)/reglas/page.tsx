import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getClanRules } from "@/lib/data/clan-rules";
import { getViewerClan } from "@/lib/data/viewer-clan";
import { createClient } from "@/lib/supabase/server";
import { RulesEditor } from "./RulesEditor";

export const metadata = { title: "Reglas del clan · ClashLeader" };

export default async function ReglasPage() {
  const supabase = await createClient();
  const viewerClan = await getViewerClan(supabase);

  if (!viewerClan) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">Todavía no tienes un clan. La alta de clanes llega en la fase 6.</p>
      </Card>
    );
  }

  const rules = await getClanRules(supabase, viewerClan.clanId);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/equipo" className="text-sm text-accent">
        ‹ Equipo
      </Link>
      <h1 className="font-heading text-2xl">Reglas del clan</h1>
      <RulesEditor rules={rules} canEdit={viewerClan.role === "admin"} />
    </div>
  );
}
