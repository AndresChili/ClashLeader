import type { PillTone } from "@/components/ui/Pill";

const toneClasses: Record<PillTone, string> = {
  good: "bg-status-good-bg text-status-good-text",
  warn: "bg-status-warn-bg text-status-warn-text",
  bad: "bg-status-bad-bg text-status-bad-text",
  info: "bg-status-info-bg text-status-info-text",
};

/**
 * 44x44 index box from the design. Shows "—" instead of a 0–100 number
 * until packages/rules computes the real weighted índice (phase 5).
 */
export function IndexBadge({ tone, value }: { tone: PillTone; value?: number }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-heading text-base ${toneClasses[tone]}`}
    >
      {value ?? "—"}
    </div>
  );
}
