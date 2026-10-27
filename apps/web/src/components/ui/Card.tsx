import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`surface rounded-3xl p-4 ${className}`} {...props} />;
}
