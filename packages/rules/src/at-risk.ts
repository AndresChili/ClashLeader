/** En riesgo: aún no ha atacado en la guerra en curso. */
export function isAtRisk(params: { inCurrentWar: boolean; attacksUsedInCurrentWar: number }): boolean {
  return params.inCurrentWar && params.attacksUsedInCurrentWar === 0;
}
