/**
 * 10 boxes, one per recent war, colored by stars (0 mal, 1-3 aviso, 4+
 * bien), empty/"hueco" when the member didn't participate. War history
 * doesn't exist until phase 4, so every box is a hueco for now.
 */
export function LastWarsRow({ stars = [] }: { stars?: (number | null)[] }) {
  const boxes = Array.from({ length: 10 }, (_, i) => stars[i] ?? null);

  return (
    <div className="flex gap-1.5">
      {boxes.map((value, i) => (
        <div
          key={i}
          className={`flex h-8 flex-1 items-center justify-center rounded-lg border border-border text-xs font-medium ${starClasses(value)}`}
        >
          {value ?? ""}
        </div>
      ))}
    </div>
  );
}

function starClasses(value: number | null): string {
  if (value === null) return "bg-transparent text-text-secondary";
  if (value === 0) return "bg-status-bad-bg text-status-bad-text border-transparent";
  if (value <= 3) return "bg-status-warn-bg text-status-warn-text border-transparent";
  return "bg-status-good-bg text-status-good-text border-transparent";
}
