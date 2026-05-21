"use client"

// ============================================================
// SHIPIVO — Admin : CommandesView
// ============================================================

import type { Order, Profile, OrderHistory } from "@/types"
import OrderCard from "@/components/order/OrderCard"
import { isEnCours, isHistorique, isDirect, isGare, inputStyle } from "@/lib/utils"
import { useMemo } from "react"

type Props = {
  orders: Order[]
  drivers: Profile[]
  history: OrderHistory[]
  selectedDrivers: Record<number, string>
  selectedActions: Record<number, string>
  onDriverChange: (orderId: number, driverId: string) => void
  onActionChange: (orderId: number, action: string) => void
  onActionSubmit: (order: Order) => void
  onEditClick: (order: Order) => void
}

export default function CommandesView({
  orders, drivers, history,
  selectedDrivers, selectedActions,
  onDriverChange, onActionChange, onActionSubmit, onEditClick,
}: Props) {
  const [statusFilter, setStatusFilter] = useMemo(() => {
    // On expose les setters via useState dans le parent — ici on reçoit tout
    return ["encours", () => {}] as const
  }, [])

  // Filtres locaux
  const [localStatus, setLocalStatus] = [
    useMemo(() => "encours", []),
    (v: string) => setLocalStatusState(v),
  ] as const

  // États locaux de filtre
  const [localStatusState, setLocalStatusState] = useLocalState("encours")
  const [driverFilter, setDriverFilter]         = useLocalState("Tous")
  const [search, setSearch]                     = useLocalState("")

  const enCoursOrders   = useMemo(() => orders.filter(isEnCours),   [orders])
  const historiqueOrders = useMemo(() => orders.filter(isHistorique), [orders])

  const visibleOrders = useMemo(() => {
    const base = localStatusState === "encours" ? enCoursOrders : historiqueOrders
    return base.filter((o) => {
      const matchDriver = driverFilter === "Tous" || o.driver_name === driverFilter
      const q = search.trim().toLowerCase()
      const matchSearch = q === "" || [o.customer_name, o.phone, o.city, o.driver_name || "", o.product, String(o.amount || "")].join(" ").toLowerCase().includes(q)
      return matchDriver && matchSearch
    })
  }, [orders, localStatusState, driverFilter, search, enCoursOrders, historiqueOrders])

  const getActions = (order: Order) => {
    const actions = [
      { value: "",          label: "Choisir une action" },
      { value: "confirmer", label: "✅ Confirmer" },
      { value: "annuler",   label: "❌ Annuler" },
    ]
    if (isDirect(order.delivery_type)) actions.push({ value: "livre_paye", label: "🎯 Livré + Payé" })
    if (isGare(order.delivery_type))   actions.push({ value: "gare",       label: "🚌 Envoyé à la gare" })
    actions.push({ value: "assigner", label: "👤 Assigner livreur" })
    return actions
  }

  return (
    <div>
      {/* Recherche */}
      <input
        type="text" placeholder="🔍 Recherche nom, ville, produit..."
        value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom: 12 }}
      />

      {/* Toggle En cours / Historique */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, background: "#111118", borderRadius: 12, padding: 4, maxWidth: 360 }}>
        {[
          { id: "encours",    label: `⚡ En cours (${enCoursOrders.length})` },
          { id: "historique", label: `📋 Historique (${historiqueOrders.length})` },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setLocalStatusState(tab.id)}
            style={{ flex: 1, padding: "10px 6px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: localStatusState === tab.id ? "#f59e0b" : "transparent",
              color:      localStatusState === tab.id ? "#0a0a0f"  : "#6b7280" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtre livreur */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
        {["Tous", ...drivers.map((d) => d.full_name)].map((name) => (
          <button key={name} onClick={() => setDriverFilter(name)}
            style={{ padding: "8px 14px", border: "1px solid", borderRadius: 20, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0, fontWeight: driverFilter === name ? 700 : 400,
              borderColor: driverFilter === name ? "#f59e0b" : "#2a2a3e",
              background:  driverFilter === name ? "#f59e0b" : "#111118",
              color:       driverFilter === name ? "#0a0a0f" : "#6b7280" }}>
            {name === "Tous" ? "Tous livreurs" : name}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>{visibleOrders.length} commande(s)</p>

      {visibleOrders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <p>Aucune commande</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              drivers={drivers}
              selectedDriver={selectedDrivers[order.id] || ""}
              selectedAction={selectedActions[order.id] || ""}
              actions={getActions(order)}
              onEditClick={onEditClick}
              onDriverChange={(id) => onDriverChange(order.id, id)}
              onActionChange={(a) => onActionChange(order.id, a)}
              onActionSubmit={() => onActionSubmit(order)}
              history={history.filter((h) => h.order_id === order.id)}
              showEditButton
              showActions
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Hook local simple pour éviter de remonter les filtres dans le parent
function useLocalState<T>(initial: T): [T, (v: T) => void] {
  const { useState } = require("react")
  return useState(initial)
}
