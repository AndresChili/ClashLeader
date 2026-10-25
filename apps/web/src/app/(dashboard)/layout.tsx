import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/nav/BottomNav";
import { getAuthUser } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col">
      <div className="flex-1 px-4 pt-6 pb-28">{children}</div>
      <BottomNav />
    </div>
  );
}
