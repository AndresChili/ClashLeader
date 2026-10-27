/** "Ataques realizados 8/40" con su barra, como lo muestra el juego. Lo usan el Panel y Guerra. */
export function WarAttacksProgress({ used, available }: { used: number; available: number }) {
  const pct = available > 0 ? Math.round((100 * used) / available) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-text-secondary">Ataques realizados</span>
        <span className="font-medium text-text">
          {used}/{available}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
