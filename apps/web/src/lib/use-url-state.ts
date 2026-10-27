"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * Estado de una pantalla (búsqueda, filtro, orden, pestaña) guardado en la
 * URL como ?key=valor, para que al volver atrás desde una ficha la pantalla
 * siga como se dejó. Se actualiza con replaceState: no añade entradas al
 * historial ni vuelve al servidor. El valor por defecto no se escribe, y uno
 * que no esté en allowed (URL manipulada o antigua) cae al valor por defecto.
 */
export function useUrlState<T extends string>(key: string, fallback: T, allowed?: readonly T[]): [T, (value: T) => void] {
  const params = useSearchParams();
  const fromUrl = params.get(key);
  const [value, setValue] = useState<T>(
    fromUrl != null && (!allowed || allowed.includes(fromUrl as T)) ? (fromUrl as T) : fallback,
  );

  const update = useCallback(
    (next: T) => {
      setValue(next);
      const url = new URL(window.location.href);
      if (next === fallback) url.searchParams.delete(key);
      else url.searchParams.set(key, next);
      window.history.replaceState(window.history.state, "", url);
    },
    [key, fallback],
  );

  return [value, update];
}
