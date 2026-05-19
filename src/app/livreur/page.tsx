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

  useEffect(() => { void initPage() }, [])

  const fmt = (v?: number | string | null) => {
    if (v === null || v === undefined || v === "") return "-"
    return `${Number(v).toLocaleString()} FCFA`
  }

  const fmtDate = (d?: string | null) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const normalizeRole = (r?: string | null) => String(r || "").trim().toLowerCase()
  const normDT = (v?: string | null) => {
    const c = (v || "").trim().toLowerCase()
    if (c === "direct") return "direct"
    if (c === "gare") return "gare"
    return c
  }
  const prettyDT = (v?: string | null) => {
    const n = normDT(v)
    if (n === "direct") return "Direct"
    if (n === "gare") return "Gare"
    return v || "-"
  }
  const isDirect = (v?: string | null) => normDT(v) === "direct"
  const isGare = (v?: string | null) => normDT(v) === "gare"
  const isLocked = (o: Order) => o.status === "Livré" && o.payment_status === "Payé"

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

  const filterByPeriod = (orders: Order[], field: "delivered_at" | "created_at") => {
    const now = new Date()
    return orders.filter((o) => {
      const d = o[field]
      if (!d) return false
      const date = new Date(d)
      if (periodFilter === "today") {
        return date.toDateString() === now.toDateString()
      }
      if (periodFilter === "semaine") {
        const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        return diff <= 7
      }
      if (periodFilter === "mois") {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }
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
    const filtered = filterByPeriod(livrees, "delivered_at")
    const total = filtered.reduce((s, o) => s + Number(o.driver_commission || 0), 0)
    const allTime = livrees.reduce((s, o) => s + Number(o.driver_commission || 0), 0)
    return { total, count: filtered.length, allTime, allCount: livrees.length }
  }, [orders, periodFilter])

  const consumeStock = async (order: Order) => {
    const driverId = order.assigned_driver_id
    const productName = (order.product || "").trim()
    const qty = Number(order.quantity || 1)
    if (!driverId || !productName || qty <= 0) { alert("Commande incomplète."); return false }
    const item = stocks.find((i) => i.driver_id === driverId && i.product_name.trim().toLowerCase() === productName.toLowerCase())
    if (!item) { alert("Aucun stock trouvé pour ce produit."); return false }
    if (Number(item.quantity) < qty) { alert("Stock insuffisant."); return false }
    const newQty = Number(item.quantity) - qty
    const { error } = await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", item.id)
    if (error) { alert("Erreur stock : " + error.message); return false }
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

  const updatePayment = async (orderId: number, paymentStatus: string, collected: boolean) => {
    const payload = { payment_status: paymentStatus, cash_collected: collected, cash_collected_at: collected ? new Date().toISOString() : null, cash_collected_by: collected ? profile?.full_name || null : null }
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
    if (isGare(order.delivery_type)) {
      actions.push({ value: "gare", label: "🚌 Envoyé à la gare" })
      actions.push({ value: "paye", label: "💰 Marquer Payé" })
    }
    return actions
  }

  const requestAction = (order: Order) => {
    const action = selectedActions[order.id]
    if (!action) { alert("Choisis une action."); return }
    if (action === "livre_paye" || action === "annuler") {
      setConfirmAction({ order, action })
    } else {
      void executeAction(order, action)
    }
  }

  const executeAction = async (order: Order, action: string) => {
    setConfirmAction(null)
    if (action === "confirmer") { const ok = await updateStatus(order.id, "Confirmé"); if (ok) alert("Confirmée ✅") }
    if (action === "livre_paye") { const ok = await markDeliveredAndPaid(order); if (ok) alert("Livrée et payée ✅ — Commission 2 000 FCFA enregistrée !") }
    if (action === "gare") { const ok = await markSentToGare(order); if (ok) alert("Envoyée à la gare ✅") }
    if (action === "paye") { const ok = await updatePayment(order.id, "Payé", true); if (ok) alert("Payée ✅") }
    if (action === "annuler") { const ok = await updateStatus(order.id, "Annulé"); if (ok) alert("Annulée ✅") }
    setSelectedActions((prev) => ({ ...prev, [order.id]: "" }))
  }

  const logout = async () => { await supabase.auth.signOut(); router.replace("/login") }

  const periodLabels: Record<string, string> = { today: "Aujourd'hui", semaine: "Cette semaine", mois: "Ce mois" }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0f", color: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #f59e0b", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Chargement...</p>
      </div>
    </div>
  )

  return (
    <div className="app">
      {/* Confirmation popup */}
      {confirmAction && (
        <div className="overlay">
          <div className="confirm-modal">
            <p className="confirm-title">
              {confirmAction.action === "livre_paye" ? "🎯 Confirmer la livraison ?" : "❌ Annuler la commande ?"}
            </p>
            <p className="confirm-sub">
              {confirmAction.action === "livre_paye"
                ? `La commande de ${confirmAction.order.customer_name} sera marquée Livré + Payé. Cette action est irréversible.`
                : `La commande de ${confirmAction.order.customer_name} sera annulée définitivement.`}
            </p>
            <div className="confirm-btns">
              <button className="confirm-cancel" onClick={() => setConfirmAction(null)}>Annuler</button>
              <button
                className={`confirm-ok ${confirmAction.action === "annuler" ? "red" : ""}`}
                onClick={() => executeAction(confirmAction.order, confirmAction.action)}
              >
                {confirmAction.action === "livre_paye" ? "Confirmer" : "Oui, annuler"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="avatar">{profile?.full_name?.charAt(0).toUpperCase()}</div>
          <div>
            <p className="header-name">{profile?.full_name}</p>
            <p className="header-role">🚚 Livreur</p>
          </div>
        </div>
        <button onClick={logout} className="logout-btn">Déconnexion</button>
      </header>

      <main className="content">

        {/* DASHBOARD */}
        {activeView === "dashboard" && (
          <div className="view">
            <h2 className="view-title">Tableau de bord</h2>
            <div className="stats-grid">
              <div className="stat-card accent">
                <span className="stat-icon">📦</span>
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">⏳</span>
                <span className="stat-value" style={{ color: "#fb923c" }}>{stats.pending}</span>
                <span className="stat-label">En attente</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">✅</span>
                <span className="stat-value" style={{ color: "#60a5fa" }}>{stats.confirmed}</span>
                <span className="stat-label">Confirmées</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🎯</span>
                <span className="stat-value" style={{ color: "#4ade80" }}>{stats.delivered}</span>
                <span className="stat-label">Livrées</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🚌</span>
                <span className="stat-value" style={{ color: "#c084fc" }}>{stats.gare}</span>
                <span className="stat-label">Gare</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🗄️</span>
                <span className="stat-value">{stats.totalStock}</span>
                <span className="stat-label">Stock</span>
              </div>
            </div>
            <div className="amount-card">
              <div>
                <p className="amount-label">Montant total de mes commandes</p>
                <p className="amount-value">{fmt(stats.totalAmount)}</p>
              </div>
              <span style={{ fontSize: 32 }}>💵</span>
            </div>
            {activeOrders.length > 0 && (
              <div className="alert-card">
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 2px" }}>{activeOrders.length} commande(s) en cours</p>
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Appuie sur "Commandes" pour les traiter</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* COMMISSIONS */}
        {activeView === "commissions" && (
          <div className="view">
            <h2 className="view-title">Mes commissions</h2>

            <div className="period-tabs">
              {Object.entries(periodLabels).map(([key, label]) => (
                <button key={key} className={`period-tab ${periodFilter === key ? "active" : ""}`} onClick={() => setPeriodFilter(key)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="comm-cards">
              <div className="comm-card green">
                <p className="comm-label">Gagné — {periodLabels[periodFilter]}</p>
                <p className="comm-big">{fmt(commissionStats.total)}</p>
                <p className="comm-sub">{commissionStats.count} livraison(s)</p>
              </div>
              <div className="comm-card dark">
                <p className="comm-label">Total depuis le début</p>
                <p className="comm-big">{fmt(commissionStats.allTime)}</p>
                <p className="comm-sub">{commissionStats.allCount} livraison(s) au total</p>
              </div>
            </div>

            <div className="info-box">
              <span>💡</span>
              <p>2 000 FCFA par commande <b>Livré + Payé</b>. La commission est automatiquement enregistrée et ne peut pas être modifiée.</p>
            </div>

            {historyOrders.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 12 }}>Dernières livraisons</p>
                {historyOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="history-item">
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>{o.customer_name}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{fmtDate(o.delivered_at)}</p>
                    </div>
                    <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 15 }}>{fmt(o.driver_commission)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMMANDES ACTIVES */}
        {activeView === "commandes" && (
          <div className="view">
            <h2 className="view-title">
              En cours
              <span className="count-badge">{activeOrders.length}</span>
            </h2>
            {activeOrders.length === 0 ? (
              <div className="empty-state">
                <p style={{ fontSize: 48 }}>🎉</p>
                <p>Toutes les commandes sont traitées !</p>
              </div>
            ) : (
              <div className="orders-list">
                {activeOrders.map((order) => {
                  const ss = statusStyle(order.status)
                  const ls = statusStyle(order.logistic_status)
                  const ps = statusStyle(order.payment_status)
                  return (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div>
                          <p className="order-name">{order.customer_name}</p>
                          <p className="order-city">📍 {order.city} · {order.phone}</p>
                        </div>
                        <span className="status-pill" style={{ background: ss.bg, color: ss.color }}>{order.status || "En attente"}</span>
                      </div>
                      <div className="order-details">
                        <div className="detail-row"><span>📦</span><span>{order.product} × {order.quantity || 1}</span></div>
                        <div className="detail-row"><span>💵</span><span style={{ color: "#f59e0b", fontWeight: 600 }}>{fmt(order.amount)}</span></div>
                        <div className="detail-row"><span>🚚</span><span>{prettyDT(order.delivery_type)}</span></div>
                        <div className="detail-row"><span>🏠</span><span>{order.address}</span></div>
                        <div className="detail-row"><span>📅</span><span style={{ color: "#6b7280", fontSize: 12 }}>{fmtDate(order.created_at)}</span></div>
                      </div>
                      <div className="status-row">
                        <span className="mini-badge" style={{ background: ls.bg, color: ls.color }}>{order.logistic_status || "En attente"}</span>
                        <span className="mini-badge" style={{ background: ps.bg, color: ps.color }}>{order.payment_status || "Non payé"}</span>
                      </div>
                      <div className="action-row">
                        <select value={selectedActions[order.id] || ""} onChange={(e) => setSelectedActions((p) => ({ ...p, [order.id]: e.target.value }))} className="action-select">
                          {getActions(order).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                        <button onClick={() => requestAction(order)} className="action-btn">Appliquer</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {historyOrders.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h3 style={{ fontSize: 16, color: "#6b7280", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  🔒 Historique <span className="count-badge" style={{ background: "#1e1e2e", color: "#6b7280" }}>{historyOrders.length}</span>
                </h3>
                <div className="orders-list">
                  {historyOrders.map((order) => (
                    <div key={order.id} className="order-card locked">
                      <div className="order-header">
                        <div>
                          <p className="order-name" style={{ color: "#9ca3af" }}>{order.customer_name}</p>
                          <p className="order-city">📍 {order.city}</p>
                        </div>
                        <span className="status-pill" style={{ background: "#052e16", color: "#4ade80" }}>🔒 Finalisée</span>
                      </div>
                      <div className="order-details" style={{ opacity: 0.6 }}>
                        <div className="detail-row"><span>📦</span><span>{order.product} × {order.quantity || 1}</span></div>
                        <div className="detail-row"><span>💵</span><span>{fmt(order.amount)}</span></div>
                        <div className="detail-row"><span>📅</span><span style={{ fontSize: 12 }}>Créée : {fmtDate(order.created_at)}</span></div>
                        <div className="detail-row"><span>✅</span><span style={{ fontSize: 12 }}>Livrée : {fmtDate(order.delivered_at)}</span></div>
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
          <div className="view">
            <h2 className="view-title">Mon stock</h2>
            {stocks.length === 0 ? (
              <div className="empty-state"><p style={{ fontSize: 48 }}>📭</p><p>Aucun stock disponible</p></div>
            ) : (
              <div className="stock-grid">
                {stocks.map((s) => (
                  <div key={s.id} className="stock-card">
                    <div style={{ fontSize: 28, marginBottom: 10 }}>📦</div>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>{s.product_name}</p>
                    <p style={{ fontSize: 36, fontWeight: 700, color: s.quantity > 0 ? "#f59e0b" : "#f87171" }}>{s.quantity}</p>
                    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>unités</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {[
          { id: "dashboard", icon: "⊞", label: "Dashboard" },
          { id: "commissions", icon: "💰", label: "Commissions" },
          { id: "commandes", icon: "📦", label: "Commandes" },
          { id: "stock", icon: "🗄️", label: "Stock" },
        ].map((item) => (
          <button key={item.id} className={`nav-item ${activeView === item.id ? "active" : ""}`} onClick={() => setActiveView(item.id)}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 500 }}>{item.label}</span>
            {item.id === "commandes" && activeOrders.length > 0 && (
              <span className="nav-badge">{activeOrders.length}</span>
            )}
          </button>
        ))}
      </nav>

      <style jsx>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .app { min-height: 100vh; background: #0a0a0f; color: white; font-family: 'Inter', Arial, sans-serif; display: flex; flex-direction: column; width: 100%; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
        .confirm-modal { background: #111118; border: 1px solid #2a2a3e; border-radius: 20px; padding: 24px; max-width: 340px; width: 100%; }
        .confirm-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .confirm-sub { font-size: 14px; color: #9ca3af; line-height: 1.5; margin-bottom: 20px; }
        .confirm-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .confirm-cancel { padding: 12px; background: #1e1e2e; border: 1px solid #2a2a3e; border-radius: 12px; color: #9ca3af; cursor: pointer; font-size: 14px; }
        .confirm-ok { padding: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 12px; color: #0a0a0f; font-weight: 700; cursor: pointer; font-size: 14px; }
        .confirm-ok.red { background: #dc2626; color: white; }
        .header { display: flex; justify-content: space-between; align-items: center; padding: 20px 16px 16px; border-bottom: 1px solid #1a1a2e; position: sticky; top: 0; background: #0a0a0f; z-index: 10; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 40px; height: 40px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: #0a0a0f; }
        .header-name { font-size: 15px; font-weight: 600; }
        .header-role { font-size: 12px; color: #6b7280; margin-top: 1px; }
        .logout-btn { padding: 8px 14px; background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 20px; color: #9ca3af; font-size: 13px; cursor: pointer; }
        .content { flex: 1; overflow-y: auto; padding-bottom: 80px; }
        .view { padding: 20px 16px; }
        .view-title { font-size: 22px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .count-badge { background: #f59e0b; color: #0a0a0f; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        .stat-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
        .stat-card.accent { background: #1a1200; border-color: #f59e0b30; }
        .stat-icon { font-size: 18px; }
        .stat-value { font-size: 28px; font-weight: 700; }
        .stat-label { font-size: 12px; color: #6b7280; }
        .amount-card { background: #1a1200; border: 1px solid #f59e0b30; border-radius: 20px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .amount-label { font-size: 13px; color: #9ca3af; margin-bottom: 6px; }
        .amount-value { font-size: 24px; font-weight: 700; color: #f59e0b; }
        .alert-card { background: #1a1200; border: 1px solid #f59e0b50; border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
        .period-tabs { display: flex; gap: 8px; margin-bottom: 20px; background: #111118; border-radius: 12px; padding: 4px; }
        .period-tab { flex: 1; padding: 10px 6px; border: none; background: transparent; color: #6b7280; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 500; }
        .period-tab.active { background: #f59e0b; color: #0a0a0f; font-weight: 700; }
        .comm-cards { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .comm-card { border-radius: 20px; padding: 22px; }
        .comm-card.green { background: linear-gradient(135deg, #052e16, #065f46); border: 1px solid #4ade8040; }
        .comm-card.dark { background: #111118; border: 1px solid #1e1e2e; }
        .comm-label { font-size: 13px; color: #9ca3af; margin-bottom: 8px; }
        .comm-big { font-size: 30px; font-weight: 700; margin-bottom: 4px; }
        .comm-sub { font-size: 13px; color: #6b7280; }
        .history-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #1e1e2e; }
        .info-box { display: flex; gap: 12px; background: #111118; border: 1px solid #1e1e2e; border-radius: 14px; padding: 14px; font-size: 13px; color: #9ca3af; line-height: 1.6; }
        .orders-list { display: flex; flex-direction: column; gap: 14px; }
        .order-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 20px; padding: 16px; }
        .order-card.locked { opacity: 0.75; }
        .order-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 10px; }
        .order-name { font-size: 16px; font-weight: 600; margin-bottom: 3px; }
        .order-city { font-size: 13px; color: #6b7280; }
        .status-pill { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
        .order-details { background: #0a0a0f; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
        .detail-row { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #d1d5db; }
        .status-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .mini-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .action-row { display: flex; gap: 10px; }
        .action-select { flex: 1; padding: 12px; background: #0a0a0f; border: 1px solid #2a2a3e; border-radius: 12px; color: white; font-size: 14px; outline: none; }
        .action-btn { padding: 12px 18px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 12px; color: #0a0a0f; font-weight: 700; font-size: 14px; cursor: pointer; white-space: nowrap; }
        .stock-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .stock-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 20px; padding: 20px; text-align: center; }
        .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; font-size: 16px; }
        .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; background: #111118; border-top: 1px solid #1e1e2e; display: flex; z-index: 100; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 4px; background: none; border: none; cursor: pointer; color: #4b5563; position: relative; }
        .nav-item.active { color: #f59e0b; }
        .nav-badge { position: absolute; top: 6px; right: 20%; background: #dc2626; color: white; font-size: 10px; font-weight: 700; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        @media (min-width: 481px) { .app { border-left: 1px solid #1e1e2e; border-right: 1px solid #1e1e2e; } }
      `}</style>
    </div>
  )
}