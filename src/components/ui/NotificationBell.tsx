"use client"

import { useEffect, useState } from "react"
import { useNotifications } from "@/hooks/useNotifications"

const S = {
  gold: "#F59E0B", goldDark: "#D97706",
  card: "#111118", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", success: "#4ADE80",
}

export default function NotificationBell({ tenantId }: { tenantId: string }) {
  const { notifications, unreadCount, newOrderAlert, markAllRead, requestPermission } = useNotifications(tenantId)
  const [open, setOpen] = useState(false)

  useEffect(() => { requestPermission() }, [requestPermission])

  const handleOpen = () => {
    setOpen(v => !v)
    if (!open && unreadCount > 0) markAllRead()
  }

  return (
    <div style={{ position: "relative", fontFamily: "Inter, sans-serif" }}>
      {/* Bouton cloche */}
      <button onClick={handleOpen} style={{
        position: "relative", background: "transparent",
        border: `1px solid ${S.border}`, borderRadius: 10,
        width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}>
        <span style={{ fontSize: 18 }}>🔔</span>
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", top: -5, right: -5,
            background: S.danger, color: "#fff",
            borderRadius: "50%", width: 18, height: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 800, border: "2px solid #0A0A0F",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {/* Bannière nouvelle commande */}
      {newOrderAlert && (
        <div style={{
          position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(135deg,${S.gold},${S.goldDark})`,
          color: "#000", borderRadius: 14, padding: "12px 20px",
          fontSize: 14, fontWeight: 700, zIndex: 9999,
          boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
          display: "flex", alignItems: "center", gap: 10,
          animation: "slideDown 0.3s ease-out",
          whiteSpace: "nowrap" as const,
        }}>
          🛒 Nouvelle commande — {newOrderAlert}
        </div>
      )}

      {/* Panneau */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
          <div style={{
            position: "absolute", top: 48, right: 0, width: 300,
            background: S.card, border: `1px solid ${S.border}`,
            borderRadius: 16, overflow: "hidden",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)", zIndex: 999,
          }}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: S.text, fontSize: 13, fontWeight: 700 }}>Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ background: "none", border: "none", color: S.text2, fontSize: 11, cursor: "pointer" }}>
                  Tout lire
                </button>
              )}
            </div>
            <div style={{ overflowY: "auto", maxHeight: 360 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔕</div>
                  <p style={{ color: S.text3, fontSize: 13, margin: 0 }}>Aucune notification</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{
                    padding: "10px 14px", borderBottom: `1px solid ${S.border}`,
                    background: n.read ? "transparent" : "rgba(245,158,11,0.04)",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {n.type === "nouvelle_commande" ? "🛒" : "📢"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: S.text, fontSize: 13, fontWeight: n.read ? 400 : 600, margin: "0 0 2px 0", lineHeight: 1.4 }}>
                        {n.body}
                      </p>
                      <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>
                        {new Date(n.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: S.gold, flexShrink: 0, marginTop: 3 }} />}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
