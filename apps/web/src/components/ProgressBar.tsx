/** value va de 0 a 100, o null/undefined para pintar honestamente una barra "todavía sin datos". */
export function ProgressBar({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 shrink-0 text-text-secondary">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
        {value != null ? <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} /> : null}
      </div>
      <span className="w-8 shrink-0 text-right text-text-secondary">{value ?? "—"}</span>
    </div>
  );
}
