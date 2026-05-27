"use client"

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
  const [activeTab, setActiveTab]       = useState("aujourd_hui")
  const [driverFilter, setDriverFilter] = useState("Tous")
  const [search, setSearch]             = useState("")
  const [produitFilter, setProduitFilter] = useState("tous")

  const enCoursOrders    = useMemo(() => orders.filter(isEnCours),    [orders])
  const historiqueOrders = useMemo(() => orders.filter(isHistorique), [orders])

  const filterFn = (o: Order) => {
    const matchDriver = driverFilter === "Tous" || o.driver_name === driverFilter
    const matchProduit = produitFilter === "tous" || (o.product || "").toLowerCase().includes(produitFilter.toLowerCase())
    const q = search.trim().toLowerCase()
    return matchDriver && matchProduit && (q === "" || [o.customer_name, o.phone, o.city, o.driver_name || "", o.product].join(" ").toLowerCase().includes(q))
  }

  // Produits uniques pour le filtre
  const produitsUniques = useMemo(() => Array.from(new Set(orders.map(o => o.product || "").filter(Boolean))).sort(), [orders])

  const now      = new Date()
  const todayStr = now.toDateString()

  const section1    = enCoursOrders.filter(o => new Date(o.created_at || "").toDateString() === todayStr && o.status === "En attente").filter(filterFn)
  const section2    = enCoursOrders.filter(o => { const h = (now.getTime() - new Date(o.created_at || "").getTime()) / 3600000; return h > 24 && o.status === "En attente" }).filter(filterFn)
  const section3    = enCoursOrders.filter(o => o.status === "Confirmé").filter(filterFn)
  const sectionHist = historiqueOrders.filter(filterFn)

  const visibleOrders = activeTab === "aujourd_hui" ? section1
    : activeTab === "retard"    ? section2
    : activeTab === "confirme"  ? section3
    : sectionHist

  const TABS = [
    { id: "aujourd_hui", label: "⚡ Aujourd'hui", count: section1.length,    color: "#F59E0B", bg: "#1a1200" },
    { id: "retard",      label: "🔴 En retard",   count: section2.length,    color: "#F87171", bg: "#2D0F0F" },
    { id: "confirme",    label: "✅ Confirmées",   count: section3.length,    color: "#60A5FA", bg: "#0C1E3E" },
    { id: "historique",  label: "📋 Historique",   count: sectionHist.length, color: "#9ca3af", bg: "#111118" },
  ]

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
      <input type="text" placeholder="🔍 Recherche nom, ville, produit..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 14px", color:"#F8F8FC", fontSize:13, outline:"none", marginBottom:10, boxSizing:"border-box" }} />

      {/* Filtre par produit */}
      {produitsUniques.length > 1 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
          <button onClick={() => setProduitFilter("tous")}
            style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${produitFilter==="tous"?"#F59E0B":"rgba(255,255,255,0.1)"}`, background:produitFilter==="tous"?"rgba(245,158,11,0.12)":"transparent", color:produitFilter==="tous"?"#F59E0B":"#9898B0", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            Tous ({orders.length})
          </button>
          {produitsUniques.map(p => {
            const count = orders.filter(o => (o.product||"").toLowerCase().includes(p.toLowerCase())).length
            return (
              <button key={p} onClick={() => setProduitFilter(p)}
                style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${produitFilter===p?"#F59E0B":"rgba(255,255,255,0.1)"}`, background:produitFilter===p?"rgba(245,158,11,0.12)":"transparent", color:produitFilter===p?"#F59E0B":"#9898B0", fontSize:12, fontWeight:600, cursor:"pointer", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {p} ({count})
              </button>
            )
          })}
        </div>
      )}
        style={{ ...inputStyle, marginBottom: 12 }} />

      {/* 4 onglets */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: "9px 16px", border: `1px solid ${activeTab === tab.id ? tab.color : "#2a2a3e"}`,
              borderRadius: 20, cursor: "pointer", fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 400,
              whiteSpace: "nowrap", flexShrink: 0,
              background: activeTab === tab.id ? tab.bg : "#111118",
              color: activeTab === tab.id ? tab.color : "#6b7280" }}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{ marginLeft: 6, background: activeTab === tab.id ? tab.color : "#2a2a3e",
                color: activeTab === tab.id ? "#000" : "#9ca3af",
                padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filtre livreur */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
        {["Tous", ...drivers.map(d => d.full_name)].map(name => (
          <button key={name} onClick={() => setDriverFilter(name)}
            style={{ padding: "8px 14px", border: "1px solid", borderRadius: 20, cursor: "pointer",
              fontSize: 13, whiteSpace: "nowrap", flexShrink: 0,
              fontWeight: driverFilter === name ? 700 : 400,
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
          <p>Aucune commande dans cet onglet</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {visibleOrders.map(order => (
            <OrderCard key={order.id} order={order} drivers={drivers}
              selectedDriver={selectedDrivers[order.id] || ""}
              selectedAction={selectedActions[order.id] || ""}
              actions={getActions(order)}
              onEditClick={onEditClick}
              onDriverChange={id => onDriverChange(order.id, id)}
              onActionChange={a => onActionChange(order.id, a)}
              onActionSubmit={() => onActionSubmit(order)}
              history={history.filter(h => h.order_id === order.id)}
              showEditButton showActions />
          ))}
        </div>
      )}
    </div>
  )
}
