"use client";

import { useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  callback: "El enlace ha caducado o ya se usó. Inicia sesión de nuevo.",
};

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");

  // Cuando el enlace de confirmación de correo caduca o ya se usó, Supabase
  // redirige con el error en el fragmento (#error=...), no en la query
  // string — no llega al servidor, hay que leerlo del lado del cliente.
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash, () => "");
  const hashError = new URLSearchParams(hash.slice(1)).get("error");

  const error = queryError ?? (hashError ? "callback" : null);
  const message = error ? MESSAGES[error] : undefined;

  if (!message) return null;

  return <p className="text-sm text-status-bad-text">{message}</p>;
}
