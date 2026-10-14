"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  callback: "El enlace ha caducado o ya se usó. Inicia sesión de nuevo.",
};

export function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");

  // Cuando el enlace de confirmación de correo caduca o ya se usó, Supabase
  // redirige con el error en el fragmento (#error=...), no en la query
  // string — no llega al servidor, hay que leerlo del lado del cliente.
  const [hashError, setHashError] = useState<string | null>(null);
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    if (hashParams.get("error")) {
      setHashError(hashParams.get("error_code") ?? hashParams.get("error"));
    }
  }, []);

  const error = queryError ?? (hashError ? "callback" : null);
  const message = error ? MESSAGES[error] : undefined;

  if (!message) return null;

  return <p className="text-sm text-status-bad-text">{message}</p>;
}
