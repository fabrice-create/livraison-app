"use client";

import { useState, useEffect, useRef } from "react";

const S = {
  gold: "#F59E0B", bg: "#0A0A0F", card: "#111118", card2: "#16161F",
  border: "#1E1E2E", text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "#2D0F0F", success: "#4ADE80",
};

interface Props {
  name: string;
  email?: string;
  role: string;
  onLogout: () => void;
  onSettings?: () => void; // si présent → affiche Paramètres
}

const ROLE_LABELS: Record<string, string> = {
  admin:      "⚙️ Admin",
  manager:    "🧑‍💼 Manager",
  livreur:    "🏍️ Livreur",
  closureuse: "👩‍💼 Closeur(se)",
};

const ROLE_COLORS: Record<string, string> = {
  admin:      "#F59E0B",
  manager:    "#60A5FA",
  livreur:    "#4ADE80",
  closureuse: "#C084FC",
};

export default function ProfileMenu({ name, email, role, onLogout, onSettings }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initial = name?.[0]?.toUpperCase() || "?";
  const roleNorm = role.toLowerCase();
  const roleLabel = ROLE_LABELS[roleNorm] || role;
  const roleColor = ROLE_COLORS[roleNorm] || S.gold;

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Avatar bouton */}
      <button onClick={() => setOpen(!open)} style={{
        width: 36, height: 36, borderRadius: "50%",
        background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
        border: open ? `2px solid ${roleColor}` : "2px solid transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, color: "#000",
        cursor: "pointer", transition: "border 0.2s",
        flexShrink: 0,
      }}>
        {initial}
      </button>

      {/* Menu déroulant */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: S.card2, border: `1px solid ${S.border}`,
          borderRadius: 16, minWidth: 220, zIndex: 200,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          overflow: "hidden",
          animation: "fadeDown 0.15s ease",
        }}>
          <style>{`@keyframes fadeDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>

          {/* Infos profil */}
          <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#000", flexShrink: 0 }}>
                {initial}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: S.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
                {email && <p style={{ fontSize: 11, color: S.text3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</p>}
                <span style={{ display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${roleColor}20`, color: roleColor }}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: "8px 0" }}>
            {onSettings && (
              <button onClick={() => { onSettings(); setOpen(false); }} style={{
                width: "100%", padding: "11px 16px", background: "transparent",
                border: "none", color: S.text, fontSize: 13, fontWeight: 500,
                cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
              }}
                onMouseEnter={e => (e.currentTarget.style.background = S.border)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ fontSize: 16 }}>⚙️</span> Paramètres
              </button>
            )}

            <button onClick={() => { onLogout(); setOpen(false); }} style={{
              width: "100%", padding: "11px 16px", background: "transparent",
              border: "none", color: S.danger, fontSize: 13, fontWeight: 600,
              cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = S.dangerBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{ fontSize: 16 }}>🔌</span> Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
