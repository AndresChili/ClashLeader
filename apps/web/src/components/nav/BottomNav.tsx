"use client";

import { Castle, LayoutGrid, Swords, Trophy, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/panel", label: "Panel", icon: LayoutGrid },
  { href: "/miembros", label: "Miembros", icon: Users },
  { href: "/guerra", label: "Guerra", icon: Swords },
  { href: "/capital", label: "Capital", icon: Castle },
  { href: "/juegos", label: "Juegos", icon: Trophy },
  { href: "/equipo", label: "Equipo", icon: UsersRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <nav className="flex w-full max-w-[680px] items-center gap-1 rounded-full border border-border bg-card/95 p-1.5 shadow-xl shadow-black/30 backdrop-blur">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-medium transition-colors duration-200 ${
                active ? "bg-accent/15 text-accent" : "text-text-secondary hover:text-text"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
