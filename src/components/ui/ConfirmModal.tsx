"use client"

// ============================================================
// SHIPIVO — ConfirmModal
// ============================================================

type Props = {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmer",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 20,
    }}>
      <div style={{
        background: "#111118",
        border: "1px solid #2a2a3e",
        borderRadius: 20,
        padding: 28,
        maxWidth: 380,
        width: "100%",
      }}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</p>
        <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: 13,
              background: "#1e1e2e",
              border: "1px solid #2a2a3e",
              borderRadius: 12,
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Retour
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: 13,
              background: danger
                ? "#dc2626"
                : "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none",
              borderRadius: 12,
              color: danger ? "white" : "#0a0a0f",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
