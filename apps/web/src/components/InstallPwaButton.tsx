"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type WindowWithPwaPrompt = Window & { __pwaInstallPrompt?: BeforeInstallPromptEvent };

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
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    setInstalled(isStandalone());

    // El evento beforeinstallprompt lo captura un script en <head> que corre
    // antes de la hidratación (ver layout.tsx), para que Chrome nunca llegue
    // a mostrar su propio banner nativo mientras React aún no ha montado.
    const win = window as WindowWithPwaPrompt;

    const pickUpPrompt = () => {
      if (win.__pwaInstallPrompt) setDeferredPrompt(win.__pwaInstallPrompt);
    };
    pickUpPrompt();

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      win.__pwaInstallPrompt = undefined;
    };

    window.addEventListener("pwa-install-ready", pickUpPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("pwa-install-ready", pickUpPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;
  if (!deferredPrompt && !isIos()) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      (window as WindowWithPwaPrompt).__pwaInstallPrompt = undefined;
      return;
    }
    setShowIosHint(true);
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
      {showIosHint ? (
        <p className="text-xs text-text-secondary">
          Toca el botón Compartir de Safari y luego &quot;Añadir a pantalla de inicio&quot;.
        </p>
      ) : null}
    </div>
  );
}
