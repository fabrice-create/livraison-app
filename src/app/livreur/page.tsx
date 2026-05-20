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
  confirmed_at?: string | null
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      case "Livré": return { bg: "#052e16", color: "#4ade80", label: "Livré" }
      case "Confirmé": return { bg: "#1e3a5f", color: "#60a5fa", label: "Confirmé" }
      case "Annulé": return { bg: "#450a0a", color: "#f87171", label: "Annulé" }
      case "Payé": return { bg: "#052e16", color: "#4ade80", label: "Payé" }
      case "Envoyé à la gare": return { bg: "#2e1065", color: "#c084fc", label: "Gare" }
      case "Non payé": return { bg: "#450a0a", color: "#f87171", label: "Non payé" }
      default: return { bg: "#431407", color: "#fb923c", label: s || "En attente" }
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

  const stats = useMemo(() => {
    const total = orders.length
    const pending = orders.filter((o) => (o.status || "En attente") === "En attente").length
    const confirmed = orders.filter((o) => o.status === "Confirmé").length
    const delivered = orders.filter((o) => o.status === "Livré").length
    const gare = orders.filter((o) => o.logistic_status === "Envoyé à la gare").length
    const totalStock = stocks.reduce((s, i) => s + Number(i.quantity || 0), 0)
    const totalAmount = orders.reduce((s, i) => s + Number(i.amount || 0), 0)
    return { total, pending, confirmed, delivered, gare, totalStock, totalAmount }
  }, [orders, stocks])

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
    const payload = { logistic_status: "Envoyé à la gare" }
    const { error } = await supabase.from("orders").update(payload).eq("id", order.id)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, ...payload } : o))
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
    if (action === "livre_paye") { const ok = await markDeliveredAndPaid(order); if (ok) alert("Livrée et payée ✅\nCommission 2 000 FCFA enregistrée !") }
    if (action === "gare") { const ok = await markSentToGare(order); if (ok) alert("Envoyée à la gare ✅") }
    if (action === "paye") { const ok = await updatePayment(order.id, "Payé", true); if (ok) alert("Payée ✅") }
    if (action === "annuler") { const ok = await updateStatus(order.id, "Annulé"); if (ok) alert("Annulée ✅") }
    setSelectedActions((prev) => ({ ...prev, [order.id]: "" }))
  }

  const logout = async () => { await supabase.auth.signOut(); router.replace("/login") }

  const periodLabels: Record<string, string> = { today: "Aujourd'hui", semaine: "Semaine", mois: "Ce mois" }

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "commissions", icon: "💰", label: "Commissions" },
    { id: "commandes", icon: "📦", label: "Commandes", badge: activeOrders.length },
    { id: "stock", icon: "🗄️", label: "Stock" },
  ]

  const renderOrderCard = (order: Order, isHistory = false) => {
    const ss = statusStyle(order.status)
    const ls = statusStyle(order.logistic_status)
    const ps = statusStyle(order.payment_status)
    const locked = isLocked(order)
    return (
      <div key={order.id} style={{
        background: "#111118", border: `1px solid ${locked ? "#052e16" : "#1e1e2e"}`,
        borderRadius: 16, padding: 18, opacity: isHistory ? 0.85 : 1
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 10 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{order.customer_name}</p>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>📍 {order.city} &nbsp;·&nbsp; {order.phone}</p>
          </div>
          <span style={{ background: locked ? "#052e16" : ss.bg, color: locked ? "#4ade80" : ss.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
            {locked ? "🔒 Finalisée" : (order.status || "En attente")}
          </span>
        </div>
        <div style={{ background: "#0a0a0f", borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, fontSize: 14, color: "#e5e7eb" }}><span>📦</span><span>{order.product} × {order.quantity || 1}</span></div>
          <div style={{ display: "flex", gap: 10, fontSize: 14 }}><span>💵</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>{fmt(order.amount)}</span></div>
          <div style={{ display: "flex", gap: 10, fontSize: 14, color: "#e5e7eb" }}><span>🚚</span><span>{prettyDT(order.delivery_type)}</span></div>
          <div style={{ display: "flex", gap: 10, fontSize: 14, color: "#e5e7eb" }}><span>🏠</span><span>{order.address}</span></div>
          <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#6b7280" }}><span>📅</span><span>Créée : {fmtDate(order.created_at)}</span></div>
          {order.delivered_at && <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#4ade80" }}><span>✅</span><span>Livrée : {fmtDate(order.delivered_at)}</span></div>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <span style={{ background: ls.bg, color: ls.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{order.logistic_status || "En attente"}</span>
          <span style={{ background: ps.bg, color: ps.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{order.payment_status || "Non payé"}</span>
          {order.driver_commission ? <span style={{ background: "#052e16", color: "#4ade80", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>💰 {fmt(order.driver_commission)}</span> : null}
        </div>
        {!locked && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={selectedActions[order.id] || ""} onChange={(e) => setSelectedActions((p) => ({ ...p, [order.id]: e.target.value }))}
              style={{ flex: 1, minWidth: 140, padding: "11px 12px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 12, color: "white", fontSize: 14, outline: "none" }}>
              {getActions(order).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <button onClick={() => requestAction(order)}
              style={{ padding: "11px 20px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
              Appliquer
            </button>
          </div>
        )}
      </div>
    )
  }

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
    <>
      <style>{`
        .livreur-app { display: flex; min-height: 100vh; background: #0a0a0f; color: white; font-family: Inter, Arial, sans-serif; }
        .sidebar { width: 240px; background: #111118; border-right: 1px solid #1e1e2e; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 50; transition: transform 0.3s; }
        .sidebar-header { padding: 24px 20px; border-bottom: 1px solid #1e1e2e; }
        .sidebar-avatar { width: 44px; height: 44px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; color: #0a0a0f; margin-bottom: 12px; }
        .sidebar-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
        .sidebar-role { font-size: 12px; color: #9ca3af; }
        .sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
        .nav-btn { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: none; background: transparent; color: #9ca3af; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; width: 100%; text-align: left; transition: all 0.15s; position: relative; }
        .nav-btn:hover { background: #1e1e2e; color: white; }
        .nav-btn.active { background: linear-gradient(135deg, #f59e0b20, #d9770610); color: #f59e0b; border: 1px solid #f59e0b30; }
        .nav-badge { position: absolute; right: 12px; background: #dc2626; color: white; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
        .sidebar-footer { padding: 16px 12px; border-top: 1px solid #1e1e2e; }
        .logout-btn { width: 100%; padding: 11px; background: #1e1e2e; border: 1px solid #2a2a3e; border-radius: 12px; color: #9ca3af; cursor: pointer; font-size: 14px; }
        .logout-btn:hover { background: #dc262620; color: #f87171; border-color: #dc262640; }
        .main-content { flex: 1; margin-left: 240px; min-height: 100vh; }
        .page-header { padding: 24px 32px; border-bottom: 1px solid #1e1e2e; background: #0a0a0f; position: sticky; top: 0; z-index: 10; }
        .page-title { font-size: 24px; font-weight: 700; }
        .content-area { padding: 28px 32px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 20px; }
        .stat-card.accent { background: #1a1200; border-color: #f59e0b30; }
        .orders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
        .mobile-header { display: none; padding: 16px; background: #111118; border-bottom: 1px solid #1e1e2e; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
        .hamburger { background: none; border: none; color: white; font-size: 22px; cursor: pointer; }
        .bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #111118; border-top: 1px solid #1e1e2e; z-index: 50; }
        .bottom-nav-inner { display: flex; }
        .bottom-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 4px 14px; background: none; border: none; cursor: pointer; color: #4b5563; font-size: 10px; font-weight: 500; position: relative; }
        .bottom-nav-btn.active { color: #f59e0b; }
        .bnav-badge { position: absolute; top: 6px; right: 22%; background: #dc2626; color: white; font-size: 10px; font-weight: 700; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .overlay-bg { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
        @media (max-width: 900px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .overlay-bg.open { display: block; }
          .main-content { margin-left: 0; padding-bottom: 80px; }
          .mobile-header { display: flex; }
          .bottom-nav { display: block; }
          .page-header { display: none; }
          .content-area { padding: 16px; }
          .stats-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .orders-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="livreur-app">

        {/* Confirmation popup */}
        {confirmAction && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
            <div style={{ background: "#111118", border: "1px solid #2a2a3e", borderRadius: 20, padding: 28, maxWidth: 360, width: "100%" }}>
              <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{confirmAction.action === "livre_paye" ? "🎯 Confirmer la livraison ?" : "❌ Annuler la commande ?"}</p>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>
                {confirmAction.action === "livre_paye" ? `La commande de ${confirmAction.order.customer_name} sera marquée Livré + Payé. Cette action est irréversible.` : `La commande de ${confirmAction.order.customer_name} sera annulée définitivement.`}
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

        {/* Sidebar overlay mobile */}
        <div className={`overlay-bg ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-avatar">{profile?.full_name?.charAt(0).toUpperCase()}</div>
            <p className="sidebar-name">{profile?.full_name}</p>
            <p className="sidebar-role">🚚 Livreur</p>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button key={item.id} className={`nav-btn ${activeView === item.id ? "active" : ""}`}
                onClick={() => { setActiveView(item.id); setSidebarOpen(false) }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button onClick={logout} className="logout-btn">🚪 Déconnexion</button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#0a0a0f" }}>{profile?.full_name?.charAt(0).toUpperCase()}</div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{profile?.full_name}</span>
          </div>
          <button onClick={logout} style={{ padding: "7px 14px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 20, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>Déco</button>
        </div>

        {/* Main content */}
        <main className="main-content">
          <div className="page-header">
            <p className="page-title">
              {activeView === "dashboard" && "📊 Tableau de bord"}
              {activeView === "commissions" && "💰 Mes commissions"}
              {activeView === "commandes" && "📦 Mes commandes"}
              {activeView === "stock" && "🗄️ Mon stock"}
            </p>
          </div>

          <div className="content-area">

            {/* DASHBOARD */}
            {activeView === "dashboard" && (
              <div>
                <div className="stats-grid">
                  <div className="stat-card accent">
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>📦 Total commandes</p>
                    <p style={{ fontSize: 36, fontWeight: 700 }}>{stats.total}</p>
                  </div>
                  <div className="stat-card">
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>⏳ En attente</p>
                    <p style={{ fontSize: 36, fontWeight: 700, color: "#fb923c" }}>{stats.pending}</p>
                  </div>
                  <div className="stat-card">
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>✅ Confirmées</p>
                    <p style={{ fontSize: 36, fontWeight: 700, color: "#60a5fa" }}>{stats.confirmed}</p>
                  </div>
                  <div className="stat-card">
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>🎯 Livrées</p>
                    <p style={{ fontSize: 36, fontWeight: 700, color: "#4ade80" }}>{stats.delivered}</p>
                  </div>
                  <div className="stat-card">
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>🚌 Gare</p>
                    <p style={{ fontSize: 36, fontWeight: 700, color: "#c084fc" }}>{stats.gare}</p>
                  </div>
                  <div className="stat-card">
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>🗄️ Stock total</p>
                    <p style={{ fontSize: 36, fontWeight: 700 }}>{stats.totalStock}</p>
                  </div>
                </div>
                <div style={{ background: "#1a1200", border: "1px solid #f59e0b30", borderRadius: 20, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 8 }}>Montant total de mes commandes</p>
                    <p style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b" }}>{fmt(stats.totalAmount)}</p>
                  </div>
                  <span style={{ fontSize: 48 }}>💵</span>
                </div>
                {activeOrders.length > 0 && (
                  <div style={{ marginTop: 20, background: "#1a1200", border: "1px solid #f59e0b50", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 22 }}>⚡</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{activeOrders.length} commande(s) en cours</p>
                      <p style={{ fontSize: 13, color: "#9ca3af" }}>Va dans "Commandes" pour les traiter</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMMISSIONS */}
            {activeView === "commissions" && (
              <div style={{ maxWidth: 700 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "#111118", borderRadius: 14, padding: 5 }}>
                  {Object.entries(periodLabels).map(([key, label]) => (
                    <button key={key} onClick={() => setPeriodFilter(key)}
                      style={{ flex: 1, padding: "10px 6px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, background: periodFilter === key ? "#f59e0b" : "transparent", color: periodFilter === key ? "#0a0a0f" : "#6b7280" }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                  <div style={{ background: "linear-gradient(135deg, #052e16, #065f46)", border: "1px solid #4ade8040", borderRadius: 20, padding: 24 }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Gagné — {periodLabels[periodFilter]}</p>
                    <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>{fmt(commissionStats.total)}</p>
                    <p style={{ fontSize: 13, color: "#6b7280" }}>{commissionStats.count} livraison(s)</p>
                  </div>
                  <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 20, padding: 24 }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Total depuis le début</p>
                    <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>{fmt(commissionStats.allTime)}</p>
                    <p style={{ fontSize: 13, color: "#6b7280" }}>{commissionStats.allCount} livraison(s)</p>
                  </div>
                </div>
                <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 14, padding: 16, display: "flex", gap: 12, fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>
                  <span>💡</span>
                  <p>2 000 FCFA par commande <strong style={{ color: "white" }}>Livré + Payé</strong>. La commission est automatiquement enregistrée et ne peut pas être modifiée.</p>
                </div>
                {historyOrders.length > 0 && (
                  <div style={{ marginTop: 28 }}>
                    <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 14, fontWeight: 600 }}>DERNIÈRES LIVRAISONS</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {historyOrders.slice(0, 8).map((o) => (
                        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#111118", borderRadius: 12, marginBottom: 6 }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{o.customer_name}</p>
                            <p style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(o.delivered_at)}</p>
                          </div>
                          <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 16 }}>{fmt(o.driver_commission)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMMANDES */}
            {activeView === "commandes" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>En cours</h2>
                  <span style={{ background: "#f59e0b", color: "#0a0a0f", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{activeOrders.length}</span>
                </div>
                {activeOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
                    <p style={{ fontSize: 48, marginBottom: 12 }}>🎉</p>
                    <p style={{ fontSize: 16 }}>Toutes les commandes sont traitées !</p>
                  </div>
                ) : (
                  <div className="orders-grid">{activeOrders.map((o) => renderOrderCard(o))}</div>
                )}

                {historyOrders.length > 0 && (
                  <div style={{ marginTop: 40 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#6b7280" }}>🔒 Historique</h2>
                      <span style={{ background: "#1e1e2e", color: "#6b7280", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{historyOrders.length}</span>
                    </div>
                    <div className="orders-grid">{historyOrders.map((o) => renderOrderCard(o, true))}</div>
                  </div>
                )}
              </div>
            )}

            {/* STOCK */}
            {activeView === "stock" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                  {stocks.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280", gridColumn: "1/-1" }}>
                      <p style={{ fontSize: 48, marginBottom: 12 }}>📭</p>
                      <p>Aucun stock disponible</p>
                    </div>
                  ) : stocks.map((s) => (
                    <div key={s.id} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 20, padding: 28, textAlign: "center" }}>
                      <p style={{ fontSize: 40, marginBottom: 12 }}>📦</p>
                      <p style={{ fontSize: 15, color: "#9ca3af", marginBottom: 10 }}>{s.product_name}</p>
                      <p style={{ fontSize: 48, fontWeight: 700, color: s.quantity > 0 ? "#f59e0b" : "#f87171" }}>{s.quantity}</p>
                      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>unités restantes</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Bottom nav mobile */}
        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            {navItems.map((item) => (
              <button key={item.id} className={`bottom-nav-btn ${activeView === item.id ? "active" : ""}`} onClick={() => setActiveView(item.id)}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge ? <span className="bnav-badge">{item.badge}</span> : null}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}