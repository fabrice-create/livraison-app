"use client"

// ============================================================
// SHIPIVO — AppHeader
// ============================================================

type Props = {
  name: string
  roleLabel: string   // ex: "🛒 Administrateur" | "💼 Closureuse" | "🚚 Livreur"
  onLogout: () => void
}

export default function AppHeader({ name, roleLabel, onLogout }: Props) {
  return (
    <div style={{
      background: "#111118",
      borderBottom: "1px solid #1e1e2e",
      padding: "14px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 15, color: "#0a0a0f", flexShrink: 0,
        }}>
          {name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{name}</p>
          <p style={{ fontSize: 11, color: "#9ca3af" }}>{roleLabel}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        style={{
          padding: "7px 14px",
          background: "#1e1e2e",
          border: "1px solid #2a2a3e",
          borderRadius: 20,
          color: "#9ca3af",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Déconnexion
      </button>
    </div>
  )
}
