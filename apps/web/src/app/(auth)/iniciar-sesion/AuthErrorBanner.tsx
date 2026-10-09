"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  google: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
  callback: "El enlace ha caducado o ya se usó. Inicia sesión de nuevo.",
};

export function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = error ? MESSAGES[error] : undefined;

  if (!message) return null;

  return <p className="text-sm text-status-bad-text">{message}</p>;
}
