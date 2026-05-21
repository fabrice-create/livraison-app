"use client"

// ============================================================
// SHIPIVO — Admin : DashboardView
// ============================================================

import type { Order, DriverStock } from "@/types"
import { fmt, isEnCours, isToday } from "@/lib/utils"
import { useMemo } from "react"

type Props = {
  orders: Order[]
  driverStocks: DriverStock[]
}

export default function DashboardView({ orders, driverStocks }: Props) {
  const todayStats = useMemo(() => ({
    created:   orders.filter((o) => isToday(o.created_at)).length,
    delivered: orders.filter((o) => isToday(o.delivered_at)).length,
    amount:    orders.filter((o) => isToday(o.delivered_at) && o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0),
  }), [orders])

  const dashStats = useMemo(() => ({
    total:           orders.length,
    enCours:         orders.filter(isEnCours).length,
    confirmed:       orders.filter((o) => o.status === "Confirmé").length,
    delivered:       orders.filter((o) => o.status === "Livré").length,
    gare:            orders.filter((o) => o.logistic_status === "Envoyé à la gare").length,
    collected:       orders.filter((o) => o.cash_collected === true).length,
    amountCollected: orders.filter((o) => o.cash_collected === true).reduce((s, o) => s + Number(o.amount || 0), 0),
    amountPending:   orders.filter((o) => o.cash_collected !== true && isEnCours(o)).reduce((s, o) => s + Number(o.amount || 0), 0),
    stockByDriver:   driverStocks.reduce((acc: Record<string, number>, i) => {
      acc[i.driver_name] = (acc[i.driver_name] || 0) + Number(i.quantity || 0)
      return acc
    }, {}),
  }), [orders, driverStocks])

  return (
    <div>
      {/* Aujourd'hui */}
      <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>AUJOURD'HUI</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="📝 Créées"   value={todayStats.created}   />
        <StatCard label="🎯 Livrées"  value={todayStats.delivered} color="#4ade80" bg="#052e16" border="#4ade8030" />
        <StatCard label="💵 Encaissé" value={fmt(todayStats.amount)} color="#f59e0b" bg="#1a1200" border="#f59e0b30" small />
      </div>

      {/* Global */}
      <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>GLOBAL</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="📦 Total"       value={dashStats.total}     bg="#1a1200"  border="#f59e0b30" />
        <StatCard label="⚡ En cours"    value={dashStats.enCours}   color="#fb923c" />
        <StatCard label="✅ Confirmées"  value={dashStats.confirmed} color="#60a5fa" />
        <StatCard label="🎯 Livrées"     value={dashStats.delivered} color="#4ade80" />
        <StatCard label="🚌 Gare"        value={dashStats.gare}      color="#c084fc" />
        <StatCard label="💰 Encaissées"  value={dashStats.collected} color="#4ade80" />
      </div>

      {/* Montants */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #052e16, #065f46)", border: "1px solid #4ade8040", borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>💵 Montant encaissé</p>
          <p style={{ fontSize: 26, fontWeight: 700 }}>{fmt(dashStats.amountCollected)}</p>
        </div>
        <div style={{ background: "linear-gradient(135deg, #450a0a, #7f1d1d)", border: "1px solid #f8717130", borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>⏳ En attente de livraison</p>
          <p style={{ fontSize: 26, fontWeight: 700 }}>{fmt(dashStats.amountPending)}</p>
        </div>
      </div>

      {/* Stock par livreur */}
      <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>STOCK PAR LIVREUR</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        {Object.entries(dashStats.stockByDriver).map(([driver, qty]) => (
          <div key={driver} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 14, padding: 16, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>{driver}</p>
            <p style={{ fontSize: 30, fontWeight: 700, color: "#f59e0b" }}>{qty}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Sous-composant carte stat ----
type StatCardProps = {
  label: string
  value: string | number
  color?: string
  bg?: string
  border?: string
  small?: boolean
}

function StatCard({ label, value, color = "white", bg = "#111118", border = "#1e1e2e", small = false }: StatCardProps) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: 16, textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: small ? 18 : 32, fontWeight: 700, color }}>{value}</p>
    </div>
  )
}
