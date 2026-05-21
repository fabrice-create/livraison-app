"use client"

import { useState, useEffect } from "react"
import { useNotifications } from "@/hooks/useNotifications"

const S = {
  gold: "#F59E0B", goldDark: "#D97706",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", success: "#4ADE80",
}

interface Props {
  tenantId: string
}

export default function NotificationBell({ tenantId }: Props) {
  const { notifications, unreadCount, newOrderAlert, markAllRead, requestPermission } = useNotifications(tenantId)
  const [open, setOpen] = useState(false)
  const [permAsked, setPermAsked] = useState(false)

  useEffect(() => {
    // Demander permission notification navigateur au premier rendu
    if (!permAsked) {
      requestPermission()
      setPermAsked(true)
    }
  }, [permAsked, requestPermission])

  const handleOpen = () => {
    setOpen(v => !v)
    if (!open && unreadCount > 0) markAllRead()
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Cloche */}
      <button
        onClick={handleOpen}
        style={{
          position: "relative",
          background: newOrderAlert ? "rgba(245,158,11,0.15)" : "transparent",
          border: `1px solid ${newOrderAlert ? S.gold : S.border}`,
          borderRadius: 10,
          width: 40, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.3s",
          animation: newOrderAlert ? "ring 0.5s ease-in-out 3" : "none",
        }}
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", top: -4, right: -4,
            background: S.danger, color: "#fff",
            borderRadius: "50%", width: 18, height: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 800,
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {/* Alerte nouvelle commande */}
      {newOrderAlert && (
        <div style={{
          position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(135deg, ${S.gold}, ${S.goldDark})`,
          color: "#000", borderRadius: 14, padding: "12px 20px",
          fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700,
          zIndex: 9999, boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
          display: "flex", alignItems: "center", gap: 10,
          animation: "slideDown 0.3s ease-out",
        }}>
          🛒 Nouvelle commande !
        </div>
      )}

      {/* Panneau notifications */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
          <div style={{
            position: "absolute", top: 48, right: 0,
            width: 320, maxHeight: 400,
            background: S.card, border: `1px solid ${S.border}`,
            borderRadius: 16, overflow: "hidden",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            zIndex: 999,
          }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: S.text, fontSize: 14, fontWeight: 700 }}>Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ background: "none", border: "none", color: S.text2, fontSize: 12, cursor: "pointer" }}>
                  Tout marquer lu
                </button>
              )}
            </div>

            <div style={{ overflowY: "auto", maxHeight: 340 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                  <p style={{ color: S.text3, fontSize: 13, margin: 0 }}>Aucune notification</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid ${S.border}`,
                    background: n.read ? "transparent" : "rgba(245,158,11,0.04)",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                      {n.type === "nouvelle_commande" ? "🛒" : n.type === "commande_confirmee" ? "✅" : "⚠️"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: S.text, fontSize: 13, fontWeight: n.read ? 400 : 600, margin: "0 0 2px 0", lineHeight: 1.4 }}>
                        {n.message}
                      </p>
                      <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>
                        {new Date(n.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.read && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: S.gold, flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes ring {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
