"use client"

// ============================================================
// SHIPIVO — OrderCard (utilisée dans Admin, Closureuse, Livreur)
// ============================================================

import type { Order, Profile } from "@/types"
import StatusBadge from "@/components/ui/StatusBadge"
import {
  fmt, fmtDate, prettyDT,
  isEnCours, statusStyle,
  callUrl, waUrl, clientWaMsg,
  sanitizePhone,
} from "@/lib/utils"

type Props = {
  order: Order
  drivers?: Profile[]
  selectedDriver?: string
  selectedAction?: string
  actions?: { value: string; label: string }[]

  // Callbacks optionnels selon le rôle
  onEditClick?: (order: Order) => void
  onDriverChange?: (driverId: string) => void
  onActionChange?: (action: string) => void
  onActionSubmit?: () => void

  // Historique (admin seulement)
  history?: { id: number; action_by_name: string; action_type: string; action_details: string; created_at: string }[]

  // Options d'affichage
  showEditButton?: boolean
  showAssign?: boolean
  showActions?: boolean
  showCommission?: boolean
  driverPhone?: string | null
}

export default function OrderCard({
  order,
  drivers = [],
  selectedDriver = "",
  selectedAction = "",
  actions = [],
  onEditClick,
  onDriverChange,
  onActionChange,
  onActionSubmit,
  history = [],
  showEditButton = false,
  showAssign = false,
  showActions = false,
  showCommission = false,
  driverPhone,
}: Props) {
  const enCours = isEnCours(order)
  const ss = statusStyle(order.status)
  const ls = statusStyle(order.logistic_status)
  const ps = statusStyle(order.payment_status)

  return (
    <div style={{
      background: "#111118",
      border: `1px solid ${enCours ? "#f59e0b20" : "#1e1e2e"}`,
      borderRadius: 16,
      padding: 16,
      opacity: enCours ? 1 : 0.9,
    }}>
      {/* En-tête client */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 8 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{order.customer_name}</p>
          <p style={{ fontSize: 13, color: "#9ca3af" }}>📍 {order.city} · {order.phone}</p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <StatusBadge value={order.status} />
          {showEditButton && enCours && onEditClick && (
            <button
              onClick={() => onEditClick(order)}
              style={{ padding: "4px 8px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 20, color: "#9ca3af", fontSize: 11, cursor: "pointer" }}
            >
              ✏️
            </button>
          )}
        </div>
      </div>

      {/* Détails commande */}
      <div style={{ background: "#0a0a0f", borderRadius: 12, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>📦</span><span>{order.product} × {order.quantity || 1}</span></div>
        <div style={{ display: "flex", gap: 8, fontSize: 14 }}><span>💵</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>{fmt(order.amount)}</span></div>
        <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>🚚</span><span>{prettyDT(order.delivery_type)}</span></div>
        <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>👤</span><span>{order.driver_name || "Non assigné"}</span></div>
        {order.address && (
          <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>🏠</span><span>{order.address}</span></div>
        )}
        <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#6b7280" }}><span>📅</span><span>Créée : {fmtDate(order.created_at)}</span></div>
        {order.confirmed_at && <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#60a5fa" }}><span>✅</span><span>Confirmée : {fmtDate(order.confirmed_at)}</span></div>}
        {order.delivered_at && <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#4ade80" }}><span>🎯</span><span>Finalisée : {fmtDate(order.delivered_at)}</span></div>}
        {order.cancelled_at && <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#f87171" }}><span>❌</span><span>Annulée : {fmtDate(order.cancelled_at)}</span></div>}
        {(order.driver_commission || order.closer_commission) ? (
          <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#4ade80" }}>
            <span>💰</span>
            <span>Livreur : {fmt(order.driver_commission)} · Closureuse : {fmt(order.closer_commission)}</span>
          </div>
        ) : null}
      </div>

      {/* Badges statut logistique + paiement */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <span style={{ background: ls.bg, color: ls.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{order.logistic_status || "En attente"}</span>
        <span style={{ background: ps.bg, color: ps.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{order.payment_status || "Non payé"}</span>
      </div>

      {/* Boutons contact client */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <a href={callUrl(order.phone)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 10px", background: "#1e3a5f", border: "1px solid #60a5fa30", borderRadius: 10, color: "#60a5fa", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          📞 Client
        </a>
        <a href={waUrl(order.phone, clientWaMsg(order))} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 10px", background: "#052e16", border: "1px solid #4ade8030", borderRadius: 10, color: "#4ade80", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          💬 WhatsApp
        </a>
      </div>

      {/* Bouton appel livreur */}
      {driverPhone && (
        <div style={{ marginBottom: 10 }}>
          <a href={callUrl(driverPhone)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 10px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 10, color: "#9ca3af", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            📞 Appeler {order.driver_name || "Livreur"}
          </a>
        </div>
      )}

      {/* Commission closureuse */}
      {showCommission && order.closer_commission ? (
        <div style={{ background: "#1e3a5f", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#60a5fa", fontWeight: 600, marginBottom: 10 }}>
          💰 Ma commission : {fmt(order.closer_commission)}
        </div>
      ) : null}

      {/* Zone actions (admin + livreur) */}
      {showActions && enCours && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={selectedAction}
            onChange={(e) => onActionChange?.(e.target.value)}
            style={{ flex: 1, minWidth: 130, padding: "10px 10px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 10, color: "white", fontSize: 13, outline: "none" }}
          >
            {actions.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          {drivers.length > 0 && (
            <select
              value={selectedDriver}
              onChange={(e) => onDriverChange?.(e.target.value)}
              style={{ flex: 1, minWidth: 110, padding: "10px 10px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 10, color: "white", fontSize: 13, outline: "none" }}
            >
              <option value="">Livreur...</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          )}
          <button
            onClick={onActionSubmit}
            style={{ padding: "10px 16px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 10, color: "#0a0a0f", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            OK
          </button>
        </div>
      )}

      {/* Zone assignation (closureuse) */}
      {showAssign && enCours && drivers.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <select
            value={selectedDriver}
            onChange={(e) => onDriverChange?.(e.target.value)}
            style={{ flex: 1, padding: "11px 12px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 12, color: "white", fontSize: 14, outline: "none" }}
          >
            <option value="">Choisir livreur</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
          <button
            onClick={onActionSubmit}
            style={{ padding: "11px 18px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            OK
          </button>
        </div>
      )}

      {/* Historique actions (admin) */}
      {history.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1e1e2e" }}>
          <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>HISTORIQUE ACTIONS</p>
          {history.slice(0, 2).map((h) => (
            <div key={h.id} style={{ padding: "5px 0", borderBottom: "1px solid #1a1a2e" }}>
              <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 1 }}>{h.action_by_name} — {h.action_type}</p>
              <p style={{ fontSize: 11, color: "#6b7280" }}>{h.action_details} · {fmtDate(h.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
