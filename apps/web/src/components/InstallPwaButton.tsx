"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Se registra al cargar este módulo (durante la hidratación), no dentro de
// useEffect, para ganarle la carrera a Chrome: si el listener llega tarde,
// Chrome muestra su propio banner nativo en vez de dejarnos controlar el
// prompt. No puede ir en un <script> inline porque el CSP del proyecto es
// script-src 'self' y bloquea scripts inline sin nonce.
let capturedPrompt: BeforeInstallPromptEvent | null = null;
const readyListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    capturedPrompt = event as BeforeInstallPromptEvent;
    readyListeners.forEach((listener) => listener());
  });
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showManualHint, setShowManualHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    setInstalled(isStandalone());
    if (capturedPrompt) setDeferredPrompt(capturedPrompt);

    const onReady = () => setDeferredPrompt(capturedPrompt);
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      capturedPrompt = null;
    };

    readyListeners.add(onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      readyListeners.delete(onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;

  // Chrome no siempre dispara beforeinstallprompt (heurísticas de
  // interacción, o si el usuario ya descartó el aviso nativo antes), así
  // que si no llega el evento mostramos igualmente el botón con las
  // instrucciones manuales en vez de escondernos.
  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      capturedPrompt = null;
      return;
    }
    setShowManualHint(true);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-text-secondary">Instala ClashLeader en tu móvil</span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={handleClick}>
            Instalar
          </Button>
          <button
            type="button"
            aria-label="Cerrar"
            className="text-text-secondary hover:text-text"
            onClick={() => setDismissed(true)}
          >
            ✕
          </button>
        </div>
      </div>
      {showManualHint ? (
        <p className="text-xs text-text-secondary">
          {isIos()
            ? 'Toca el botón Compartir de Safari y luego "Añadir a pantalla de inicio".'
            : 'Abre el menú ⋮ de Chrome y toca "Instalar aplicación" o "Añadir a pantalla de inicio".'}
        </p>
      ) : null}
    </div>
  );
}
