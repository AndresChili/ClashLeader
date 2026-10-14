export interface DonationCounts {
  donations: number;
  donationsReceived: number;
}

/**
 * Las donaciones solo suben dentro de una temporada; una bajada entre dos
 * consultas seguidas es la única señal de que hubo un reinicio de
 * temporada en medio. Cuando pasa, el valor de la consulta *anterior* era
 * el total real de la temporada y hay que guardarlo antes de que se
 * pierda.
 */
export function didSeasonReset(previous: DonationCounts, current: DonationCounts): boolean {
  return current.donations < previous.donations || current.donationsReceived < previous.donationsReceived;
}

/**
 * Las temporadas de Clash of Clans no coinciden con los meses de
 * calendario (terminan el último lunes del mes), pero solo necesitamos
 * una etiqueta estable y ordenable de "qué temporada fue esta", no el
 * límite exacto — así que la etiqueta es aproximada: el año-mes UTC en el
 * que se observó el reinicio.
 */
export function seasonIdForDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
