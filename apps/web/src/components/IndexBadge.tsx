import { toneClasses, type PillTone } from "@/components/ui/Pill";

/** Cuadro de 44x44 con la puntuación de 0 a 100, del color de su tramo; "—" si no hay evaluación. */
export function IndexBadge({ tone, value }: { tone: PillTone; value?: number }) {
  return (
    <div
      className={`tone-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-heading text-base font-bold ${toneClasses[tone]}`}
    >
      {value ?? "—"}
    </div>
  );
}
