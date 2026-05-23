"use client"

// ============================================================
// SHIPIVO — Admin : CommandesView
// ============================================================

import type { Order, Profile, OrderHistory } from "@/types"
import OrderCard from "@/components/order/OrderCard"
import { isEnCours, isHistorique, isDirect, isGare, inputStyle } from "@/lib/utils"
import { useMemo, useState } from "react"

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

  const enCoursOrders    = useMemo(() => orders.filter(isEnCours),    [orders])
  const historiqueOrders = useMemo(() => orders.filter(isHistorique), [orders])

  const filterFn = (o: typeof orders[0]) => {
    const matchDriver = driverFilter === "Tous" || o.driver_name === driverFilter
    const q = search.trim().toLowerCase()
    const matchSearch = q === "" || [o.customer_name, o.phone, o.city, o.driver_name || "", o.product].join(" ").toLowerCase().includes(q)
    return matchDriver && matchSearch
  }

  const now = new Date()
  const todayStr = now.toDateString()

  const section1 = enCoursOrders.filter(o => new Date(o.created_at || "").toDateString() === todayStr && o.status === "En attente").filter(filterFn)
  const section2 = enCoursOrders.filter(o => { const h = (now.getTime() - new Date(o.created_at || "").getTime()) / 3600000; return h > 24 && o.status === "En attente" }).filter(filterFn)
  const section3 = enCoursOrders.filter(o => o.status === "Confirmé").filter(filterFn)
  const sectionHist = historiqueOrders.filter(filterFn)

  const visibleOrders = localStatusState === "encours"
    ? [...section1, ...section2, ...section3]
    : sectionHist

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
      ) : localStatusState === "historique" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {sectionHist.map(order => (
            <OrderCard key={order.id} order={order} drivers={drivers}
              selectedDriver={selectedDrivers[order.id] || ""} selectedAction={selectedActions[order.id] || ""}
              actions={getActions(order)} onEditClick={onEditClick}
              onDriverChange={(id) => onDriverChange(order.id, id)}
              onActionChange={(a) => onActionChange(order.id, a)}
              onActionSubmit={() => onActionSubmit(order)}
              history={history.filter(h => h.order_id === order.id)}
              showEditButton showActions />
          ))}
        </div>
      ) : (
        <div>
          {section1.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 14px", background: "#1a1200", borderRadius: 10, borderLeft: "3px solid #F59E0B" }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700, letterSpacing: "0.06em" }}>AUJOURD&apos;HUI — {section1.length} commande(s)</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {section1.map(order => (
                  <OrderCard key={order.id} order={order} drivers={drivers}
                    selectedDriver={selectedDrivers[order.id] || ""} selectedAction={selectedActions[order.id] || ""}
                    actions={getActions(order)} onEditClick={onEditClick}
                    onDriverChange={(id) => onDriverChange(order.id, id)}
                    onActionChange={(a) => onActionChange(order.id, a)}
                    onActionSubmit={() => onActionSubmit(order)}
                    history={history.filter(h => h.order_id === order.id)}
                    showEditButton showActions />
                ))}
              </div>
            </div>
          )}

          {section2.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 14px", background: "#2D0F0F", borderRadius: 10, borderLeft: "3px solid #F87171" }}>
                <span style={{ fontSize: 14 }}>🔴</span>
                <span style={{ fontSize: 12, color: "#F87171", fontWeight: 700, letterSpacing: "0.06em" }}>EN RETARD +24H — {section2.length} commande(s)</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {section2.map(order => (
                  <OrderCard key={order.id} order={order} drivers={drivers}
                    selectedDriver={selectedDrivers[order.id] || ""} selectedAction={selectedActions[order.id] || ""}
                    actions={getActions(order)} onEditClick={onEditClick}
                    onDriverChange={(id) => onDriverChange(order.id, id)}
                    onActionChange={(a) => onActionChange(order.id, a)}
                    onActionSubmit={() => onActionSubmit(order)}
                    history={history.filter(h => h.order_id === order.id)}
                    showEditButton showActions />
                ))}
              </div>
            </div>
          )}

          {section3.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 14px", background: "#0C1E3E", borderRadius: 10, borderLeft: "3px solid #60A5FA" }}>
                <span style={{ fontSize: 14 }}>✅</span>
                <span style={{ fontSize: 12, color: "#60A5FA", fontWeight: 700, letterSpacing: "0.06em" }}>CONFIRMÉES — {section3.length} commande(s)</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {section3.map(order => (
                  <OrderCard key={order.id} order={order} drivers={drivers}
                    selectedDriver={selectedDrivers[order.id] || ""} selectedAction={selectedActions[order.id] || ""}
                    actions={getActions(order)} onEditClick={onEditClick}
                    onDriverChange={(id) => onDriverChange(order.id, id)}
                    onActionChange={(a) => onActionChange(order.id, a)}
                    onActionSubmit={() => onActionSubmit(order)}
                    history={history.filter(h => h.order_id === order.id)}
                    showEditButton showActions />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Hook local simple pour éviter de remonter les filtres dans le parent
function useLocalState<T>(initial: T): [T, (v: T) => void] {
  return useState(initial)
}
