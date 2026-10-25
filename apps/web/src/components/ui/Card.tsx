import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/20 ${className}`} {...props} />;
}
