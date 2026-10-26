import type { HTMLAttributes } from "react";

/** Los band-* son los tramos de puntuación de Miembros (ver lib/member-status.ts). */
export type PillTone =
  | "good"
  | "warn"
  | "bad"
  | "info"
  | "band-excelente"
  | "band-genial"
  | "band-bien"
  | "band-suficiente"
  | "band-flojo"
  | "band-muy-flojo";

export const toneClasses: Record<PillTone, string> = {
  good: "bg-status-good-bg text-status-good-text",
  warn: "bg-status-warn-bg text-status-warn-text",
  bad: "bg-status-bad-bg text-status-bad-text",
  info: "bg-status-info-bg text-status-info-text",
  "band-excelente": "bg-band-excelente-bg text-band-excelente-text",
  "band-genial": "bg-band-genial-bg text-band-genial-text",
  "band-bien": "bg-band-bien-bg text-band-bien-text",
  "band-suficiente": "bg-band-suficiente-bg text-band-suficiente-text",
  "band-flojo": "bg-band-flojo-bg text-band-flojo-text",
  "band-muy-flojo": "bg-band-muy-flojo-bg text-band-muy-flojo-text",
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
