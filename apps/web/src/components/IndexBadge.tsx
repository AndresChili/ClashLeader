import type { PillTone } from "@/components/ui/Pill";

const toneClasses: Record<PillTone, string> = {
  good: "bg-status-good-bg text-status-good-text",
  warn: "bg-status-warn-bg text-status-warn-text",
  bad: "bg-status-bad-bg text-status-bad-text",
  info: "bg-status-info-bg text-status-info-text",
};

/**
 * Cuadro de índice de 44x44 del diseño. Muestra "—" en vez de un número
 * de 0 a 100 hasta que packages/rules calcula el índice ponderado real (fase 5).
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
