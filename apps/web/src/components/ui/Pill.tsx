import type { HTMLAttributes } from "react";

export type PillTone = "good" | "warn" | "bad" | "info";

const toneClasses: Record<PillTone, string> = {
  good: "bg-status-good-bg text-status-good-text",
  warn: "bg-status-warn-bg text-status-warn-text",
  bad: "bg-status-bad-bg text-status-bad-text",
  info: "bg-status-info-bg text-status-info-text",
};

export function Pill({
  tone,
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone: PillTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
