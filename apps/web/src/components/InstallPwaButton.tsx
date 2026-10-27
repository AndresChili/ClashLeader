"use client";

import { useState, useSyncExternalStore } from "react";
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
let installedHere = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    capturedPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installedHere = true;
    capturedPrompt = null;
    notify();
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

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    displayMode.removeEventListener("change", onChange);
  };
}

export function InstallPwaButton() {
  // En el servidor se da por instalada para no pintar el aviso y que desaparezca al hidratar.
  const deferredPrompt = useSyncExternalStore(subscribe, () => capturedPrompt, () => null);
  const installed = useSyncExternalStore(subscribe, () => installedHere || isStandalone(), () => true);
  const [showManualHint, setShowManualHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (installed || dismissed) return null;

  // Chrome no siempre dispara beforeinstallprompt (heurísticas de
  // interacción, o si el usuario ya descartó el aviso nativo antes), así
  // que si no llega el evento mostramos igualmente el botón con las
  // instrucciones manuales en vez de escondernos.
  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") installedHere = true;
      capturedPrompt = null;
      notify();
      return;
    }
    setShowManualHint(true);
  };

  return (
    <div className="flex flex-col gap-2 surface rounded-xl px-3 py-2.5 text-sm">
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
