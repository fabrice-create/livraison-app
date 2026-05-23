"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

interface ToastMsg {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
let addToastFn: ((msg: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = "success") {
  if (addToastFn) addToastFn(message, type);
}

// ─── Confirm Modal ────────────────────────────────────────────
interface ConfirmOptions {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

let showConfirmFn: ((opts: ConfirmOptions) => void) | null = null;

export function confirm(opts: ConfirmOptions) {
  if (showConfirmFn) showConfirmFn(opts);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [confirmOpts, setConfirmOpts] = useState<ConfirmOptions | null>(null);

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = ++toastId;
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    showConfirmFn = (opts) => setConfirmOpts(opts);
    return () => { addToastFn = null; showConfirmFn = null; };
  }, []);

  const colors = {
    success: { bg: "#052E16", border: "#4ADE80", color: "#4ADE80", icon: "✅" },
    error:   { bg: "#2D0F0F", border: "#F87171", color: "#F87171", icon: "❌" },
    info:    { bg: "#0C1E3E", border: "#60A5FA", color: "#60A5FA", icon: "ℹ️" },
  };

  return (
    <>
      {/* Confirm Modal */}
      {confirmOpts && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, padding: 16 }}>
          <div style={{ background: "#111118", border: "1px solid #1E1E2E", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>{confirmOpts.danger ? "⚠️" : "❓"}</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#F8F8FC", marginBottom: 24, lineHeight: 1.5 }}>{confirmOpts.message}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => { confirmOpts.onCancel?.(); setConfirmOpts(null); }}
                style={{ padding: "12px 0", borderRadius: 12, border: "1px solid #1E1E2E", background: "transparent", color: "#9898B0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {confirmOpts.cancelLabel || "Annuler"}
              </button>
              <button onClick={() => { confirmOpts.onConfirm(); setConfirmOpts(null); }}
                style={{ padding: "12px 0", borderRadius: 12, border: "none", background: confirmOpts.danger ? "#F87171" : "#F59E0B", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {confirmOpts.confirmLabel || "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none" }}>
        {toasts.map(t => {
          const c = colors[t.type];
          return (
            <div key={t.id} style={{
              background: c.bg, border: `1px solid ${c.border}`, color: c.color,
              padding: "12px 20px", borderRadius: 14, fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8, maxWidth: 340,
              boxShadow: `0 4px 20px ${c.border}40`,
              animation: "slideUp 0.3s ease",
              pointerEvents: "auto",
            }}>
              <span>{c.icon}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
        <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>
    </>
  );
}
