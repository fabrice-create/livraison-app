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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [form, setForm] = useState({
    customer_name: "", phone: "", city: "", address: "",
    product: "", quantity: "1", delivery_type: "", amount: "",
  })
  const [stockForm, setStockForm] = useState({ driver_id: "", product_name: "", quantity: "1" })

  useEffect(() => { void initPage() }, [])

  const normalizeRole = (r?: string | null) => (r || "").trim().toLowerCase()
  const normDT = (v?: string | null) => { const c = (v || "").trim().toLowerCase(); if (c === "direct") return "direct"; if (c === "gare") return "gare"; return c }
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
  const clientMsg = (o: Order) => `Bonjour ${o.customer_name},\n\nVotre commande est en cours.\n\nProduit : ${o.product}\nQuantité : ${o.quantity || 1}\nMontant : ${fmt(o.amount)}\nVille : ${o.city}\n\nMerci de confirmer votre disponibilité.`
  const driverMsg = (o: Order) => `Bonjour,\n\nNouvelle commande assignée.\n\nClient : ${o.customer_name}\nTél : ${o.phone}\nVille : ${o.city}\nAdresse : ${o.address}\nProduit : ${o.product} × ${o.quantity || 1}\nMontant : ${fmt(o.amount)}\nLivraison : ${prettyDT(o.delivery_type)}\n\nMerci.`

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
    setSelectedDrivers(sel); setSelectedActions(act)
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

  const todayStats = useMemo(() => ({
    created: orders.filter((o) => isToday(o.created_at)).length,
    delivered: orders.filter((o) => isToday(o.delivered_at)).length,
    amount: orders.filter((o) => isToday(o.delivered_at) && o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0),
  }), [orders])

  const dashStats = useMemo(() => ({
    total: orders.length,
    notAssigned: orders.filter((o) => !o.is_assigned).length,
    confirmed: orders.filter((o) => o.status === "Confirmé").length,
    delivered: orders.filter((o) => o.status === "Livré").length,
    gare: orders.filter((o) => o.logistic_status === "Envoyé à la gare").length,
    collected: orders.filter((o) => o.cash_collected === true).length,
    amountCollected: orders.filter((o) => o.cash_collected === true).reduce((s, o) => s + Number(o.amount || 0), 0),
    amountPending: orders.filter((o) => o.cash_collected !== true).reduce((s, o) => s + Number(o.amount || 0), 0),
    stockByDriver: driverStocks.reduce((acc: Record<string, number>, i) => { acc[i.driver_name] = (acc[i.driver_name] || 0) + Number(i.quantity || 0); return acc }, {}),
  }), [orders, driverStocks])

  const commissionStats = useMemo(() => {
    const byDriver: Record<string, { name: string; total: number; count: number }> = {}
    filterByPeriod(orders.filter((o) => o.status === "Livré" && o.driver_commission && o.driver_commission > 0), "delivered_at").forEach((o) => {
      const key = o.assigned_driver_id || "inconnu"
      if (!byDriver[key]) byDriver[key] = { name: o.driver_name || "Inconnu", total: 0, count: 0 }
      byDriver[key].total += Number(o.driver_commission); byDriver[key].count += 1
    })
    const byCloser: Record<string, { name: string; total: number; count: number }> = {}
    filterByPeriod(orders.filter((o) => o.closer_id && o.closer_commission && o.closer_commission > 0), "delivered_at").forEach((o) => {
      const key = o.closer_id || "inconnu"
      const name = closers.find((c) => c.id === key)?.full_name || o.closer_name || "Closureuse"
      if (!byCloser[key]) byCloser[key] = { name, total: 0, count: 0 }
      byCloser[key].total += Number(o.closer_commission); byCloser[key].count += 1
    })
    return {
      byDriver, byCloser,
      totalDriver: Object.values(byDriver).reduce((s, v) => s + v.total, 0),
      totalCloser: Object.values(byCloser).reduce((s, v) => s + v.total, 0),
    }
  }, [orders, closers, periodFilter])

  const visibleOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === "Tous" || (o.status || "En attente") === statusFilter
      const matchDriver = driverFilter === "Tous" || o.driver_name === driverFilter
      const q = search.trim().toLowerCase()
      const matchSearch = q === "" || [o.customer_name, o.phone, o.city, o.driver_name || "", o.product, String(o.amount || "")].join(" ").toLowerCase().includes(q)
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
      if (newOrders[0]) await addHistory(newOrders[0].id, "commande_creee", `Créée pour ${newOrders[0].customer_name}`)
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
    if (!productName || qty <= 0) { alert("Données invalides."); setStockLoading(false); return }
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
    if (!item) { alert("Aucun stock trouvé."); return false }
    if (Number(item.quantity) < qty) { alert("Stock insuffisant."); return false }
    const newQty = Number(item.quantity) - qty
    const { error } = await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", item.id)
    if (error) { alert("Erreur : " + error.message); return false }
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
    if (isGare(order.delivery_type)) { actions.push({ value: "gare", label: "🚌 Gare" }); actions.push({ value: "paye", label: "💰 Marquer Payé" }) }
    actions.push({ value: "assigner", label: "👤 Assigner livreur" })
    return actions
  }

  const requestAction = (order: Order) => {
    const action = selectedActions[order.id]
    if (!action) { alert("Choisis une action."); return }
    if (isLocked(order)) { alert("Commande finalisée et verrouillée."); return }
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

  const periodLabels: Record<string, string> = { today: "Aujourd'hui", semaine: "Semaine", mois: "Ce mois" }

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "commandes", icon: "📦", label: "Commandes" },
    { id: "creer", icon: "➕", label: "Créer" },
    { id: "stock", icon: "🗄️", label: "Stock" },
    { id: "commissions", icon: "💰", label: "Commissions" },
  ]

  const field = { width: "100%", padding: "13px 14px", background: "#111118", border: "1px solid #2a2a3e", borderRadius: 12, color: "white" as const, fontSize: 14, outline: "none" }

  if (authLoading) return (
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
        .admin-app { display: flex; min-height: 100vh; background: #0a0a0f; color: white; font-family: Inter, Arial, sans-serif; }
        .sidebar { width: 240px; background: #111118; border-right: 1px solid #1e1e2e; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 50; transition: transform 0.3s; overflow-y: auto; }
        .sidebar-header { padding: 24px 20px; border-bottom: 1px solid #1e1e2e; }
        .sidebar-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px; color: #0a0a0f; margin-bottom: 12px; }
        .sidebar-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
        .sidebar-role { font-size: 12px; color: #9ca3af; }
        .sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; }
        .nav-btn { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border: none; background: transparent; color: #9ca3af; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; width: 100%; text-align: left; transition: all 0.15s; }
        .nav-btn:hover { background: #1e1e2e; color: white; }
        .nav-btn.active { background: linear-gradient(135deg, #f59e0b20, #d9770610); color: #f59e0b; border: 1px solid #f59e0b30; }
        .sidebar-footer { padding: 16px 12px; border-top: 1px solid #1e1e2e; }
        .logout-btn-side { width: 100%; padding: 12px; background: #1e1e2e; border: 1px solid #2a2a3e; border-radius: 12px; color: #9ca3af; cursor: pointer; font-size: 14px; }
        .logout-btn-side:hover { background: #dc262620; color: #f87171; border-color: #dc262640; }
        .main-content { flex: 1; margin-left: 240px; min-height: 100vh; }
        .top-bar { padding: 20px 32px; border-bottom: 1px solid #1e1e2e; background: #0a0a0f; position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; }
        .page-title { font-size: 22px; font-weight: 700; }
        .content-area { padding: 28px 32px; }
        .stats-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
        .stats-6 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
        .stat-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 20px; }
        .stat-card.accent { background: #1a1200; border-color: #f59e0b30; }
        .amount-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .orders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
        .form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .filter-pills { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 4px; }
        .filter-pill { padding: 8px 16px; border: 1px solid #2a2a3e; background: #111118; color: #6b7280; border-radius: 20px; cursor: pointer; font-size: 13px; white-space: nowrap; flex-shrink: 0; }
        .filter-pill.active { background: #f59e0b; color: #0a0a0f; border-color: #f59e0b; font-weight: 700; }
        .mobile-header { display: none; padding: 14px 16px; background: #111118; border-bottom: 1px solid #1e1e2e; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
        .bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #111118; border-top: 1px solid #1e1e2e; z-index: 50; }
        .bottom-nav-inner { display: flex; }
        .bottom-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 4px 14px; background: none; border: none; cursor: pointer; color: #4b5563; font-size: 10px; font-weight: 500; }
        .bottom-nav-btn.active { color: #f59e0b; }
        .overlay-bg { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
        @media (max-width: 1024px) {
          .stats-3, .stats-6 { grid-template-columns: 1fr 1fr; }
          .orders-grid { grid-template-columns: 1fr; }
          .form-2col { grid-template-columns: 1fr; }
          .amount-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 1024px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .overlay-bg.open { display: block; }
          .main-content { margin-left: 0; padding-bottom: 80px; }
          .mobile-header { display: flex; }
          .bottom-nav { display: block; }
          .top-bar { display: none; }
          .content-area { padding: 16px; }
          .stats-3, .stats-6 { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="admin-app">

        {confirmAction && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
            <div style={{ background: "#111118", border: "1px solid #2a2a3e", borderRadius: 20, padding: 28, maxWidth: 380, width: "100%" }}>
              <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{confirmAction.action === "livre_paye" ? "🎯 Confirmer la livraison ?" : "❌ Annuler la commande ?"}</p>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>
                {confirmAction.action === "livre_paye" ? `La commande de ${confirmAction.order.customer_name} sera marquée Livré + Payé. Irréversible.` : `La commande de ${confirmAction.order.customer_name} sera annulée définitivement.`}
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

        <div className={`overlay-bg ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-avatar">{profile?.full_name?.charAt(0).toUpperCase()}</div>
            <p className="sidebar-name">{profile?.full_name}</p>
            <p className="sidebar-role">🛒 Administrateur</p>
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
            <button onClick={handleLogout} className="logout-btn-side">🚪 Déconnexion</button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="mobile-header">
          <button style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer" }} onClick={() => setSidebarOpen(true)}>☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#0a0a0f" }}>{profile?.full_name?.charAt(0).toUpperCase()}</div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{profile?.full_name}</span>
          </div>
          <button onClick={handleLogout} style={{ padding: "7px 14px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 20, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>Déco</button>
        </div>

        {/* Main */}
        <main className="main-content">
          <div className="top-bar">
            <p className="page-title">
              {activeView === "dashboard" && "📊 Dashboard"}
              {activeView === "commandes" && "📦 Commandes"}
              {activeView === "creer" && "➕ Nouvelle commande"}
              {activeView === "stock" && "🗄️ Stock livreurs"}
              {activeView === "commissions" && "💰 Commissions"}
            </p>
          </div>

          <div className="content-area">

            {/* DASHBOARD */}
            {activeView === "dashboard" && (
              <div>
                <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>AUJOURD'HUI</p>
                <div className="stats-3" style={{ marginBottom: 24 }}>
                  <div className="stat-card">
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>📝 Créées</p>
                    <p style={{ fontSize: 40, fontWeight: 700 }}>{todayStats.created}</p>
                  </div>
                  <div className="stat-card" style={{ background: "#052e16", borderColor: "#4ade8030" }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>🎯 Livrées</p>
                    <p style={{ fontSize: 40, fontWeight: 700, color: "#4ade80" }}>{todayStats.delivered}</p>
                  </div>
                  <div className="stat-card" style={{ background: "#1a1200", borderColor: "#f59e0b30" }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>💵 Encaissé</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b" }}>{fmt(todayStats.amount)}</p>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>GLOBAL</p>
                <div className="stats-6">
                  <div className="stat-card accent"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>📦 Total</p><p style={{ fontSize: 36, fontWeight: 700 }}>{dashStats.total}</p></div>
                  <div className="stat-card"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>⚠️ Non assignées</p><p style={{ fontSize: 36, fontWeight: 700, color: "#fb923c" }}>{dashStats.notAssigned}</p></div>
                  <div className="stat-card"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>✅ Confirmées</p><p style={{ fontSize: 36, fontWeight: 700, color: "#60a5fa" }}>{dashStats.confirmed}</p></div>
                  <div className="stat-card"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>🎯 Livrées</p><p style={{ fontSize: 36, fontWeight: 700, color: "#4ade80" }}>{dashStats.delivered}</p></div>
                  <div className="stat-card"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>🚌 Gare</p><p style={{ fontSize: 36, fontWeight: 700, color: "#c084fc" }}>{dashStats.gare}</p></div>
                  <div className="stat-card"><p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>💰 Encaissées</p><p style={{ fontSize: 36, fontWeight: 700, color: "#4ade80" }}>{dashStats.collected}</p></div>
                </div>

                <div className="amount-row">
                  <div style={{ background: "linear-gradient(135deg, #052e16, #065f46)", border: "1px solid #4ade8040", borderRadius: 20, padding: 24 }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>💵 Montant encaissé</p>
                    <p style={{ fontSize: 32, fontWeight: 700 }}>{fmt(dashStats.amountCollected)}</p>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #450a0a, #7f1d1d)", border: "1px solid #f8717130", borderRadius: 20, padding: 24 }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>⏳ En attente d'encaissement</p>
                    <p style={{ fontSize: 32, fontWeight: 700 }}>{fmt(dashStats.amountPending)}</p>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>STOCK PAR LIVREUR</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                  {Object.entries(dashStats.stockByDriver).map(([driver, qty]) => (
                    <div key={driver} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 14, padding: 18, textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>{driver}</p>
                      <p style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b" }}>{qty}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMMANDES */}
            {activeView === "commandes" && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <input type="text" placeholder="🔍 Recherche nom, ville, produit, livreur..."
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    style={{ ...field, marginBottom: 12 }} />
                  <div className="filter-pills">
                    {["Tous", "En attente", "Confirmé", "Livré", "Annulé"].map((s) => (
                      <button key={s} className={`filter-pill ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s}</button>
                    ))}
                  </div>
                  <div className="filter-pills">
                    <button className={`filter-pill ${driverFilter === "Tous" ? "active" : ""}`} onClick={() => setDriverFilter("Tous")}>Tous livreurs</button>
                    {drivers.map((d) => (
                      <button key={d.id} className={`filter-pill ${driverFilter === d.full_name ? "active" : ""}`} onClick={() => setDriverFilter(d.full_name)}>{d.full_name}</button>
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>{visibleOrders.length} commande(s)</p>
                </div>

                {visibleOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>📭</p><p>Aucune commande</p></div>
                ) : (
                  <div className="orders-grid">
                    {visibleOrders.map((order) => {
                      const ss = statusStyle(order.status)
                      const ls = statusStyle(order.logistic_status)
                      const ps = statusStyle(order.payment_status)
                      const locked = isLocked(order)
                      const driverPhone = getDriverPhone(order.assigned_driver_id)
                      return (
                        <div key={order.id} style={{ background: "#111118", border: `1px solid ${locked ? "#052e16" : "#1e1e2e"}`, borderRadius: 16, padding: 18 }}>
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
                            <div style={{ display: "flex", gap: 10, fontSize: 14, color: "#e5e7eb" }}><span>👤</span><span>{order.driver_name || "Non assigné"}</span></div>
                            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#6b7280" }}><span>📅</span><span>Créée : {fmtDate(order.created_at)}</span></div>
                            {order.delivered_at && <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#4ade80" }}><span>✅</span><span>Livrée : {fmtDate(order.delivered_at)}</span></div>}
                            {order.cancelled_at && <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#f87171" }}><span>❌</span><span>Annulée : {fmtDate(order.cancelled_at)}</span></div>}
                            {(order.driver_commission || order.closer_commission) ? (
                              <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#4ade80" }}><span>💰</span><span>Livreur : {fmt(order.driver_commission)} · Closureuse : {fmt(order.closer_commission)}</span></div>
                            ) : null}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                            <span style={{ background: ls.bg, color: ls.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{order.logistic_status || "En attente"}</span>
                            <span style={{ background: ps.bg, color: ps.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{order.payment_status || "Non payé"}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            <a href={waUrl(order.phone, clientMsg(order))} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "9px 12px", background: "#052e16", border: "1px solid #4ade8030", borderRadius: 10, color: "#4ade80", fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>📱 Client</a>
                            {driverPhone ? (
                              <a href={waUrl(driverPhone, driverMsg(order))} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "9px 12px", background: "#1e3a5f", border: "1px solid #60a5fa30", borderRadius: 10, color: "#60a5fa", fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>📱 Livreur</a>
                            ) : (
                              <span style={{ flex: 1, padding: "9px 12px", background: "#1e1e2e", borderRadius: 10, color: "#4b5563", fontSize: 13, textAlign: "center" }}>Pas de numéro</span>
                            )}
                          </div>
                          {!locked && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <select value={selectedActions[order.id] || ""} onChange={(e) => setSelectedActions((p) => ({ ...p, [order.id]: e.target.value }))}
                                style={{ flex: 1, minWidth: 140, padding: "10px 12px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 10, color: "white", fontSize: 13, outline: "none" }}>
                                {getActions(order).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                              </select>
                              <select value={selectedDrivers[order.id] || ""} onChange={(e) => setSelectedDrivers((p) => ({ ...p, [order.id]: e.target.value }))}
                                style={{ flex: 1, minWidth: 120, padding: "10px 12px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 10, color: "white", fontSize: 13, outline: "none" }}>
                                <option value="">Livreur...</option>
                                {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                              </select>
                              <button onClick={() => requestAction(order)}
                                style={{ padding: "10px 18px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 10, color: "#0a0a0f", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                                Appliquer
                              </button>
                            </div>
                          )}
                          {getOrderHistory(order.id).length > 0 && (
                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1e1e2e" }}>
                              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 600 }}>HISTORIQUE</p>
                              {getOrderHistory(order.id).slice(0, 3).map((h) => (
                                <div key={h.id} style={{ padding: "8px 0", borderBottom: "1px solid #1a1a2e" }}>
                                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{h.action_by_name} — {h.action_type}</p>
                                  <p style={{ fontSize: 11, color: "#6b7280" }}>{h.action_details} · {fmtDate(h.created_at)}</p>
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
              <div style={{ maxWidth: 760 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Nouvelle commande</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-2col" style={{ marginBottom: 16 }}>
                    {[
                      { name: "customer_name", label: "Nom client", placeholder: "Ex: Kofi Mensah" },
                      { name: "phone", label: "Téléphone", placeholder: "Ex: 90 00 00 00" },
                      { name: "city", label: "Ville", placeholder: "Ex: Lomé" },
                      { name: "address", label: "Adresse", placeholder: "Ex: Akodessewa..." },
                      { name: "product", label: "Produit", placeholder: "Ex: THERAWOLF" },
                      { name: "amount", label: "Montant (FCFA)", placeholder: "Ex: 25000", type: "number" },
                      { name: "quantity", label: "Quantité", placeholder: "1", type: "number" },
                    ].map((f) => (
                      <div key={f.name}>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>{f.label}</label>
                        <input name={f.name} value={(form as Record<string, string>)[f.name]} onChange={handleChange} required placeholder={f.placeholder} type={f.type || "text"}
                          style={field} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Type de livraison</label>
                      <select name="delivery_type" value={form.delivery_type} onChange={handleChange} required style={field}>
                        <option value="">Choisir...</option>
                        <option value="direct">🚚 Direct</option>
                        <option value="gare">🚌 Gare</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    style={{ width: "100%", padding: 18, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 14, color: "#0a0a0f", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                    {loading ? "Création..." : "✅ Créer la commande"}
                  </button>
                </form>
              </div>
            )}

            {/* STOCK */}
            {activeView === "stock" && (
              <div>
                <div style={{ maxWidth: 600, marginBottom: 36 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Ajouter du stock</h2>
                  <form onSubmit={handleAddStock}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
                      <div>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Livreur</label>
                        <select name="driver_id" value={stockForm.driver_id} onChange={handleStockChange} required style={field}>
                          <option value="">Choisir un livreur</option>
                          {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                        </select>
                      </div>
                      <div className="form-2col">
                        <div>
                          <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Produit</label>
                          <input name="product_name" value={stockForm.product_name} onChange={handleStockChange} required style={field} placeholder="Ex: THERAWOLF" />
                        </div>
                        <div>
                          <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Quantité à ajouter</label>
                          <input name="quantity" type="number" min="1" value={stockForm.quantity} onChange={handleStockChange} required style={field} />
                        </div>
                      </div>
                    </div>
                    <button type="submit" disabled={stockLoading}
                      style={{ width: "100%", padding: 16, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 14, color: "#0a0a0f", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                      {stockLoading ? "Ajout..." : "➕ Ajouter le stock"}
                    </button>
                  </form>
                </div>

                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Stock actuel</h2>
                {driverStocks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>📭</p><p>Aucun stock</p></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                    {driverStocks.map((s) => (
                      <div key={s.id} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 20, textAlign: "center" }}>
                        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>{s.driver_name}</p>
                        <p style={{ fontSize: 32, marginBottom: 8 }}>📦</p>
                        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{s.product_name}</p>
                        <p style={{ fontSize: 40, fontWeight: 700, color: s.quantity > 0 ? "#f59e0b" : "#f87171" }}>{s.quantity}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>unités</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COMMISSIONS */}
            {activeView === "commissions" && (
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 28, background: "#111118", borderRadius: 14, padding: 5, maxWidth: 400 }}>
                  {Object.entries(periodLabels).map(([key, label]) => (
                    <button key={key} onClick={() => setPeriodFilter(key)}
                      style={{ flex: 1, padding: "11px 6px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, background: periodFilter === key ? "#f59e0b" : "transparent", color: periodFilter === key ? "#0a0a0f" : "#6b7280" }}>
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32, maxWidth: 600 }}>
                  <div style={{ background: "linear-gradient(135deg, #052e16, #065f46)", border: "1px solid #4ade8040", borderRadius: 20, padding: 24 }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Total livreurs</p>
                    <p style={{ fontSize: 32, fontWeight: 700 }}>{fmt(commissionStats.totalDriver)}</p>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)", border: "1px solid #60a5fa30", borderRadius: 20, padding: 24 }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Total closeuses</p>
                    <p style={{ fontSize: 32, fontWeight: 700 }}>{fmt(commissionStats.totalCloser)}</p>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginBottom: 14, letterSpacing: "0.05em" }}>🚚 PAR LIVREUR — 2 000 FCFA / LIVRAISON</p>
                {Object.values(commissionStats.byDriver).length === 0 ? (
                  <p style={{ color: "#6b7280", marginBottom: 28 }}>Aucune commission sur cette période.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
                    {Object.values(commissionStats.byDriver).map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#111118", borderRadius: 14 }}>
                        <div><p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{item.name}</p><p style={{ fontSize: 13, color: "#6b7280" }}>{item.count} livraison(s)</p></div>
                        <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 20 }}>{fmt(item.total)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginBottom: 14, letterSpacing: "0.05em" }}>💼 PAR CLOSUREUSE — 500 FCFA / LIVRAISON</p>
                {Object.values(commissionStats.byCloser).length === 0 ? (
                  <p style={{ color: "#6b7280" }}>Aucune commission sur cette période.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Object.values(commissionStats.byCloser).map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#111118", borderRadius: 14 }}>
                        <div><p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{item.name}</p><p style={{ fontSize: 13, color: "#6b7280" }}>{item.count} commande(s)</p></div>
                        <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 20 }}>{fmt(item.total)}</span>
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
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}