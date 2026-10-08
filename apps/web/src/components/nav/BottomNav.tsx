"use client";

import { LayoutGrid, Swords, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/panel", label: "Panel", icon: LayoutGrid },
  { href: "/miembros", label: "Miembros", icon: Users },
  { href: "/guerra", label: "Guerra", icon: Swords },
  { href: "/equipo", label: "Equipo", icon: UsersRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 flex border-t border-border bg-card">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${active ? "text-accent" : "text-text-secondary"}`}
          >
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
