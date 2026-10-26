/** Marcador de estrellas "16 - 56": las nuestras en verde, las del rival en rojo. */
export function WarScore({
  clanStars,
  opponentStars,
  className = "",
}: {
  clanStars: number | null;
  opponentStars: number | null;
  className?: string;
}) {
  if (clanStars == null || opponentStars == null) return <span className={className}>—</span>;

  return (
    <span className={className} aria-label={`${clanStars} a ${opponentStars} estrellas`}>
      <span className="text-status-good-text">{clanStars}</span>
      <span className="text-text-secondary"> - </span>
      <span className="text-status-bad-text">{opponentStars}</span>
    </span>
  );
}
