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

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = ++toastId;
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    return () => { addToastFn = null; };
  }, []);

  const colors = {
    success: { bg: "#052E16", border: "#4ADE80", color: "#4ADE80", icon: "✅" },
    error:   { bg: "#2D0F0F", border: "#F87171", color: "#F87171", icon: "❌" },
    info:    { bg: "#0C1E3E", border: "#60A5FA", color: "#60A5FA", icon: "ℹ️" },
  };

  return (
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
  );
}
