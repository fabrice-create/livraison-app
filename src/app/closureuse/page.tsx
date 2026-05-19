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
  driver_name?: string | null
  assigned_driver_id?: string | null
  is_assigned?: boolean
  closer_id?: string | null
  closer_name?: string | null
  closer_commission?: number | null
  driver_commission?: number | null
  created_at?: string | null
  delivered_at?: string | null
  confirmed_at?: string | null
  cancelled_at?: string | null
  commission_calculated?: boolean | null
}

type Profile = {
  id: string
  email: string
  role: string
  full_name: string
}

type DriverStock = {
  id: number
  driver_id: string
  driver_name: string
  product_name: string
  quantity: number
}

export default function ClosureusePage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [driverStocks, setDriverStocks] = useState<DriverStock[]>([])
  const [selectedDrivers, setSelectedDrivers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeView, setActiveView] = useState("dashboard")
  const [stockDriverFilter, setStockDriverFilter] = useState("Tous")
  const [statusFilter, setStatusFilter] = useState("Tous")
  const [periodFilter, setPeriodFilter] = useState("mois")
  const [confirmAssign, setConfirmAssign] = useState<{ orderId: number; driverName: string } | null>(null)

  const [form, setForm] = useState({
    customer_name: "", phone: "", city: "", address: "",
    product: "", quantity: "1", delivery_type: "", amount: "",
  })

  useEffect(() => { void initPage() }, [])

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
  const fmt = (v?: number | string | null) => {
    if (v === null || v === undefined || v === "") return "-"
    return `${Number(v).toLocaleString()} FCFA`
  }
  const fmtDate = (d?: string | null) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }
  const isLocked = (o: Order) => o.status === "Livré" && o.payment_status === "Payé"
  const isToday = (d?: string | null) => {
    if (!d) return false
    return new Date(d).toDateString() === new Date().toDateString()
  }

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
    const role = normalizeRole(p.role)
    if (role !== "closureuse") {
      if (role === "admin") router.replace("/admin")
      else if (role === "livreur") router.replace("/livreur")
      else router.replace("/login")
      return
    }
    setProfile(p)
    const { data: profilesData } = await supabase.from("profiles").select("*")
    if (profilesData) setDrivers((profilesData as Profile[]).filter((pr) => normalizeRole(pr.role) === "livreur"))
    const { data: od } = await supabase.from("orders").select("*").order("id", { ascending: false })
    const fetched = (od || []) as Order[]
    setOrders(fetched)
    const sel: Record<number, string> = {}
    fetched.forEach((o) => { sel[o.id] = o.assigned_driver_id || "" })
    setSelectedDrivers(sel)
    const { data: sd } = await supabase.from("driver_stock").select("*").order("id", { ascending: false })
    setDriverStocks((sd || []) as DriverStock[])
    setLoading(false)
  }

  const myOrders = useMemo(() => orders.filter((o) => o.closer_id === profile?.id), [orders, profile])

  const filterByPeriod = (list: Order[]) => {
    const now = new Date()
    return list.filter((o) => {
      const d = o.delivered_at || o.created_at
      if (!d) return false
      const date = new Date(d)
      if (periodFilter === "today") return date.toDateString() === now.toDateString()
      if (periodFilter === "semaine") return (now.getTime() - date.getTime()) / 86400000 <= 7
      if (periodFilter === "mois") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      return true
    })
  }

  const commissionStats = useMemo(() => {
    if (!profile) return { total: 0, count: 0, allTime: 0, allCount: 0 }
    const earned = myOrders.filter((o) => o.closer_commission && o.closer_commission > 0)
    const filtered = filterByPeriod(earned)
    return {
      total: filtered.reduce((s, o) => s + Number(o.closer_commission || 0), 0),
      count: filtered.length,
      allTime: earned.reduce((s, o) => s + Number(o.closer_commission || 0), 0),
      allCount: earned.length,
    }
  }, [myOrders, periodFilter, profile])

  const todayStats = useMemo(() => {
    const todayOrders = myOrders.filter((o) => isToday(o.created_at))
    const todayDelivered = myOrders.filter((o) => isToday(o.delivered_at))
    return { created: todayOrders.length, delivered: todayDelivered.length }
  }, [myOrders])

  const globalStats = useMemo(() => {
    const total = orders.length
    const notAssigned = orders.filter((o) => !o.is_assigned).length
    const confirmed = orders.filter((o) => o.status === "Confirmé").length
    const delivered = orders.filter((o) => o.status === "Livré").length
    const gare = orders.filter((o) => o.logistic_status === "Envoyé à la gare").length
    const paid = orders.filter((o) => o.payment_status === "Payé").length
    const totalStock = driverStocks.reduce((s, i) => s + Number(i.quantity || 0), 0)
    return { total, notAssigned, confirmed, delivered, gare, paid, totalStock }
  }, [orders, driverStocks])

  const stockByDriver = useMemo(() => {
    const r: Record<string, number> = {}
    driverStocks.forEach((i) => { r[i.driver_name] = (r[i.driver_name] || 0) + Number(i.quantity || 0) })
    return r
  }, [driverStocks])

  const filteredDriverStocks = useMemo(() => {
    if (stockDriverFilter === "Tous") return driverStocks
    return driverStocks.filter((s) => s.driver_name === stockDriverFilter)
  }, [driverStocks, stockDriverFilter])

  const filteredAllOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter === "Tous") return true
      return (o.status || "En attente") === statusFilter
    })
  }, [orders, statusFilter])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const { data, error } = await supabase.from("orders").insert([{
      ...form,
      quantity: Number(form.quantity),
      amount: Number(form.amount),
      delivery_type: normDT(form.delivery_type),
      status: "En attente",
      logistic_status: "En attente",
      payment_status: "Non payé",
      cash_collected: false,
      cash_collected_at: null,
      cash_collected_by: null,
      is_assigned: false,
      driver_name: null,
      assigned_driver_id: null,
      assigned_at: null,
      closer_id: profile?.id || null,
      closer_name: profile?.full_name || null,
      closer_commission: 0,
      driver_commission: 0,
      commission_calculated: false,
    }]).select()
    if (error) { alert("Erreur : " + error.message); setSubmitting(false); return }
    if (data) {
      const newOrders = data as Order[]
      setOrders([...newOrders, ...orders])
      const sel = { ...selectedDrivers }
      newOrders.forEach((o) => { sel[o.id] = "" })
      setSelectedDrivers(sel)
    }
    setForm({ customer_name: "", phone: "", city: "", address: "", product: "", quantity: "1", delivery_type: "", amount: "" })
    alert("Commande créée ✅")
    setSubmitting(false)
  }

  const requestAssign = (orderId: number) => {
    const driverId = selectedDrivers[orderId]
    if (!driverId) { alert("Choisis un livreur."); return }
    const driver = drivers.find((d) => d.id === driverId)
    if (!driver) { alert("Livreur introuvable."); return }
    const order = orders.find((o) => o.id === orderId)
    if (order && isLocked(order)) { alert("Cette commande est finalisée et ne peut plus être modifiée."); return }
    setConfirmAssign({ orderId, driverName: driver.full_name })
  }

  const executeAssign = async () => {
    if (!confirmAssign) return
    const { orderId, driverName } = confirmAssign
    setConfirmAssign(null)
    const driverId = selectedDrivers[orderId]
    const driver = drivers.find((d) => d.id === driverId)
    if (!driver) return
    const payload = { assigned_driver_id: driver.id, driver_name: driver.full_name, is_assigned: true, assigned_at: new Date().toISOString() }
    const { error } = await supabase.from("orders").update(payload).eq("id", orderId)
    if (error) { alert("Erreur : " + error.message); return }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...payload } : o))
    alert(`${driverName} assigné ✅`)
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

      {/* Confirmation assignation */}
      {confirmAssign && (
        <div className="overlay">
          <div className="confirm-modal">
            <p className="confirm-title">Assigner ce livreur ?</p>
            <p className="confirm-sub">Tu vas assigner <b>{confirmAssign.driverName}</b> à cette commande. Confirmes-tu ?</p>
            <div className="confirm-btns">
              <button className="confirm-cancel" onClick={() => setConfirmAssign(null)}>Annuler</button>
              <button className="confirm-ok" onClick={executeAssign}>Confirmer</button>
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
            <p className="header-role">💼 Closureuse</p>
          </div>
        </div>
        <button onClick={logout} className="logout-btn">Déconnexion</button>
      </header>

      <main className="content">

        {/* DASHBOARD */}
        {activeView === "dashboard" && (
          <div className="view">
            <h2 className="view-title">Tableau de bord</h2>

            {/* Aujourd'hui */}
            <div className="today-row">
              <div className="today-card">
                <p className="today-label">Créées aujourd'hui</p>
                <p className="today-value">{todayStats.created}</p>
              </div>
              <div className="today-card green">
                <p className="today-label">Livrées aujourd'hui</p>
                <p className="today-value">{todayStats.delivered}</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card accent">
                <span className="stat-icon">📦</span>
                <span className="stat-value">{globalStats.total}</span>
                <span className="stat-label">Total commandes</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">⚠️</span>
                <span className="stat-value" style={{ color: "#fb923c" }}>{globalStats.notAssigned}</span>
                <span className="stat-label">Non assignées</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">✅</span>
                <span className="stat-value" style={{ color: "#60a5fa" }}>{globalStats.confirmed}</span>
                <span className="stat-label">Confirmées</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🎯</span>
                <span className="stat-value" style={{ color: "#4ade80" }}>{globalStats.delivered}</span>
                <span className="stat-label">Livrées</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🚌</span>
                <span className="stat-value" style={{ color: "#c084fc" }}>{globalStats.gare}</span>
                <span className="stat-label">Gare</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">💰</span>
                <span className="stat-value" style={{ color: "#4ade80" }}>{globalStats.paid}</span>
                <span className="stat-label">Payées</span>
              </div>
            </div>

            <div className="stockSummary">
              <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 12 }}>Stock par livreur</p>
              <div className="stock-grid">
                {Object.entries(stockByDriver).length === 0 ? (
                  <p style={{ color: "#6b7280", fontSize: 14 }}>Aucun stock</p>
                ) : (
                  Object.entries(stockByDriver).map(([driver, qty]) => (
                    <div key={driver} className="stock-mini">
                      <p style={{ fontSize: 12, color: "#9ca3af" }}>{driver}</p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b" }}>{qty}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
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
              <div className="comm-card blue">
                <p className="comm-label">Gagné — {periodLabels[periodFilter]}</p>
                <p className="comm-big">{fmt(commissionStats.total)}</p>
                <p className="comm-sub">{commissionStats.count} commande(s) livrée(s) et payée(s)</p>
              </div>
              <div className="comm-card dark">
                <p className="comm-label">Total depuis le début</p>
                <p className="comm-big">{fmt(commissionStats.allTime)}</p>
                <p className="comm-sub">{commissionStats.allCount} commande(s) au total</p>
              </div>
            </div>

            <div className="info-box">
              <span>💡</span>
              <p>500 FCFA par commande <b>Livré + Payé</b>. La commission est automatiquement enregistrée quand le livreur finalise la livraison.</p>
            </div>
          </div>
        )}

        {/* MES COMMANDES */}
        {activeView === "mes_commandes" && (
          <div className="view">
            <h2 className="view-title">Mes commandes <span className="count-badge">{myOrders.length}</span></h2>

            <div className="filter-row">
              {["Tous", "En attente", "Confirmé", "Livré", "Annulé"].map((s) => (
                <button key={s} className={`filter-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>

            {myOrders.filter((o) => statusFilter === "Tous" || (o.status || "En attente") === statusFilter).length === 0 ? (
              <div className="empty-state"><p style={{ fontSize: 40 }}>📭</p><p>Aucune commande</p></div>
            ) : (
              <div className="orders-list">
                {myOrders.filter((o) => statusFilter === "Tous" || (o.status || "En attente") === statusFilter).map((o) => {
                  const ss = statusStyle(o.status)
                  const locked = isLocked(o)
                  return (
                    <div key={o.id} className={`order-card ${locked ? "locked" : ""}`}>
                      <div className="order-header">
                        <div>
                          <p className="order-name">{o.customer_name}</p>
                          <p className="order-city">📍 {o.city} · {o.phone}</p>
                        </div>
                        <span className="status-pill" style={{ background: locked ? "#052e16" : ss.bg, color: locked ? "#4ade80" : ss.color }}>
                          {locked ? "🔒 Finalisée" : (o.status || "En attente")}
                        </span>
                      </div>
                      <div className="order-details">
                        <div className="detail-row"><span>📦</span><span>{o.product} × {o.quantity || 1}</span></div>
                        <div className="detail-row"><span>💵</span><span style={{ color: "#f59e0b", fontWeight: 600 }}>{fmt(o.amount)}</span></div>
                        <div className="detail-row"><span>🚚</span><span>{prettyDT(o.delivery_type)}</span></div>
                        <div className="detail-row"><span>👤</span><span>{o.driver_name || "Non assigné"}</span></div>
                        <div className="detail-row"><span>📅</span><span style={{ fontSize: 12, color: "#6b7280" }}>Créée : {fmtDate(o.created_at)}</span></div>
                        {o.delivered_at && <div className="detail-row"><span>✅</span><span style={{ fontSize: 12, color: "#4ade80" }}>Livrée : {fmtDate(o.delivered_at)}</span></div>}
                      </div>
                      {locked && o.closer_commission ? (
                        <div style={{ background: "#1e3a5f", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#60a5fa", fontWeight: 600 }}>
                          💰 Ma commission : {fmt(o.closer_commission)}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TOUTES LES COMMANDES / ASSIGNER */}
        {activeView === "assigner" && (
          <div className="view">
            <h2 className="view-title">Assigner <span className="count-badge">{orders.length}</span></h2>

            <div className="filter-row">
              {["Tous", "En attente", "Confirmé", "Livré", "Annulé"].map((s) => (
                <button key={s} className={`filter-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>

            {filteredAllOrders.length === 0 ? (
              <div className="empty-state"><p style={{ fontSize: 40 }}>📭</p><p>Aucune commande</p></div>
            ) : (
              <div className="orders-list">
                {filteredAllOrders.map((o) => {
                  const ss = statusStyle(o.status)
                  const locked = isLocked(o)
                  return (
                    <div key={o.id} className={`order-card ${locked ? "locked" : ""}`}>
                      <div className="order-header">
                        <div>
                          <p className="order-name">{o.customer_name}</p>
                          <p className="order-city">📍 {o.city} · {o.phone}</p>
                        </div>
                        <span className="status-pill" style={{ background: locked ? "#052e16" : ss.bg, color: locked ? "#4ade80" : ss.color }}>
                          {locked ? "🔒 Finalisée" : (o.status || "En attente")}
                        </span>
                      </div>
                      <div className="order-details">
                        <div className="detail-row"><span>📦</span><span>{o.product} × {o.quantity || 1}</span></div>
                        <div className="detail-row"><span>💵</span><span style={{ color: "#f59e0b", fontWeight: 600 }}>{fmt(o.amount)}</span></div>
                        <div className="detail-row"><span>🚚</span><span>{prettyDT(o.delivery_type)}</span></div>
                        <div className="detail-row"><span>👤</span><span>{o.driver_name || "Non assigné"}</span></div>
                        <div className="detail-row"><span>📅</span><span style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(o.created_at)}</span></div>
                      </div>
                      {!locked && (
                        <div className="action-row">
                          <select value={selectedDrivers[o.id] || ""} onChange={(e) => setSelectedDrivers((p) => ({ ...p, [o.id]: e.target.value }))} className="action-select">
                            <option value="">Choisir un livreur</option>
                            {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                          </select>
                          <button onClick={() => requestAssign(o.id)} className="action-btn">Assigner</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* CRÉER COMMANDE */}
        {activeView === "creer" && (
          <div className="view">
            <h2 className="view-title">Nouvelle commande</h2>
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label className="form-label">Nom client</label>
                <input name="customer_name" value={form.customer_name} onChange={handleChange} required className="field" placeholder="Ex: Kofi Mensah" />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input name="phone" value={form.phone} onChange={handleChange} required className="field" placeholder="Ex: 90 00 00 00" />
              </div>
              <div className="form-group">
                <label className="form-label">Ville</label>
                <input name="city" value={form.city} onChange={handleChange} required className="field" placeholder="Ex: Lomé" />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse</label>
                <input name="address" value={form.address} onChange={handleChange} required className="field" placeholder="Ex: Akodessewa, carrefour..." />
              </div>
              <div className="form-group">
                <label className="form-label">Produit</label>
                <input name="product" value={form.product} onChange={handleChange} required className="field" placeholder="Ex: THERAWOLF" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantité</label>
                  <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} required className="field" />
                </div>
                <div className="form-group">
                  <label className="form-label">Montant (FCFA)</label>
                  <input name="amount" type="number" value={form.amount} onChange={handleChange} required className="field" placeholder="Ex: 25000" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Type de livraison</label>
                <select name="delivery_type" value={form.delivery_type} onChange={handleChange} required className="field">
                  <option value="">Choisir...</option>
                  <option value="direct">🚚 Direct</option>
                  <option value="gare">🚌 Gare</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} className="submit-btn">
                {submitting ? "Création en cours..." : "✅ Créer la commande"}
              </button>
            </form>
          </div>
        )}

        {/* STOCKS */}
        {activeView === "stocks" && (
          <div className="view">
            <h2 className="view-title">Stocks livreurs</h2>
            <div style={{ marginBottom: 16 }}>
              <select value={stockDriverFilter} onChange={(e) => setStockDriverFilter(e.target.value)} className="field">
                <option value="Tous">Tous les livreurs</option>
                {drivers.map((d) => <option key={d.id} value={d.full_name}>{d.full_name}</option>)}
              </select>
            </div>
            {filteredDriverStocks.length === 0 ? (
              <div className="empty-state"><p style={{ fontSize: 40 }}>📭</p><p>Aucun stock</p></div>
            ) : (
              <div className="orders-list">
                {filteredDriverStocks.map((s) => (
                  <div key={s.id} className="order-card">
                    <div className="order-header">
                      <div>
                        <p className="order-name">{s.driver_name}</p>
                        <p className="order-city">📦 {s.product_name}</p>
                      </div>
                      <span style={{ fontSize: 28, fontWeight: 700, color: s.quantity > 0 ? "#f59e0b" : "#f87171" }}>{s.quantity}</span>
                    </div>
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
          { id: "mes_commandes", icon: "📋", label: "Mes cmd" },
          { id: "assigner", icon: "👤", label: "Assigner" },
          { id: "creer", icon: "➕", label: "Créer" },
        ].map((item) => (
          <button key={item.id} className={`nav-item ${activeView === item.id ? "active" : ""}`} onClick={() => setActiveView(item.id)}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 500 }}>{item.label}</span>
          </button>
        ))}
      </nav>

      <style jsx>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .app { min-height: 100vh; background: #0a0a0f; color: white; font-family: 'Inter', Arial, sans-serif; display: flex; flex-direction: column; max-width: 600px; margin: 0 auto; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
        .confirm-modal { background: #111118; border: 1px solid #2a2a3e; border-radius: 20px; padding: 24px; max-width: 340px; width: 100%; }
        .confirm-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .confirm-sub { font-size: 14px; color: #9ca3af; line-height: 1.5; margin-bottom: 20px; }
        .confirm-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .confirm-cancel { padding: 12px; background: #1e1e2e; border: 1px solid #2a2a3e; border-radius: 12px; color: #9ca3af; cursor: pointer; font-size: 14px; }
        .confirm-ok { padding: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 12px; color: #0a0a0f; font-weight: 700; cursor: pointer; font-size: 14px; }
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
        .today-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .today-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 16px; text-align: center; }
        .today-card.green { border-color: #4ade8030; background: #052e16; }
        .today-label { font-size: 12px; color: #9ca3af; margin-bottom: 6px; }
        .today-value { font-size: 32px; font-weight: 700; color: white; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .stat-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
        .stat-card.accent { background: #1a1200; border-color: #f59e0b30; }
        .stat-icon { font-size: 18px; }
        .stat-value { font-size: 26px; font-weight: 700; }
        .stat-label { font-size: 12px; color: #6b7280; }
        .stockSummary { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 16px; margin-top: 4px; }
        .stock-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 10px; }
        .stock-mini { background: #0a0a0f; border-radius: 10px; padding: 10px; text-align: center; }
        .period-tabs { display: flex; gap: 6px; margin-bottom: 20px; background: #111118; border-radius: 12px; padding: 4px; }
        .period-tab { flex: 1; padding: 10px 4px; border: none; background: transparent; color: #6b7280; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 500; }
        .period-tab.active { background: #f59e0b; color: #0a0a0f; font-weight: 700; }
        .comm-cards { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .comm-card { border-radius: 20px; padding: 22px; }
        .comm-card.blue { background: linear-gradient(135deg, #0f172a, #1e3a5f); border: 1px solid #60a5fa30; }
        .comm-card.dark { background: #111118; border: 1px solid #1e1e2e; }
        .comm-label { font-size: 13px; color: #9ca3af; margin-bottom: 8px; }
        .comm-big { font-size: 30px; font-weight: 700; margin-bottom: 4px; }
        .comm-sub { font-size: 13px; color: #6b7280; }
        .info-box { display: flex; gap: 12px; background: #111118; border: 1px solid #1e1e2e; border-radius: 14px; padding: 14px; font-size: 13px; color: #9ca3af; line-height: 1.6; }
        .filter-row { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 4px; }
        .filter-btn { padding: 8px 14px; border: 1px solid #2a2a3e; background: #111118; color: #6b7280; border-radius: 20px; cursor: pointer; font-size: 12px; white-space: nowrap; }
        .filter-btn.active { background: #f59e0b; color: #0a0a0f; border-color: #f59e0b; font-weight: 700; }
        .orders-list { display: flex; flex-direction: column; gap: 14px; }
        .order-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 20px; padding: 16px; }
        .order-card.locked { opacity: 0.8; }
        .order-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 10px; }
        .order-name { font-size: 16px; font-weight: 600; margin-bottom: 3px; }
        .order-city { font-size: 13px; color: #6b7280; }
        .status-pill { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
        .order-details { background: #0a0a0f; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
        .detail-row { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #d1d5db; }
        .action-row { display: flex; gap: 10px; }
        .action-select { flex: 1; padding: 12px; background: #0a0a0f; border: 1px solid #2a2a3e; border-radius: 12px; color: white; font-size: 14px; outline: none; }
        .action-btn { padding: 12px 18px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 12px; color: #0a0a0f; font-weight: 700; font-size: 14px; cursor: pointer; white-space: nowrap; }
        .form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-label { font-size: 13px; color: #9ca3af; font-weight: 500; }
        .field { width: 100%; padding: 14px; background: #111118; border: 1px solid #2a2a3e; border-radius: 12px; color: white; font-size: 15px; outline: none; }
        .submit-btn { padding: 16px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 14px; color: #0a0a0f; font-weight: 700; font-size: 16px; cursor: pointer; margin-top: 4px; }
        .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; font-size: 16px; }
        .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; background: #111118; border-top: 1px solid #1e1e2e; display: flex; z-index: 100; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 2px; background: none; border: none; cursor: pointer; color: #4b5563; }
        .nav-item.active { color: #f59e0b; }
        @media (min-width: 481px) { .app { border-left: 1px solid #1e1e2e; border-right: 1px solid #1e1e2e; } }
      `}</style>
    </div>
  )
}