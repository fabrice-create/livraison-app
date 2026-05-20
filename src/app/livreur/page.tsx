"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

type Order = {
  id: number
  customer_name: string
  phone: string
  city: string
  address: string
  product: string
  delivery_type: string
  quantity?: number | null
  amount?: number | string | null
  status?: string
  logistic_status?: string | null
  payment_status?: string | null
  assigned_driver_id?: string | null
  driver_commission?: number | null
  closer_commission?: number | null
  created_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  commission_calculated?: boolean | null
}

type DriverStock = {
  id: number
  driver_id: string
  product_name: string
  quantity: number
}

type Profile = {
  id: string
  role: string
  full_name: string
  email: string
}

export default function LivreurPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [stocks, setStocks] = useState<DriverStock[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState("dashboard")
  const [selectedActions, setSelectedActions] = useState<Record<number, string>>({})
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: string } | null>(null)
  const [periodFilter, setPeriodFilter] = useState("mois")

  useEffect(() => { void initPage() }, [])

  const fmt = (v?: number | string | null) => {
    if (v === null || v === undefined || v === "") return "-"
    return `${Number(v).toLocaleString()} FCFA`
  }
  const fmtDate = (d?: string | null) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }
  const normDT = (v?: string | null) => { const c = (v || "").trim().toLowerCase(); if (c === "direct") return "direct"; if (c === "gare") return "gare"; return c }
  const prettyDT = (v?: string | null) => { const n = normDT(v); if (n === "direct") return "Direct"; if (n === "gare") return "Gare"; return v || "-" }
  const isDirect = (v?: string | null) => normDT(v) === "direct"
  const isGare = (v?: string | null) => normDT(v) === "gare"
  const isLocked = (o: Order) => o.status === "Livré" && o.payment_status === "Payé"
  const normalizeRole = (r?: string | null) => String(r || "").trim().toLowerCase()

  const statusStyle = (s?: string | null) => {
    switch (s) {
      case "Livré": return { bg: "#052e16", color: "#4ade80" }
      case "Confirmé": return { bg: "#1e3a5f", color: "#60a5fa" }
      case "Annulé": return { bg: "#450a0a", color: "#f87171" }
      case "Payé": return { bg: "#052e16", color: "#4ade80" }
      case "Envoyé à la gare": return { bg: "#2e1065", color: "#c084fc" }
      case "Non payé": return { bg: "#450a0a", color: "#f87171" }
      default: return { bg: "#431407", color: "#fb923c" }
    }
  }

  const initPage = async () => {
    setLoading(true)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.replace("/login"); return }
    const { data: pd } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (!pd) { router.replace("/login"); return }
    const p = pd as Profile
    if (normalizeRole(p.role) !== "livreur") {
      if (normalizeRole(p.role) === "admin") router.replace("/admin")
      else if (normalizeRole(p.role) === "closureuse") router.replace("/closureuse")
      else router.replace("/login")
      return
    }
    setProfile(p)
    const { data: od } = await supabase.from("orders").select("*").eq("assigned_driver_id", user.id).order("id", { ascending: false })
    const { data: sd } = await supabase.from("driver_stock").select("*").eq("driver_id", user.id)
    const fetched = (od || []) as Order[]
    setOrders(fetched)
    setStocks((sd || []) as DriverStock[])
    const init: Record<number, string> = {}
    fetched.forEach((o) => { init[o.id] = "" })
    setSelectedActions(init)
    setLoading(false)
  }

  const filterByPeriod = (list: Order[]) => {
    const now = new Date()
    return list.filter((o) => {
      const d = o.delivered_at; if (!d) return false
      const date = new Date(d)
      if (periodFilter === "today") return date.toDateString() === now.toDateString()
      if (periodFilter === "semaine") return (now.getTime() - date.getTime()) / 86400000 <= 7
      if (periodFilter === "mois") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      return true
    })
  }

  const activeOrders = useMemo(() => orders.filter((o) => !isLocked(o)), [orders])
  const historyOrders = useMemo(() => orders.filter((o) => isLocked(o)), [orders])

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => (o.status || "En attente") === "En attente").length,
    confirmed: orders.filter((o) => o.status === "Confirmé").length,
    delivered: orders.filter((o) => o.status === "Livré").length,
    gare: orders.filter((o) => o.logistic_status === "Envoyé à la gare").length,
    totalStock: stocks.reduce((s, i) => s + Number(i.quantity || 0), 0),
    totalAmount: orders.reduce((s, i) => s + Number(i.amount || 0), 0),
  }), [orders, stocks])

  const commissionStats = useMemo(() => {
    const livrees = orders.filter((o) => o.status === "Livré" && o.driver_commission && o.driver_commission > 0)
    const filtered = filterByPeriod(livrees)
    return {
      total: filtered.reduce((s, o) => s + Number(o.driver_commission || 0), 0),
      count: filtered.length,
      allTime: livrees.reduce((s, o) => s + Number(o.driver_commission || 0), 0),
      allCount: livrees.length,
    }
  }, [orders, periodFilter])

  const consumeStock = async (order: Order) => {
    const driverId = order.assigned_driver_id
    const productName = (order.product || "").trim()
    const qty = Number(order.quantity || 1)
    if (!driverId || !productName || qty <= 0) { alert("Commande incomplète."); return false }
    const item = stocks.find((i) => i.driver_id === driverId && i.product_name.trim().toLowerCase() === productName.toLowerCase())
    if (!item) { alert("Aucun stock trouvé."); return false }
    if (Number(item.quantity) < qty) { alert("Stock insuffisant."); return false }
    const newQty = Number(item.quantity) - qty
    const { error } = await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", item.id)
    if (error) { alert("Erreur : " + error.message); return false }
    setStocks((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: newQty } : i))
    return true
  }

  const updateStatus = async (orderId: number, newStatus: string) => {
    const extra: Record<string, string | null> = {}
    if (newStatus === "Confirmé") extra.confirmed_at = new Date().toISOString()
    if (newStatus === "Annulé") extra.cancelled_at = new Date().toISOString()
    const { error } = await supabase.from("orders").update({ status: newStatus, ...extra }).eq("id", orderId)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus, ...extra } : o))
    return true
  }

  const updatePayment = async (orderId: number, ps: string, collected: boolean) => {
    const payload = { payment_status: ps, cash_collected: collected, cash_collected_at: collected ? new Date().toISOString() : null, cash_collected_by: collected ? profile?.full_name || null : null }
    const { error } = await supabase.from("orders").update(payload).eq("id", orderId)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...payload } : o))
    return true
  }

  const markDeliveredAndPaid = async (order: Order) => {
    const ok = await consumeStock(order)
    if (!ok) return false
    const now = new Date().toISOString()
    const payload = { status: "Livré", logistic_status: "Livré", payment_status: "Payé", cash_collected: true, cash_collected_at: now, cash_collected_by: profile?.full_name || null, driver_commission: 2000, closer_commission: 500, commission_calculated: true, delivered_at: now }
    const { error } = await supabase.from("orders").update(payload).eq("id", order.id)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, ...payload } : o))
    return true
  }

  const markSentToGare = async (order: Order) => {
    const ok = await consumeStock(order)
    if (!ok) return false
    const { error } = await supabase.from("orders").update({ logistic_status: "Envoyé à la gare" }).eq("id", order.id)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, logistic_status: "Envoyé à la gare" } : o))
    return true
  }

  const getActions = (order: Order) => {
    if (isLocked(order)) return []
    const actions = [{ value: "", label: "Choisir une action" }, { value: "confirmer", label: "✅ Confirmer" }, { value: "annuler", label: "❌ Annuler" }]
    if (isDirect(order.delivery_type)) actions.push({ value: "livre_paye", label: "🎯 Livré + Payé" })
    if (isGare(order.delivery_type)) { actions.push({ value: "gare", label: "🚌 Gare" }); actions.push({ value: "paye", label: "💰 Marquer Payé" }) }
    return actions
  }

  const requestAction = (order: Order) => {
    const action = selectedActions[order.id]
    if (!action) { alert("Choisis une action."); return }
    if (action === "livre_paye" || action === "annuler") setConfirmAction({ order, action })
    else void executeAction(order, action)
  }

  const executeAction = async (order: Order, action: string) => {
    setConfirmAction(null)
    if (action === "confirmer") { const ok = await updateStatus(order.id, "Confirmé"); if (ok) alert("Confirmée ✅") }
    if (action === "livre_paye") { const ok = await markDeliveredAndPaid(order); if (ok) alert("Livrée et payée ✅\nCommission 2 000 FCFA !") }
    if (action === "gare") { const ok = await markSentToGare(order); if (ok) alert("Envoyée à la gare ✅") }
    if (action === "paye") { const ok = await updatePayment(order.id, "Payé", true); if (ok) alert("Payée ✅") }
    if (action === "annuler") { const ok = await updateStatus(order.id, "Annulé"); if (ok) alert("Annulée ✅") }
    setSelectedActions((prev) => ({ ...prev, [order.id]: "" }))
  }

  const logout = async () => { await supabase.auth.signOut(); router.replace("/login") }

  const periodLabels: Record<string, string> = { today: "Aujourd'hui", semaine: "Semaine", mois: "Ce mois" }

  const navItems = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "commissions", label: "💰 Commissions" },
    { id: "commandes", label: `📦 Commandes${activeOrders.length > 0 ? ` (${activeOrders.length})` : ""}` },
    { id: "stock", label: "🗄️ Stock" },
  ]

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0f", color: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #f59e0b", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#9ca3af" }}>Chargement...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", fontFamily: "Inter, Arial, sans-serif" }}>

      {/* Confirmation */}
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#111118", border: "1px solid #2a2a3e", borderRadius: 20, padding: 28, maxWidth: 360, width: "100%" }}>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{confirmAction.action === "livre_paye" ? "🎯 Confirmer la livraison ?" : "❌ Annuler ?"}</p>
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>
              {confirmAction.action === "livre_paye" ? `Commande de ${confirmAction.order.customer_name} → Livré + Payé. Irréversible.` : `Annuler la commande de ${confirmAction.order.customer_name} ?`}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: 13, background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 12, color: "#9ca3af", cursor: "pointer", fontSize: 14 }}>Retour</button>
              <button onClick={() => executeAction(confirmAction.order, confirmAction.action)}
                style={{ padding: 13, background: confirmAction.action === "annuler" ? "#dc2626" : "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: confirmAction.action === "annuler" ? "white" : "#0a0a0f", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {confirmAction.action === "livre_paye" ? "Confirmer" : "Oui, annuler"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#111118", borderBottom: "1px solid #1e1e2e", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#0a0a0f", flexShrink: 0 }}>
            {profile?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{profile?.full_name}</p>
            <p style={{ fontSize: 11, color: "#9ca3af" }}>🚚 Livreur</p>
          </div>
        </div>
        <button onClick={logout} style={{ padding: "7px 14px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 20, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>
          Déconnexion
        </button>
      </div>

      {/* Nav tabs */}
      <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid #1e1e2e", background: "#111118", padding: "0 4px" }}>
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveView(item.id)}
            style={{ padding: "14px 16px", border: "none", borderBottom: activeView === item.id ? "2px solid #f59e0b" : "2px solid transparent", background: "transparent", color: activeView === item.id ? "#f59e0b" : "#9ca3af", fontWeight: activeView === item.id ? 700 : 500, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>

        {/* DASHBOARD */}
        {activeView === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#1a1200", border: "1px solid #f59e0b30", borderRadius: 16, padding: 18 }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>📦 Total</p>
                <p style={{ fontSize: 36, fontWeight: 700 }}>{stats.total}</p>
              </div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 18 }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>⏳ En attente</p>
                <p style={{ fontSize: 36, fontWeight: 700, color: "#fb923c" }}>{stats.pending}</p>
              </div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 18 }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>✅ Confirmées</p>
                <p style={{ fontSize: 36, fontWeight: 700, color: "#60a5fa" }}>{stats.confirmed}</p>
              </div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 18 }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>🎯 Livrées</p>
                <p style={{ fontSize: 36, fontWeight: 700, color: "#4ade80" }}>{stats.delivered}</p>
              </div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 18 }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>🚌 Gare</p>
                <p style={{ fontSize: 36, fontWeight: 700, color: "#c084fc" }}>{stats.gare}</p>
              </div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 18 }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>🗄️ Stock</p>
                <p style={{ fontSize: 36, fontWeight: 700 }}>{stats.totalStock}</p>
              </div>
            </div>
            <div style={{ background: "#1a1200", border: "1px solid #f59e0b30", borderRadius: 16, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Montant total de mes commandes</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{fmt(stats.totalAmount)}</p>
              </div>
              <span style={{ fontSize: 36 }}>💵</span>
            </div>
          </div>
        )}

        {/* COMMISSIONS */}
        {activeView === "commissions" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#111118", borderRadius: 12, padding: 4 }}>
              {Object.entries(periodLabels).map(([key, label]) => (
                <button key={key} onClick={() => setPeriodFilter(key)}
                  style={{ flex: 1, padding: "10px 6px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, background: periodFilter === key ? "#f59e0b" : "transparent", color: periodFilter === key ? "#0a0a0f" : "#6b7280" }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div style={{ background: "linear-gradient(135deg, #052e16, #065f46)", border: "1px solid #4ade8040", borderRadius: 18, padding: 20 }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>Gagné — {periodLabels[periodFilter]}</p>
                <p style={{ fontSize: 28, fontWeight: 700 }}>{fmt(commissionStats.total)}</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{commissionStats.count} livraison(s)</p>
              </div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 18, padding: 20 }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>Total général</p>
                <p style={{ fontSize: 28, fontWeight: 700 }}>{fmt(commissionStats.allTime)}</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{commissionStats.allCount} livraison(s)</p>
              </div>
            </div>
            <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 14, padding: 16, fontSize: 14, color: "#9ca3af", lineHeight: 1.6, display: "flex", gap: 10 }}>
              <span>💡</span>
              <p>2 000 FCFA par commande <strong style={{ color: "white" }}>Livré + Payé</strong>. Automatique et irréversible.</p>
            </div>
            {historyOrders.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12, fontWeight: 600 }}>DERNIÈRES LIVRAISONS</p>
                {historyOrders.slice(0, 8).map((o) => (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1e1e2e" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{o.customer_name}</p>
                      <p style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(o.delivered_at)}</p>
                    </div>
                    <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 16 }}>{fmt(o.driver_commission)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMMANDES */}
        {activeView === "commandes" && (
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              En cours <span style={{ background: "#f59e0b", color: "#0a0a0f", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20, marginLeft: 8 }}>{activeOrders.length}</span>
            </p>
            {activeOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🎉</p>
                <p>Toutes les commandes sont traitées !</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {activeOrders.map((order) => {
                  const ss = statusStyle(order.status)
                  const ls = statusStyle(order.logistic_status)
                  const ps = statusStyle(order.payment_status)
                  return (
                    <div key={order.id} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{order.customer_name}</p>
                          <p style={{ fontSize: 13, color: "#9ca3af" }}>📍 {order.city} · {order.phone}</p>
                        </div>
                        <span style={{ background: ss.bg, color: ss.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {order.status || "En attente"}
                        </span>
                      </div>
                      <div style={{ background: "#0a0a0f", borderRadius: 12, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 7 }}>
                        <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>📦</span><span>{order.product} × {order.quantity || 1}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 14 }}><span>💵</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>{fmt(order.amount)}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>🚚</span><span>{prettyDT(order.delivery_type)}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>🏠</span><span>{order.address}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#6b7280" }}><span>📅</span><span>{fmtDate(order.created_at)}</span></div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        <span style={{ background: ls.bg, color: ls.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{order.logistic_status || "En attente"}</span>
                        <span style={{ background: ps.bg, color: ps.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{order.payment_status || "Non payé"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select value={selectedActions[order.id] || ""} onChange={(e) => setSelectedActions((p) => ({ ...p, [order.id]: e.target.value }))}
                          style={{ flex: 1, padding: "11px 12px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 12, color: "white", fontSize: 14, outline: "none" }}>
                          {getActions(order).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                        <button onClick={() => requestAction(order)}
                          style={{ padding: "11px 18px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                          OK
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {historyOrders.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#6b7280", marginBottom: 16 }}>
                  🔒 Historique <span style={{ background: "#1e1e2e", color: "#6b7280", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20, marginLeft: 8 }}>{historyOrders.length}</span>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {historyOrders.map((order) => (
                    <div key={order.id} style={{ background: "#111118", border: "1px solid #052e16", borderRadius: 16, padding: 16, opacity: 0.8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, color: "#9ca3af" }}>{order.customer_name}</p>
                          <p style={{ fontSize: 13, color: "#6b7280" }}>📍 {order.city}</p>
                        </div>
                        <span style={{ background: "#052e16", color: "#4ade80", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>🔒 Finalisée</span>
                      </div>
                      <div style={{ background: "#0a0a0f", borderRadius: 12, padding: 12, marginBottom: 10, display: "flex", flexDirection: "column", gap: 6, opacity: 0.7 }}>
                        <div style={{ display: "flex", gap: 8, fontSize: 13, color: "#e5e7eb" }}><span>📦</span><span>{order.product} × {order.quantity || 1}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 13 }}><span>💵</span><span style={{ color: "#f59e0b" }}>{fmt(order.amount)}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#6b7280" }}><span>📅</span><span>Créée : {fmtDate(order.created_at)}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#4ade80" }}><span>✅</span><span>Livrée : {fmtDate(order.delivered_at)}</span></div>
                      </div>
                      {order.driver_commission ? (
                        <div style={{ background: "#052e16", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#4ade80", fontWeight: 600 }}>
                          💰 Commission : {fmt(order.driver_commission)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STOCK */}
        {activeView === "stock" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {stocks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280", gridColumn: "1/-1" }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
                <p>Aucun stock disponible</p>
              </div>
            ) : stocks.map((s) => (
              <div key={s.id} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 20, textAlign: "center" }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>📦</p>
                <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>{s.product_name}</p>
                <p style={{ fontSize: 40, fontWeight: 700, color: s.quantity > 0 ? "#f59e0b" : "#f87171" }}>{s.quantity}</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>unités</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}