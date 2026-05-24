"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Capturer l'événement d'installation
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Afficher la bannière après 3 secondes
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (installed || !showBanner || !deferredPrompt) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 9999,
      background: "linear-gradient(135deg, #1A1200, #0A0A0F)",
      border: "1px solid #F59E0B50",
      borderRadius: 16, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ fontSize: 36, flexShrink: 0 }}>📦</div>
      <div style={{ flex: 1 }}>
        <p style={{ color: "#F8F8FC", fontSize: 14, fontWeight: 700, margin: "0 0 2px 0" }}>
          Installer Shipivo
        </p>
        <p style={{ color: "#9898B0", fontSize: 12, margin: 0 }}>
          Accès rapide depuis votre écran d&apos;accueil
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => setShowBanner(false)}
          style={{ background: "transparent", border: "1px solid #1E1E2E", borderRadius: 8, padding: "6px 10px", color: "#9898B0", fontSize: 12, cursor: "pointer" }}>
          Plus tard
        </button>
        <button onClick={handleInstall}
          style={{ background: "#F59E0B", border: "none", borderRadius: 8, padding: "6px 12px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Installer
        </button>
      </div>
    </div>
  );
}
