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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [form, setForm] = useState({
    customer_name: "", phone: "", city: "", address: "",
    product: "", quantity: "1", delivery_type: "", amount: "",
  })

  useEffect(() => { void initPage() }, [])

  const normalizeRole = (r?: string | null) => String(r || "").trim().toLowerCase()
  const normDT = (v?: string | null) => { const c = (v || "").trim().toLowerCase(); if (c === "direct") return "direct"; if (c === "gare") return "gare"; return c }
  const prettyDT = (v?: string | null) => { const n = normDT(v); if (n === "direct") return "Direct"; if (n === "gare") return "Gare"; return v || "-" }
  const fmt = (v?: number | string | null) => { if (v === null || v === undefined || v === "") return "-"; return `${Number(v).toLocaleString()} FCFA` }
  const fmtDate = (d?: string | null) => { if (!d) return "-"; return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) }
  const isLocked = (o: Order) => o.status === "Livré" && o.payment_status === "Payé"
  const isToday = (d?: string | null) => { if (!d) return false; return new Date(d).toDateString() === new Date().toDateString() }

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
      const d = o.delivered_at || o.created_at; if (!d) return false
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

  const todayStats = useMemo(() => ({
    created: myOrders.filter((o) => isToday(o.created_at)).length,
    delivered: myOrders.filter((o) => isToday(o.delivered_at)).length,
  }), [myOrders])

  const globalStats = useMemo(() => ({
    total: orders.length,
    notAssigned: orders.filter((o) => !o.is_assigned).length,
    confirmed: orders.filter((o) => o.status === "Confirmé").length,
    delivered: orders.filter((o) => o.status === "Livré").length,
    gare: orders.filter((o) => o.logistic_status === "Envoyé à la gare").length,
    paid: orders.filter((o) => o.payment_status === "Payé").length,
    totalStock: driverStocks.reduce((s, i) => s + Number(i.quantity || 0), 0),
  }), [orders, driverStocks])

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
    return orders.filter((o) => statusFilter === "Tous" || (o.status || "En attente") === statusFilter)
  }, [orders, statusFilter])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSubmitting(true)
    const { data, error } = await supabase.from("orders").insert([{
      ...form, quantity: Number(form.quantity), amount: Number(form.amount),
      delivery_type: normDT(form.delivery_type), status: "En attente", logistic_status: "En attente",
      payment_status: "Non payé", cash_collected: false, cash_collected_at: null, cash_collected_by: null,
      is_assigned: false, driver_name: null, assigned_driver_id: null, assigned_at: null,
      closer_id: profile?.id || null, closer_name: profile?.full_name || null,
      closer_commission: 0, driver_commission: 0, commission_calculated: false,
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
    alert("Commande créée ✅"); setSubmitting(false)
  }

  const requestAssign = (orderId: number) => {
    const driverId = selectedDrivers[orderId]
    if (!driverId) { alert("Choisis un livreur."); return }
    const driver = drivers.find((d) => d.id === driverId)
    if (!driver) return
    const order = orders.find((o) => o.id === orderId)
    if (order && isLocked(order)) { alert("Cette commande est finalisée."); return }
    setConfirmAssign({ orderId, driverName: driver.full_name })
  }

  const executeAssign = async () => {
    if (!confirmAssign) return
    const { orderId } = confirmAssign
    setConfirmAssign(null)
    const driverId = selectedDrivers[orderId]
    const driver = drivers.find((d) => d.id === driverId)
    if (!driver) return
    const payload = { assigned_driver_id: driver.id, driver_name: driver.full_name, is_assigned: true, assigned_at: new Date().toISOString() }
    const { error } = await supabase.from("orders").update(payload).eq("id", orderId)
    if (error) { alert("Erreur : " + error.message); return }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...payload } : o))
    alert(`${driver.full_name} assigné ✅`)
  }

  const logout = async () => { await supabase.auth.signOut(); router.replace("/login") }

  const periodLabels: Record<string, string> = { today: "Aujourd'hui", semaine: "Semaine", mois: "Ce mois" }

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "commissions", icon: "💰", label: "Commissions" },
    { id: "mes_commandes", icon: "📋", label: "Mes cmd" },
    { id: "assigner", icon: "👤", label: "Assigner" },
    { id: "creer", icon: "➕", label: "Créer" },
    { id: "stocks", icon: "🗄️", label: "Stocks" },
  ]

  const renderOrderCard = (o: Order, showAssign = false) => {
    const ss = statusStyle(o.status)
    const locked = isLocked(o)
    return (
      <div key={o.id} style={{ background: "#111118", border: `1px solid ${locked ? "#052e16" : "#1e1e2e"}`, borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 10 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{o.customer_name}</p>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>📍 {o.city} &nbsp;·&nbsp; {o.phone}</p>
          </div>
          <span style={{ background: locked ? "#052e16" : ss.bg, color: locked ? "#4ade80" : ss.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
            {locked ? "🔒 Finalisée" : (o.status || "En attente")}
          </span>
        </div>
        <div style={{ background: "#0a0a0f", borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, fontSize: 14, color: "#e5e7eb" }}><span>📦</span><span>{o.product} × {o.quantity || 1}</span></div>
          <div style={{ display: "flex", gap: 10, fontSize: 14 }}><span>💵</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>{fmt(o.amount)}</span></div>
          <div style={{ display: "flex", gap: 10, fontSize: 14, color: "#e5e7eb" }}><span>🚚</span><span>{prettyDT(o.delivery_type)}</span></div>
          <div style={{ display: "flex", gap: 10, fontSize: 14, color: "#e5e7eb" }}><span>👤</span><span>{o.driver_name || "Non assigné"}</span></div>
          <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#6b7280" }}><span>📅</span><span>Créée : {fmtDate(o.created_at)}</span></div>
          {o.delivered_at && <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#4ade80" }}><span>✅</span><span>Livrée : {fmtDate(o.delivered_at)}</span></div>}
        </div>
        {locked && o.closer_commission ? (
          <div style={{ background: "#1e3a5f", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#60a5fa", fontWeight: 600, marginBottom: 10 }}>
            💰 Ma commission : {fmt(o.closer_commission)}
          </div>
        ) : null}
        {showAssign && !locked && (
          <div style={{ display: "flex", gap: 8 }}>
            <select value={selectedDrivers[o.id] || ""} onChange={(e) => setSelectedDrivers((p) => ({ ...p, [o.id]: e.target.value }))}
              style={{ flex: 1, padding: "11px 12px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 12, color: "white", fontSize: 14, outline: "none" }}>
              <option value="">Choisir un livreur</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
            <button onClick={() => requestAssign(o.id)}
              style={{ padding: "11px 20px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Assigner
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
        .closer-app { display: flex; min-height: 100vh; background: #0a0a0f; color: white; font-family: Inter, Arial, sans-serif; }
        .sidebar { width: 240px; background: #111118; border-right: 1px solid #1e1e2e; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 50; transition: transform 0.3s; overflow-y: auto; }
        .sidebar-header { padding: 24px 20px; border-bottom: 1px solid #1e1e2e; }
        .sidebar-avatar { width: 44px; height: 44px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; color: #0a0a0f; margin-bottom: 12px; }
        .sidebar-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
        .sidebar-role { font-size: 12px; color: #9ca3af; }
        .sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; }
        .nav-btn { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: none; background: transparent; color: #9ca3af; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; width: 100%; text-align: left; transition: all 0.15s; }
        .nav-btn:hover { background: #1e1e2e; color: white; }
        .nav-btn.active { background: linear-gradient(135deg, #f59e0b20, #d9770610); color: #f59e0b; border: 1px solid #f59e0b30; }
        .sidebar-footer { padding: 16px 12px; border-top: 1px solid #1e1e2e; }
        .logout-btn { width: 100%; padding: 11px; background: #1e1e2e; border: 1px solid #2a2a3e; border-radius: 12px; color: #9ca3af; cursor: pointer; font-size: 14px; }
        .logout-btn:hover { background: #dc262620; color: #f87171; border-color: #dc262640; }
        .main-content { flex: 1; margin-left: 240px; min-height: 100vh; }
        .page-header { padding: 24px 32px; border-bottom: 1px solid #1e1e2e; background: #0a0a0f; position: sticky; top: 0; z-index: 10; }
        .page-title { font-size: 24px; font-weight: 700; }
        .content-area { padding: 28px 32px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .stat-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 20px; }
        .stat-card.accent { background: #1a1200; border-color: #f59e0b30; }
        .orders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .mobile-header { display: none; padding: 14px 16px; background: #111118; border-bottom: 1px solid #1e1e2e; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
        .bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #111118; border-top: 1px solid #1e1e2e; z-index: 50; }
        .bottom-nav-inner { display: flex; overflow-x: auto; }
        .bottom-nav-btn { flex: 1; min-width: 60px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px 14px; background: none; border: none; cursor: pointer; color: #4b5563; font-size: 10px; font-weight: 500; white-space: nowrap; }
        .bottom-nav-btn.active { color: #f59e0b; }
        .overlay-bg { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
        .filter-pills { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 20px; padding-bottom: 4px; }
        .filter-pill { padding: 8px 16px; border: 1px solid #2a2a3e; background: #111118; color: #6b7280; border-radius: 20px; cursor: pointer; font-size: 13px; white-space: nowrap; flex-shrink: 0; }
        .filter-pill.active { background: #f59e0b; color: #0a0a0f; border-color: #f59e0b; font-weight: 700; }
        .field { width: 100%; padding: 14px; background: #111118; border: 1px solid #2a2a3e; border-radius: 12px; color: white; font-size: 15px; outline: none; }
        @media (max-width: 1024px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .overlay-bg.open { display: block; }
          .main-content { margin-left: 0; padding-bottom: 80px; }
          .mobile-header { display: flex; }
          .bottom-nav { display: block; }
          .page-header { display: none; }
          .content-area { padding: 16px; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .orders-grid { grid-template-columns: 1fr; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="closer-app">

        {/* Confirmation assignation */}
        {confirmAssign && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
            <div style={{ background: "#111118", border: "1px solid #2a2a3e", borderRadius: 20, padding: 28, maxWidth: 360, width: "100%" }}>
              <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Assigner ce livreur ?</p>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>Tu vas assigner <strong style={{ color: "white" }}>{confirmAssign.driverName}</strong> à cette commande.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => setConfirmAssign(null)} style={{ padding: 13, background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 12, color: "#9ca3af", cursor: "pointer", fontSize: 14 }}>Retour</button>
                <button onClick={executeAssign} style={{ padding: 13, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Confirmer</button>
              </div>
            </div>
          </div>
        )}

        <div className={`overlay-bg ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-avatar">{profile?.full_name?.charAt(0).toUpperCase()}</div>
            <p className="sidebar-name">{profile?.full_name}</p>
            <p className="sidebar-role">💼 Closureuse</p>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button key={item.id} className={`nav-btn ${activeView === item.id ? "active" : ""}`} onClick={() => { setActiveView(item.id); setSidebarOpen(false) }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button onClick={logout} className="logout-btn">🚪 Déconnexion</button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="mobile-header">
          <button style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer" }} onClick={() => setSidebarOpen(true)}>☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#0a0a0f" }}>{profile?.full_name?.charAt(0).toUpperCase()}</div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{profile?.full_name}</span>
          </div>
          <button onClick={logout} style={{ padding: "7px 14px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 20, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>Déco</button>
        </div>

        {/* Main */}
        <main className="main-content">
          <div className="page-header">
            <p className="page-title">
              {activeView === "dashboard" && "📊 Tableau de bord"}
              {activeView === "commissions" && "💰 Mes commissions"}
              {activeView === "mes_commandes" && "📋 Mes commandes"}
              {activeView === "assigner" && "👤 Assigner les livreurs"}
              {activeView === "creer" && "➕ Nouvelle commande"}
              {activeView === "stocks" && "🗄️ Stocks livreurs"}
            </p>
          </div>

          <div className="content-area">

            {/* DASHBOARD */}
            {activeView === "dashboard" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                  <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 20, textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Créées aujourd'hui</p>
                    <p style={{ fontSize: 40, fontWeight: 700 }}>{todayStats.created}</p>
                  </div>
                  <div style={{ background: "#052e16", border: "1px solid #4ade8030", borderRadius: 16, padding: 20, textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Livrées aujourd'hui</p>
                    <p style={{ fontSize: 40, fontWeight: 700, color: "#4ade80" }}>{todayStats.delivered}</p>
                  </div>
                </div>
                <div className="stats-grid">
                  <div className="stat-card accent"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>📦 Total</p><p style={{ fontSize: 32, fontWeight: 700 }}>{globalStats.total}</p></div>
                  <div className="stat-card"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>⚠️ Non assignées</p><p style={{ fontSize: 32, fontWeight: 700, color: "#fb923c" }}>{globalStats.notAssigned}</p></div>
                  <div className="stat-card"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>✅ Confirmées</p><p style={{ fontSize: 32, fontWeight: 700, color: "#60a5fa" }}>{globalStats.confirmed}</p></div>
                  <div className="stat-card"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>🎯 Livrées</p><p style={{ fontSize: 32, fontWeight: 700, color: "#4ade80" }}>{globalStats.delivered}</p></div>
                  <div className="stat-card"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>🚌 Gare</p><p style={{ fontSize: 32, fontWeight: 700, color: "#c084fc" }}>{globalStats.gare}</p></div>
                  <div className="stat-card"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>💰 Payées</p><p style={{ fontSize: 32, fontWeight: 700, color: "#4ade80" }}>{globalStats.paid}</p></div>
                </div>
                <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 20, marginBottom: 16 }}>
                  <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 14, fontWeight: 600 }}>STOCK PAR LIVREUR</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                    {Object.entries(stockByDriver).length === 0 ? <p style={{ color: "#6b7280" }}>Aucun stock</p> :
                      Object.entries(stockByDriver).map(([driver, qty]) => (
                        <div key={driver} style={{ background: "#0a0a0f", borderRadius: 12, padding: 14, textAlign: "center" }}>
                          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>{driver}</p>
                          <p style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{qty}</p>
                        </div>
                      ))}
                  </div>
                </div>
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
                  <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)", border: "1px solid #60a5fa30", borderRadius: 20, padding: 24 }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Gagné — {periodLabels[periodFilter]}</p>
                    <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>{fmt(commissionStats.total)}</p>
                    <p style={{ fontSize: 13, color: "#6b7280" }}>{commissionStats.count} commande(s)</p>
                  </div>
                  <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 20, padding: 24 }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Total depuis le début</p>
                    <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>{fmt(commissionStats.allTime)}</p>
                    <p style={{ fontSize: 13, color: "#6b7280" }}>{commissionStats.allCount} commande(s)</p>
                  </div>
                </div>
                <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 14, padding: 16, display: "flex", gap: 12, fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>
                  <span>💡</span>
                  <p>500 FCFA par commande <strong style={{ color: "white" }}>Livré + Payé</strong>. Automatiquement enregistré quand le livreur finalise.</p>
                </div>
              </div>
            )}

            {/* MES COMMANDES */}
            {activeView === "mes_commandes" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Mes commandes</h2>
                  <span style={{ background: "#f59e0b", color: "#0a0a0f", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{myOrders.length}</span>
                </div>
                <div className="filter-pills">
                  {["Tous", "En attente", "Confirmé", "Livré", "Annulé"].map((s) => (
                    <button key={s} className={`filter-pill ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s}</button>
                  ))}
                </div>
                {myOrders.filter((o) => statusFilter === "Tous" || (o.status || "En attente") === statusFilter).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>📭</p><p>Aucune commande</p></div>
                ) : (
                  <div className="orders-grid">
                    {myOrders.filter((o) => statusFilter === "Tous" || (o.status || "En attente") === statusFilter).map((o) => renderOrderCard(o))}
                  </div>
                )}
              </div>
            )}

            {/* ASSIGNER */}
            {activeView === "assigner" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Toutes les commandes</h2>
                  <span style={{ background: "#f59e0b", color: "#0a0a0f", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{filteredAllOrders.length}</span>
                </div>
                <div className="filter-pills">
                  {["Tous", "En attente", "Confirmé", "Livré", "Annulé"].map((s) => (
                    <button key={s} className={`filter-pill ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s}</button>
                  ))}
                </div>
                {filteredAllOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>📭</p><p>Aucune commande</p></div>
                ) : (
                  <div className="orders-grid">
                    {filteredAllOrders.map((o) => renderOrderCard(o, true))}
                  </div>
                )}
              </div>
            )}

            {/* CRÉER */}
            {activeView === "creer" && (
              <div style={{ maxWidth: 700 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Nouvelle commande</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-grid" style={{ marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Nom client</label>
                      <input name="customer_name" value={form.customer_name} onChange={handleChange} required className="field" placeholder="Ex: Kofi Mensah" />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Téléphone</label>
                      <input name="phone" value={form.phone} onChange={handleChange} required className="field" placeholder="Ex: 90 00 00 00" />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Ville</label>
                      <input name="city" value={form.city} onChange={handleChange} required className="field" placeholder="Ex: Lomé" />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Adresse</label>
                      <input name="address" value={form.address} onChange={handleChange} required className="field" placeholder="Ex: Akodessewa..." />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Produit</label>
                      <input name="product" value={form.product} onChange={handleChange} required className="field" placeholder="Ex: THERAWOLF" />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Montant (FCFA)</label>
                      <input name="amount" type="number" value={form.amount} onChange={handleChange} required className="field" placeholder="Ex: 25000" />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Quantité</label>
                      <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} required className="field" />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Type de livraison</label>
                      <select name="delivery_type" value={form.delivery_type} onChange={handleChange} required className="field">
                        <option value="">Choisir...</option>
                        <option value="direct">🚚 Direct</option>
                        <option value="gare">🚌 Gare</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting}
                    style={{ width: "100%", padding: 18, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 14, color: "#0a0a0f", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                    {submitting ? "Création..." : "✅ Créer la commande"}
                  </button>
                </form>
              </div>
            )}

            {/* STOCKS */}
            {activeView === "stocks" && (
              <div>
                <div style={{ marginBottom: 20, maxWidth: 300 }}>
                  <select value={stockDriverFilter} onChange={(e) => setStockDriverFilter(e.target.value)}
                    style={{ width: "100%", padding: "12px 14px", background: "#111118", border: "1px solid #2a2a3e", borderRadius: 12, color: "white", fontSize: 14, outline: "none" }}>
                    <option value="Tous">Tous les livreurs</option>
                    {drivers.map((d) => <option key={d.id} value={d.full_name}>{d.full_name}</option>)}
                  </select>
                </div>
                {filteredDriverStocks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>📭</p><p>Aucun stock</p></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                    {filteredDriverStocks.map((s) => (
                      <div key={s.id} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 24, textAlign: "center" }}>
                        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>{s.driver_name}</p>
                        <p style={{ fontSize: 36, marginBottom: 8 }}>📦</p>
                        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{s.product_name}</p>
                        <p style={{ fontSize: 40, fontWeight: 700, color: s.quantity > 0 ? "#f59e0b" : "#f87171" }}>{s.quantity}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>unités</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Bottom nav mobile */}
        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            {navItems.map((item) => (
              <button key={item.id} className={`bottom-nav-btn ${activeView === item.id ? "active" : ""}`} onClick={() => setActiveView(item.id)}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}