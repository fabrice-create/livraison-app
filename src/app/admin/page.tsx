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
  cash_collected?: boolean | null
  cash_collected_at?: string | null
  cash_collected_by?: string | null
  status?: string
  logistic_status?: string | null
  payment_status?: string | null
  driver_name?: string | null
  assigned_driver_id?: string | null
  is_assigned?: boolean
  assigned_at?: string | null
  closer_id?: string | null
  closer_name?: string | null
  closer_commission?: number | null
  driver_commission?: number | null
  commission_calculated?: boolean | null
  created_at?: string | null
  confirmed_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
}

type Profile = {
  id: string
  email: string
  role: string
  full_name: string
  phone?: string | null
}

type DriverStock = {
  id: number
  driver_id: string
  driver_name: string
  product_name: string
  quantity: number
}

type OrderHistory = {
  id: number
  created_at: string
  order_id: number
  action_type: string
  action_by_user_id: string
  action_by_name: string
  action_details: string
}

export default function AdminPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [closers, setClosers] = useState<Profile[]>([])
  const [driverStocks, setDriverStocks] = useState<DriverStock[]>([])
  const [history, setHistory] = useState<OrderHistory[]>([])
  const [selectedDrivers, setSelectedDrivers] = useState<Record<number, string>>({})
  const [selectedActions, setSelectedActions] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [stockLoading, setStockLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeView, setActiveView] = useState("dashboard")
  const [statusFilter, setStatusFilter] = useState("Tous")
  const [driverFilter, setDriverFilter] = useState("Tous")
  const [search, setSearch] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [periodFilter, setPeriodFilter] = useState("mois")
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: string } | null>(null)

  const [form, setForm] = useState({
    customer_name: "", phone: "", city: "", address: "",
    product: "", quantity: "1", delivery_type: "", amount: "",
  })
  const [stockForm, setStockForm] = useState({ driver_id: "", product_name: "", quantity: "1" })

  useEffect(() => { void initPage() }, [])

  const normalizeRole = (r?: string | null) => (r || "").trim().toLowerCase()
  const normDT = (v?: string | null) => {
    const c = (v || "").trim().toLowerCase()
    if (c === "direct") return "direct"
    if (c === "gare") return "gare"
    return c
  }
  const prettyDT = (v?: string | null) => { const n = normDT(v); if (n === "direct") return "Direct"; if (n === "gare") return "Gare"; return v || "-" }
  const isDirect = (v?: string | null) => normDT(v) === "direct"
  const isGare = (v?: string | null) => normDT(v) === "gare"
  const isLocked = (o: Order) => o.status === "Livré" && o.payment_status === "Payé"
  const fmt = (v?: number | string | null) => { if (v === null || v === undefined || v === "") return "-"; return `${Number(v).toLocaleString()} FCFA` }
  const fmtDate = (d?: string | null) => { if (!d) return "-"; return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) }
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

  const sanitizePhone = (p?: string | null) => String(p || "").replace(/[^\d]/g, "")
  const getDriverPhone = (id?: string | null) => { if (!id) return ""; const d = drivers.find((d) => d.id === id); return sanitizePhone(d?.phone || null) }
  const waUrl = (phone: string, msg: string) => { const p = sanitizePhone(phone); if (!p) return "#"; return `https://wa.me/${p}?text=${encodeURIComponent(msg)}` }
  const clientMsg = (o: Order) => `Bonjour ${o.customer_name},\n\nVotre commande est en cours de traitement.\n\nProduit : ${o.product}\nQuantité : ${o.quantity || 1}\nMontant : ${fmt(o.amount)}\nVille : ${o.city}\nLivraison : ${prettyDT(o.delivery_type)}\n\nMerci de confirmer votre disponibilité.`
  const driverMsg = (o: Order) => `Bonjour,\n\nNouvelle commande assignée.\n\nClient : ${o.customer_name}\nTél : ${o.phone}\nVille : ${o.city}\nAdresse : ${o.address}\nProduit : ${o.product}\nQuantité : ${o.quantity || 1}\nMontant : ${fmt(o.amount)}\nLivraison : ${prettyDT(o.delivery_type)}\n\nMerci.`

  const addHistory = async (orderId: number, actionType: string, details: string) => {
    if (!profile) return
    const { data } = await supabase.from("order_history").insert([{ order_id: orderId, action_type: actionType, action_by_user_id: profile.id, action_by_name: profile.full_name, action_details: details }]).select()
    if (data) setHistory((prev) => [...(data as OrderHistory[]), ...prev])
  }

  const initPage = async () => {
    setAuthLoading(true)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.replace("/login"); return }
    const { data: pd } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (!pd) { router.replace("/login"); return }
    const p = pd as Profile
    if (normalizeRole(p.role) !== "admin") {
      if (normalizeRole(p.role) === "closureuse") router.replace("/closureuse")
      else if (normalizeRole(p.role) === "livreur") router.replace("/livreur")
      else router.replace("/login")
      return
    }
    setProfile(p)
    const { data: profiles } = await supabase.from("profiles").select("*").order("full_name", { ascending: true })
    if (profiles) {
      const all = profiles as Profile[]
      setDrivers(all.filter((pr) => normalizeRole(pr.role) === "livreur"))
      setClosers(all.filter((pr) => normalizeRole(pr.role) === "closureuse"))
    }
    const { data: od } = await supabase.from("orders").select("*").order("id", { ascending: false })
    const fetched = (od as Order[]) || []
    setOrders(fetched)
    const sel: Record<number, string> = {}
    const act: Record<number, string> = {}
    fetched.forEach((o) => { sel[o.id] = o.assigned_driver_id || ""; act[o.id] = "" })
    setSelectedDrivers(sel)
    setSelectedActions(act)
    const { data: sd } = await supabase.from("driver_stock").select("*").order("id", { ascending: false })
    setDriverStocks((sd as DriverStock[]) || [])
    const { data: hd } = await supabase.from("order_history").select("*").order("created_at", { ascending: false })
    setHistory((hd as OrderHistory[]) || [])
    setAuthLoading(false)
  }

  const filterByPeriod = (list: Order[], field: "delivered_at" | "created_at") => {
    const now = new Date()
    return list.filter((o) => {
      const d = o[field]; if (!d) return false
      const date = new Date(d)
      if (periodFilter === "today") return date.toDateString() === now.toDateString()
      if (periodFilter === "semaine") return (now.getTime() - date.getTime()) / 86400000 <= 7
      if (periodFilter === "mois") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      return true
    })
  }

  const todayStats = useMemo(() => {
    const created = orders.filter((o) => isToday(o.created_at)).length
    const delivered = orders.filter((o) => isToday(o.delivered_at)).length
    const amount = orders.filter((o) => isToday(o.delivered_at) && o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0)
    return { created, delivered, amount }
  }, [orders])

  const dashStats = useMemo(() => {
    const total = orders.length
    const notAssigned = orders.filter((o) => !o.is_assigned).length
    const confirmed = orders.filter((o) => o.status === "Confirmé").length
    const delivered = orders.filter((o) => o.status === "Livré").length
    const gare = orders.filter((o) => o.logistic_status === "Envoyé à la gare").length
    const collected = orders.filter((o) => o.cash_collected === true).length
    const notCollected = orders.filter((o) => o.cash_collected !== true).length
    const amountCollected = orders.filter((o) => o.cash_collected === true).reduce((s, o) => s + Number(o.amount || 0), 0)
    const amountPending = orders.filter((o) => o.cash_collected !== true).reduce((s, o) => s + Number(o.amount || 0), 0)
    const stockByDriver = driverStocks.reduce((acc: Record<string, number>, i) => { acc[i.driver_name] = (acc[i.driver_name] || 0) + Number(i.quantity || 0); return acc }, {})
    return { total, notAssigned, confirmed, delivered, gare, collected, notCollected, amountCollected, amountPending, stockByDriver }
  }, [orders, driverStocks])

  const commissionStats = useMemo(() => {
    const byDriver: Record<string, { name: string; total: number; count: number }> = {}
    const filteredDelivered = filterByPeriod(orders.filter((o) => o.status === "Livré" && o.driver_commission && o.driver_commission > 0), "delivered_at")
    filteredDelivered.forEach((o) => {
      const key = o.assigned_driver_id || "inconnu"
      const name = o.driver_name || "Inconnu"
      if (!byDriver[key]) byDriver[key] = { name, total: 0, count: 0 }
      byDriver[key].total += Number(o.driver_commission)
      byDriver[key].count += 1
    })
    const byCloser: Record<string, { name: string; total: number; count: number }> = {}
    const filteredCloser = filterByPeriod(orders.filter((o) => o.closer_id && o.closer_commission && o.closer_commission > 0), "delivered_at")
    filteredCloser.forEach((o) => {
      const key = o.closer_id || "inconnu"
      const closerProfile = closers.find((c) => c.id === key)
      const name = closerProfile?.full_name || o.closer_name || "Closureuse"
      if (!byCloser[key]) byCloser[key] = { name, total: 0, count: 0 }
      byCloser[key].total += Number(o.closer_commission)
      byCloser[key].count += 1
    })
    const totalDriver = Object.values(byDriver).reduce((s, v) => s + v.total, 0)
    const totalCloser = Object.values(byCloser).reduce((s, v) => s + v.total, 0)
    return { byDriver, byCloser, totalDriver, totalCloser }
  }, [orders, closers, periodFilter])

  const visibleOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === "Tous" ? true : (o.status || "En attente") === statusFilter
      const matchDriver = driverFilter === "Tous" ? true : o.driver_name === driverFilter
      const q = search.trim().toLowerCase()
      const matchSearch = q === "" ? true : [o.customer_name, o.phone, o.city, o.driver_name || "", o.product, o.logistic_status || "", o.payment_status || "", String(o.amount || "")].join(" ").toLowerCase().includes(q)
      return matchStatus && matchDriver && matchSearch
    })
  }, [orders, statusFilter, driverFilter, search])

  const getOrderHistory = (id: number) => history.filter((h) => h.order_id === id)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value })
  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setStockForm({ ...stockForm, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setLoading(true)
    const { data, error } = await supabase.from("orders").insert([{
      ...form, quantity: Number(form.quantity), delivery_type: normDT(form.delivery_type), amount: Number(form.amount),
      cash_collected: false, cash_collected_at: null, cash_collected_by: null,
      status: "En attente", logistic_status: "En attente", payment_status: "Non payé",
      driver_name: null, assigned_driver_id: null, is_assigned: false, assigned_at: null,
      closer_id: profile?.id || null, closer_name: profile?.full_name || null,
      closer_commission: 0, driver_commission: 0, commission_calculated: false,
    }]).select()
    if (error) { alert("Erreur : " + error.message) }
    else if (data) {
      const newOrders = data as Order[]
      setOrders([...newOrders, ...orders])
      const sel = { ...selectedDrivers }; const act = { ...selectedActions }
      newOrders.forEach((o) => { sel[o.id] = ""; act[o.id] = "" })
      setSelectedDrivers(sel); setSelectedActions(act)
      if (newOrders[0]) await addHistory(newOrders[0].id, "commande_creee", `Commande créée pour ${newOrders[0].customer_name}`)
      setForm({ customer_name: "", phone: "", city: "", address: "", product: "", quantity: "1", delivery_type: "", amount: "" })
      alert("Commande créée ✅")
    }
    setLoading(false)
  }

  const handleAddStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setStockLoading(true)
    const driver = drivers.find((d) => d.id === stockForm.driver_id)
    if (!driver) { alert("Choisis un livreur."); setStockLoading(false); return }
    const productName = stockForm.product_name.trim()
    const qty = Number(stockForm.quantity)
    if (!productName || qty <= 0) { alert("Produit ou quantité invalide."); setStockLoading(false); return }
    const existing = driverStocks.find((i) => i.driver_id === driver.id && i.product_name.trim().toLowerCase() === productName.toLowerCase())
    if (existing) {
      const newQty = Number(existing.quantity) + qty
      const { error } = await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", existing.id)
      if (error) { alert("Erreur : " + error.message); setStockLoading(false); return }
      setDriverStocks((prev) => prev.map((i) => i.id === existing.id ? { ...i, quantity: newQty } : i))
    } else {
      const { data, error } = await supabase.from("driver_stock").insert([{ driver_id: driver.id, driver_name: driver.full_name, product_name: productName, quantity: qty }]).select()
      if (error) { alert("Erreur : " + error.message); setStockLoading(false); return }
      if (data) setDriverStocks([...(data as DriverStock[]), ...driverStocks])
    }
    setStockForm({ driver_id: "", product_name: "", quantity: "1" })
    alert("Stock ajouté ✅"); setStockLoading(false)
  }

  const updateStatus = async (id: number, newStatus: string) => {
    const extra: Record<string, string | null> = {}
    if (newStatus === "Confirmé") extra.confirmed_at = new Date().toISOString()
    if (newStatus === "Annulé") extra.cancelled_at = new Date().toISOString()
    const { error } = await supabase.from("orders").update({ status: newStatus, ...extra }).eq("id", id)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus, ...extra } : o))
    await addHistory(id, "statut_modifie", `Statut → ${newStatus}`)
    return true
  }

  const updatePayment = async (id: number, ps: string, collected: boolean) => {
    const payload = { payment_status: ps, cash_collected: collected, cash_collected_at: collected ? new Date().toISOString() : null, cash_collected_by: collected ? profile?.full_name || null : null }
    const { error } = await supabase.from("orders").update(payload).eq("id", id)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...payload } : o))
    await addHistory(id, "paiement_modifie", `Paiement → ${ps}`)
    return true
  }

  const consumeStock = async (order: Order) => {
    const driverId = order.assigned_driver_id
    const productName = (order.product || "").trim()
    const qty = Number(order.quantity || 1)
    if (!driverId || !productName || qty <= 0) { alert("Commande incomplète."); return false }
    const item = driverStocks.find((i) => i.driver_id === driverId && i.product_name.trim().toLowerCase() === productName.toLowerCase())
    if (!item) { alert("Aucun stock trouvé pour ce livreur et ce produit."); return false }
    if (Number(item.quantity) < qty) { alert("Stock insuffisant."); return false }
    const newQty = Number(item.quantity) - qty
    const { error } = await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", item.id)
    if (error) { alert("Erreur stock : " + error.message); return false }
    setDriverStocks((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: newQty } : i))
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
    await addHistory(order.id, "livraison_payee", "Livré + Payé — commissions enregistrées")
    return true
  }

  const markSentToGare = async (order: Order) => {
    const ok = await consumeStock(order)
    if (!ok) return false
    const { error } = await supabase.from("orders").update({ logistic_status: "Envoyé à la gare" }).eq("id", order.id)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, logistic_status: "Envoyé à la gare" } : o))
    await addHistory(order.id, "envoye_gare", "Envoyé à la gare")
    return true
  }

  const assignDriver = async (orderId: number) => {
    const driverId = selectedDrivers[orderId]
    if (!driverId) { alert("Choisis d'abord un livreur."); return false }
    const driver = drivers.find((d) => d.id === driverId)
    if (!driver) { alert("Livreur introuvable."); return false }
    const payload = { driver_name: driver.full_name, assigned_driver_id: driver.id, is_assigned: true, assigned_at: new Date().toISOString() }
    const { error } = await supabase.from("orders").update(payload).eq("id", orderId)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...payload } : o))
    await addHistory(orderId, "livreur_assigne", `Livreur : ${driver.full_name}`)
    return true
  }

  const getActions = (order: Order) => {
    if (isLocked(order)) return [{ value: "", label: "🔒 Commande finalisée" }]
    const actions = [{ value: "", label: "Choisir une action" }, { value: "confirmer", label: "✅ Confirmer" }, { value: "annuler", label: "❌ Annuler" }]
    if (isDirect(order.delivery_type)) actions.push({ value: "livre_paye", label: "🎯 Livré + Payé" })
    if (isGare(order.delivery_type)) { actions.push({ value: "gare", label: "🚌 Envoyé à la gare" }); actions.push({ value: "paye", label: "💰 Marquer Payé" }) }
    actions.push({ value: "assigner", label: "👤 Assigner livreur" })
    return actions
  }

  const requestAction = (order: Order) => {
    const action = selectedActions[order.id]
    if (!action) { alert("Choisis une action."); return }
    if (isLocked(order)) { alert("Cette commande est finalisée et verrouillée."); return }
    if (action === "livre_paye" || action === "annuler") setConfirmAction({ order, action })
    else void executeAction(order, action)
  }

  const executeAction = async (order: Order, action: string) => {
    setConfirmAction(null)
    if (action === "confirmer") { const ok = await updateStatus(order.id, "Confirmé"); if (ok) alert("Confirmée ✅") }
    if (action === "livre_paye") { const ok = await markDeliveredAndPaid(order); if (ok) alert("Livrée et payée ✅") }
    if (action === "gare") { const ok = await markSentToGare(order); if (ok) alert("Envoyée à la gare ✅") }
    if (action === "paye") { const ok = await updatePayment(order.id, "Payé", true); if (ok) alert("Payée ✅") }
    if (action === "annuler") { const ok = await updateStatus(order.id, "Annulé"); if (ok) alert("Annulée ✅") }
    if (action === "assigner") { const ok = await assignDriver(order.id); if (ok) alert("Livreur assigné ✅") }
    setSelectedActions((prev) => ({ ...prev, [order.id]: "" }))
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login") }

  const periodLabels: Record<string, string> = { today: "Aujourd'hui", semaine: "Cette semaine", mois: "Ce mois" }

  if (authLoading) return (
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

      {confirmAction && (
        <div className="overlay">
          <div className="confirm-modal">
            <p className="confirm-title">{confirmAction.action === "livre_paye" ? "🎯 Confirmer la livraison ?" : "❌ Annuler la commande ?"}</p>
            <p className="confirm-sub">{confirmAction.action === "livre_paye" ? `La commande de ${confirmAction.order.customer_name} sera marquée Livré + Payé. Irréversible.` : `La commande de ${confirmAction.order.customer_name} sera annulée définitivement.`}</p>
            <div className="confirm-btns">
              <button className="confirm-cancel" onClick={() => setConfirmAction(null)}>Annuler</button>
              <button className={`confirm-ok ${confirmAction.action === "annuler" ? "red" : ""}`} onClick={() => executeAction(confirmAction.order, confirmAction.action)}>
                {confirmAction.action === "livre_paye" ? "Confirmer" : "Oui, annuler"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-left">
          <div className="avatar">{profile?.full_name?.charAt(0).toUpperCase()}</div>
          <div>
            <p className="header-name">{profile?.full_name}</p>
            <p className="header-role">🛒 Administrateur</p>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">Déconnexion</button>
      </header>

      <main className="content">

        {/* NAV TABS */}
        <div className="tab-bar">
          {[
            { id: "dashboard", label: "⊞ Dashboard" },
            { id: "commandes", label: "📦 Commandes" },
            { id: "creer", label: "➕ Créer" },
            { id: "stock", label: "🗄️ Stock" },
            { id: "commissions", label: "💰 Commissions" },
          ].map((t) => (
            <button key={t.id} className={`tab-btn ${activeView === t.id ? "active" : ""}`} onClick={() => setActiveView(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* DASHBOARD */}
        {activeView === "dashboard" && (
          <div className="view">
            <h2 className="view-title">Dashboard</h2>

            <p className="section-label">Aujourd'hui</p>
            <div className="today-row">
              <div className="today-card">
                <p className="today-label">Créées</p>
                <p className="today-value">{todayStats.created}</p>
              </div>
              <div className="today-card green">
                <p className="today-label">Livrées</p>
                <p className="today-value">{todayStats.delivered}</p>
              </div>
              <div className="today-card amber">
                <p className="today-label">Encaissé</p>
                <p className="today-value-sm">{fmt(todayStats.amount)}</p>
              </div>
            </div>

            <p className="section-label">Global</p>
            <div className="stats-grid">
              <div className="stat-card accent"><span className="stat-icon">📦</span><span className="stat-value">{dashStats.total}</span><span className="stat-label">Total</span></div>
              <div className="stat-card"><span className="stat-icon">⚠️</span><span className="stat-value" style={{ color: "#fb923c" }}>{dashStats.notAssigned}</span><span className="stat-label">Non assignées</span></div>
              <div className="stat-card"><span className="stat-icon">✅</span><span className="stat-value" style={{ color: "#60a5fa" }}>{dashStats.confirmed}</span><span className="stat-label">Confirmées</span></div>
              <div className="stat-card"><span className="stat-icon">🎯</span><span className="stat-value" style={{ color: "#4ade80" }}>{dashStats.delivered}</span><span className="stat-label">Livrées</span></div>
              <div className="stat-card"><span className="stat-icon">🚌</span><span className="stat-value" style={{ color: "#c084fc" }}>{dashStats.gare}</span><span className="stat-label">Gare</span></div>
              <div className="stat-card"><span className="stat-icon">💵</span><span className="stat-value" style={{ color: "#4ade80" }}>{dashStats.collected}</span><span className="stat-label">Encaissées</span></div>
            </div>

            <div className="amount-row">
              <div className="amount-card green">
                <p className="amount-label">💵 Montant encaissé</p>
                <p className="amount-value">{fmt(dashStats.amountCollected)}</p>
              </div>
              <div className="amount-card red">
                <p className="amount-label">⏳ En attente</p>
                <p className="amount-value">{fmt(dashStats.amountPending)}</p>
              </div>
            </div>

            <p className="section-label">Stock par livreur</p>
            <div className="stock-mini-grid">
              {Object.entries(dashStats.stockByDriver).map(([driver, qty]) => (
                <div key={driver} className="stock-mini">
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>{driver}</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{qty}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMMANDES */}
        {activeView === "commandes" && (
          <div className="view">
            <h2 className="view-title">Commandes <span className="count-badge">{visibleOrders.length}</span></h2>

            <div className="search-box">
              <input type="text" placeholder="🔍 Recherche nom, ville, produit, livreur..." value={search} onChange={(e) => setSearch(e.target.value)} className="field" />
            </div>

            <div className="filter-row">
              {["Tous", "En attente", "Confirmé", "Livré", "Annulé"].map((s) => (
                <button key={s} className={`filter-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>

            <div className="filter-row" style={{ marginBottom: 16 }}>
              <button className={`filter-btn ${driverFilter === "Tous" ? "active" : ""}`} onClick={() => setDriverFilter("Tous")}>Tous livreurs</button>
              {drivers.map((d) => (
                <button key={d.id} className={`filter-btn ${driverFilter === d.full_name ? "active" : ""}`} onClick={() => setDriverFilter(d.full_name)}>{d.full_name}</button>
              ))}
            </div>

            {visibleOrders.length === 0 ? (
              <div className="empty-state"><p style={{ fontSize: 40 }}>📭</p><p>Aucune commande</p></div>
            ) : (
              <div className="orders-list">
                {visibleOrders.map((order) => {
                  const ss = statusStyle(order.status)
                  const ls = statusStyle(order.logistic_status)
                  const ps = statusStyle(order.payment_status)
                  const locked = isLocked(order)
                  const driverPhone = getDriverPhone(order.assigned_driver_id)
                  return (
                    <div key={order.id} className={`order-card ${locked ? "locked" : ""}`}>
                      <div className="order-header">
                        <div>
                          <p className="order-name">{order.customer_name}</p>
                          <p className="order-city">📍 {order.city} · {order.phone}</p>
                        </div>
                        <span className="status-pill" style={{ background: locked ? "#052e16" : ss.bg, color: locked ? "#4ade80" : ss.color }}>
                          {locked ? "🔒 Finalisée" : (order.status || "En attente")}
                        </span>
                      </div>
                      <div className="order-details">
                        <div className="detail-row"><span>📦</span><span>{order.product} × {order.quantity || 1}</span></div>
                        <div className="detail-row"><span>💵</span><span style={{ color: "#f59e0b", fontWeight: 600 }}>{fmt(order.amount)}</span></div>
                        <div className="detail-row"><span>🚚</span><span>{prettyDT(order.delivery_type)}</span></div>
                        <div className="detail-row"><span>👤</span><span>{order.driver_name || "Non assigné"}</span></div>
                        <div className="detail-row"><span>📅</span><span style={{ fontSize: 12, color: "#6b7280" }}>Créée : {fmtDate(order.created_at)}</span></div>
                        {order.delivered_at && <div className="detail-row"><span>✅</span><span style={{ fontSize: 12, color: "#4ade80" }}>Livrée : {fmtDate(order.delivered_at)}</span></div>}
                        {order.cancelled_at && <div className="detail-row"><span>❌</span><span style={{ fontSize: 12, color: "#f87171" }}>Annulée : {fmtDate(order.cancelled_at)}</span></div>}
                        {(order.driver_commission || order.closer_commission) ? (
                          <div className="detail-row"><span>💰</span><span style={{ fontSize: 12, color: "#4ade80" }}>Comm livreur : {fmt(order.driver_commission)} · Closureuse : {fmt(order.closer_commission)}</span></div>
                        ) : null}
                      </div>
                      <div className="status-row">
                        <span className="mini-badge" style={{ background: ls.bg, color: ls.color }}>{order.logistic_status || "En attente"}</span>
                        <span className="mini-badge" style={{ background: ps.bg, color: ps.color }}>{order.payment_status || "Non payé"}</span>
                      </div>
                      <div className="wa-row">
                        <a href={waUrl(order.phone, clientMsg(order))} target="_blank" rel="noreferrer" className="wa-btn green">📱 Client</a>
                        {driverPhone ? (
                          <a href={waUrl(driverPhone, driverMsg(order))} target="_blank" rel="noreferrer" className="wa-btn blue">📱 Livreur</a>
                        ) : (
                          <span className="wa-btn disabled">Pas de numéro</span>
                        )}
                      </div>
                      {!locked && (
                        <div className="action-row">
                          <select value={selectedActions[order.id] || ""} onChange={(e) => setSelectedActions((p) => ({ ...p, [order.id]: e.target.value }))} className="action-select">
                            {getActions(order).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                          <select value={selectedDrivers[order.id] || ""} onChange={(e) => setSelectedDrivers((p) => ({ ...p, [order.id]: e.target.value }))} className="action-select">
                            <option value="">Choisir livreur</option>
                            {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                          </select>
                          <button onClick={() => requestAction(order)} className="action-btn">Appliquer</button>
                        </div>
                      )}
                      {getOrderHistory(order.id).length > 0 && (
                        <div className="history-block">
                          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Historique</p>
                          {getOrderHistory(order.id).slice(0, 3).map((h) => (
                            <div key={h.id} className="history-item">
                              <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>{h.action_by_name} — {h.action_type}</p>
                              <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{h.action_details} · {fmtDate(h.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* CRÉER */}
        {activeView === "creer" && (
          <div className="view">
            <h2 className="view-title">Nouvelle commande</h2>
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group"><label className="form-label">Nom client</label><input name="customer_name" value={form.customer_name} onChange={handleChange} required className="field" placeholder="Ex: Kofi Mensah" /></div>
              <div className="form-group"><label className="form-label">Téléphone</label><input name="phone" value={form.phone} onChange={handleChange} required className="field" placeholder="Ex: 90 00 00 00" /></div>
              <div className="form-group"><label className="form-label">Ville</label><input name="city" value={form.city} onChange={handleChange} required className="field" /></div>
              <div className="form-group"><label className="form-label">Adresse</label><input name="address" value={form.address} onChange={handleChange} required className="field" /></div>
              <div className="form-group"><label className="form-label">Produit</label><input name="product" value={form.product} onChange={handleChange} required className="field" /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Quantité</label><input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} required className="field" /></div>
                <div className="form-group"><label className="form-label">Montant (FCFA)</label><input name="amount" type="number" value={form.amount} onChange={handleChange} required className="field" /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Type de livraison</label>
                <select name="delivery_type" value={form.delivery_type} onChange={handleChange} required className="field">
                  <option value="">Choisir...</option>
                  <option value="direct">🚚 Direct</option>
                  <option value="gare">🚌 Gare</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="submit-btn">{loading ? "Création..." : "✅ Créer la commande"}</button>
            </form>
          </div>
        )}

        {/* STOCK */}
        {activeView === "stock" && (
          <div className="view">
            <h2 className="view-title">Stock livreurs</h2>
            <form onSubmit={handleAddStock} className="form" style={{ marginBottom: 24 }}>
              <div className="form-group">
                <label className="form-label">Livreur</label>
                <select name="driver_id" value={stockForm.driver_id} onChange={handleStockChange} required className="field">
                  <option value="">Choisir un livreur</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Produit</label><input name="product_name" value={stockForm.product_name} onChange={handleStockChange} required className="field" /></div>
              <div className="form-group"><label className="form-label">Quantité à ajouter</label><input name="quantity" type="number" min="1" value={stockForm.quantity} onChange={handleStockChange} required className="field" /></div>
              <button type="submit" disabled={stockLoading} className="submit-btn">{stockLoading ? "Ajout..." : "➕ Ajouter le stock"}</button>
            </form>
            <p className="section-label">Stock actuel</p>
            {driverStocks.length === 0 ? (
              <div className="empty-state"><p style={{ fontSize: 40 }}>📭</p><p>Aucun stock</p></div>
            ) : (
              <div className="orders-list">
                {driverStocks.map((s) => (
                  <div key={s.id} className="order-card">
                    <div className="order-header">
                      <div><p className="order-name">{s.driver_name}</p><p className="order-city">📦 {s.product_name}</p></div>
                      <span style={{ fontSize: 28, fontWeight: 700, color: s.quantity > 0 ? "#f59e0b" : "#f87171" }}>{s.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMMISSIONS */}
        {activeView === "commissions" && (
          <div className="view">
            <h2 className="view-title">Commissions</h2>

            <div className="period-tabs">
              {Object.entries(periodLabels).map(([key, label]) => (
                <button key={key} className={`period-tab ${periodFilter === key ? "active" : ""}`} onClick={() => setPeriodFilter(key)}>{label}</button>
              ))}
            </div>

            <div className="amount-row">
              <div className="amount-card green">
                <p className="amount-label">Total livreurs</p>
                <p className="amount-value">{fmt(commissionStats.totalDriver)}</p>
              </div>
              <div className="amount-card blue">
                <p className="amount-label">Total closeuses</p>
                <p className="amount-value">{fmt(commissionStats.totalCloser)}</p>
              </div>
            </div>

            <p className="section-label" style={{ marginTop: 20 }}>🚚 Par livreur — 2 000 FCFA / livraison</p>
            {Object.values(commissionStats.byDriver).length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>Aucune commission sur cette période.</p>
            ) : (
              <div className="comm-list">
                {Object.values(commissionStats.byDriver).map((item, i) => (
                  <div key={i} className="comm-row">
                    <div><p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 2px" }}>{item.name}</p><p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{item.count} livraison(s)</p></div>
                    <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 18 }}>{fmt(item.total)}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="section-label" style={{ marginTop: 24 }}>💼 Par closureuse — 500 FCFA / livraison</p>
            {Object.values(commissionStats.byCloser).length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>Aucune commission sur cette période.</p>
            ) : (
              <div className="comm-list">
                {Object.values(commissionStats.byCloser).map((item, i) => (
                  <div key={i} className="comm-row">
                    <div><p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 2px" }}>{item.name}</p><p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{item.count} commande(s)</p></div>
                    <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 18 }}>{fmt(item.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .app { min-height: 100vh; background: #0a0a0f; color: white; font-family: 'Inter', Arial, sans-serif; max-width: 900px; margin: 0 auto; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
        .confirm-modal { background: #111118; border: 1px solid #2a2a3e; border-radius: 20px; padding: 24px; max-width: 340px; width: 100%; }
        .confirm-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .confirm-sub { font-size: 14px; color: #9ca3af; line-height: 1.5; margin-bottom: 20px; }
        .confirm-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .confirm-cancel { padding: 12px; background: #1e1e2e; border: 1px solid #2a2a3e; border-radius: 12px; color: #9ca3af; cursor: pointer; font-size: 14px; }
        .confirm-ok { padding: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 12px; color: #0a0a0f; font-weight: 700; cursor: pointer; font-size: 14px; }
        .confirm-ok.red { background: #dc2626; color: white; }
        .header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 16px; border-bottom: 1px solid #1a1a2e; position: sticky; top: 0; background: #0a0a0f; z-index: 10; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 40px; height: 40px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: #0a0a0f; }
        .header-name { font-size: 15px; font-weight: 600; }
        .header-role { font-size: 12px; color: #6b7280; margin-top: 1px; }
        .logout-btn { padding: 8px 14px; background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 20px; color: #9ca3af; font-size: 13px; cursor: pointer; }
        .tab-bar { display: flex; gap: 6px; padding: 12px 20px; border-bottom: 1px solid #1a1a2e; overflow-x: auto; background: #0a0a0f; position: sticky; top: 73px; z-index: 9; }
        .tab-btn { padding: 8px 16px; border: 1px solid #2a2a3e; background: #111118; color: #6b7280; border-radius: 20px; cursor: pointer; font-size: 13px; white-space: nowrap; }
        .tab-btn.active { background: #f59e0b; color: #0a0a0f; border-color: #f59e0b; font-weight: 700; }
        .content { padding-bottom: 40px; }
        .view { padding: 20px; }
        .view-title { font-size: 22px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .count-badge { background: #f59e0b; color: #0a0a0f; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
        .section-label { font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
        .today-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .today-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 14px; text-align: center; }
        .today-card.green { background: #052e16; border-color: #4ade8030; }
        .today-card.amber { background: #1a1200; border-color: #f59e0b30; }
        .today-label { font-size: 11px; color: #9ca3af; margin-bottom: 6px; }
        .today-value { font-size: 30px; font-weight: 700; }
        .today-value-sm { font-size: 14px; font-weight: 700; color: #f59e0b; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
        .stat-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
        .stat-card.accent { background: #1a1200; border-color: #f59e0b30; }
        .stat-icon { font-size: 18px; }
        .stat-value { font-size: 26px; font-weight: 700; }
        .stat-label { font-size: 12px; color: #6b7280; }
        .amount-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .amount-card { border-radius: 16px; padding: 18px; }
        .amount-card.green { background: linear-gradient(135deg, #052e16, #065f46); border: 1px solid #4ade8030; }
        .amount-card.red { background: linear-gradient(135deg, #450a0a, #7f1d1d); border: 1px solid #f8717130; }
        .amount-card.blue { background: linear-gradient(135deg, #0f172a, #1e3a5f); border: 1px solid #60a5fa30; }
        .amount-label { font-size: 12px; color: #9ca3af; margin-bottom: 8px; }
        .amount-value { font-size: 18px; font-weight: 700; }
        .stock-mini-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; }
        .stock-mini { background: #111118; border: 1px solid #1e1e2e; border-radius: 12px; padding: 12px; text-align: center; }
        .search-box { margin-bottom: 14px; }
        .filter-row { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 10px; padding-bottom: 4px; }
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
        .detail-row { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #d1d5db; }
        .status-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .mini-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .wa-row { display: flex; gap: 8px; margin-bottom: 10px; }
        .wa-btn { padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; border: none; cursor: pointer; }
        .wa-btn.green { background: #052e16; color: #4ade80; }
        .wa-btn.blue { background: #1e3a5f; color: #60a5fa; }
        .wa-btn.disabled { background: #1e1e2e; color: #4b5563; cursor: default; }
        .action-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .action-select { flex: 1; min-width: 140px; padding: 10px; background: #0a0a0f; border: 1px solid #2a2a3e; border-radius: 10px; color: white; font-size: 13px; outline: none; }
        .action-btn { padding: 10px 16px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 10px; color: #0a0a0f; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .history-block { margin-top: 12px; padding-top: 12px; border-top: 1px solid #1e1e2e; }
        .history-item { padding: 8px 0; border-bottom: 1px solid #1a1a2e; }
        .form { display: flex; flex-direction: column; gap: 16px; max-width: 560px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-label { font-size: 13px; color: #9ca3af; font-weight: 500; }
        .field { width: 100%; padding: 14px; background: #111118; border: 1px solid #2a2a3e; border-radius: 12px; color: white; font-size: 15px; outline: none; }
        .submit-btn { padding: 16px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 14px; color: #0a0a0f; font-weight: 700; font-size: 16px; cursor: pointer; }
        .period-tabs { display: flex; gap: 6px; margin-bottom: 20px; background: #111118; border-radius: 12px; padding: 4px; }
        .period-tab { flex: 1; padding: 10px 4px; border: none; background: transparent; color: #6b7280; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 500; }
        .period-tab.active { background: #f59e0b; color: #0a0a0f; font-weight: 700; }
        .comm-list { display: flex; flex-direction: column; gap: 2px; }
        .comm-row { display: flex; justify-content: space-between; align-items: center; padding: 14px; background: #111118; border-radius: 14px; margin-bottom: 8px; }
        .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; font-size: 16px; }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .today-row { grid-template-columns: 1fr 1fr; }
          .today-row .today-card:last-child { grid-column: span 2; }
          .action-row { flex-direction: column; }
          .amount-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}