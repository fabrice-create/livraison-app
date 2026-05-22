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

// PHASE 4 — Nouveaux types stock
type WarehouseStock = {
  id: number
  product_name: string
  quantity: number
  alert_threshold: number
  created_at?: string | null
  updated_at?: string | null
}

type StockMouvement = {
  id: number
  created_at: string
  product_name: string
  mouvement_type: string
  quantity: number
  from_location: string
  to_location: string
  note?: string | null
  created_by?: string | null
}

type StockDemande = {
  id: number
  created_at: string
  driver_id: string
  driver_name: string
  product_name: string
  quantity_requested: number
  status: string
  note?: string | null
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
  const [statusFilter, setStatusFilter] = useState("encours")
  const [driverFilter, setDriverFilter] = useState("Tous")
  const [search, setSearch] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [periodFilter, setPeriodFilter] = useState("mois")
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: string } | null>(null)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editForm, setEditForm] = useState({ customer_name: "", phone: "", city: "", address: "", product: "", quantity: "1", amount: "", delivery_type: "" })
  const [form, setForm] = useState({ customer_name: "", phone: "", city: "", address: "", product: "", quantity: "1", delivery_type: "", amount: "" })
  const [stockForm, setStockForm] = useState({ driver_id: "", product_name: "", quantity: "1" })

  // PHASE 4 — nouveaux states
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([])
  const [stockMouvements, setStockMouvements] = useState<StockMouvement[]>([])
  const [stockDemandes, setStockDemandes] = useState<StockDemande[]>([])
  const [stockSubView, setStockSubView] = useState<"overview" | "warehouse" | "drivers" | "transfer" | "history" | "demandes">("overview")
  const [warehouseForm, setWarehouseForm] = useState({ product_name: "", quantity: "1", alert_threshold: "5" })
  const [transferForm, setTransferForm] = useState({ product_name: "", from_driver_id: "", to_driver_id: "", quantity: "1" })
  const [warehouseToDriverForm, setWarehouseToDriverForm] = useState({ product_name: "", driver_id: "", quantity: "1" })
  const [stockPhase4Loading, setStockPhase4Loading] = useState(false)

  useEffect(() => { void initPage() }, [])

  const normalizeRole = (r?: string | null) => (r || "").trim().toLowerCase()
  const normDT = (v?: string | null) => { const c = (v || "").trim().toLowerCase(); if (c === "direct") return "direct"; if (c === "gare") return "gare"; return c }
  const prettyDT = (v?: string | null) => { const n = normDT(v); if (n === "direct") return "Direct"; if (n === "gare") return "Gare"; return v || "-" }
  const fmt = (v?: number | string | null) => { if (v === null || v === undefined || v === "") return "-"; return `${Number(v).toLocaleString()} FCFA` }
  const fmtDate = (d?: string | null) => { if (!d) return "-"; return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) }
  const isToday = (d?: string | null) => { if (!d) return false; return new Date(d).toDateString() === new Date().toDateString() }

  const isEnCours = (o: Order) => { const s = o.status || "En attente"; return s === "En attente" || s === "Confirmé" }
  const isHistorique = (o: Order) => !isEnCours(o)

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
  const callUrl = (phone?: string | null) => { const p = sanitizePhone(phone); return p ? `tel:+${p}` : "#" }
  const waUrl = (phone?: string | null, msg?: string) => {
    const p = sanitizePhone(phone)
    if (!p) return "#"
    return `https://wa.me/${p}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`
  }
  const getDriverPhone = (id?: string | null) => { if (!id) return ""; const d = drivers.find((d) => d.id === id); return d?.phone || null }
  const clientWaMsg = (o: Order) => `Bonjour ${o.customer_name}, votre commande est en cours !\n\nProduit : ${o.product} × ${o.quantity || 1}\nMontant : ${fmt(o.amount)}\nVille : ${o.city}\nLivraison : ${prettyDT(o.delivery_type)}\n\nMerci de vous tenir disponible.`

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

    // PHASE 4 — charger stock entrepôt + mouvements + demandes
    await loadPhase4Data()

    setAuthLoading(false)
  }

  const loadPhase4Data = async () => {
    try {
      const { data: wd } = await supabase.from("warehouse_stock").select("*").order("product_name", { ascending: true })
      if (wd) setWarehouseStocks(wd as WarehouseStock[])
    } catch (_) { /* table peut ne pas exister encore */ }
    try {
      const { data: md } = await supabase.from("stock_mouvements").select("*").order("created_at", { ascending: false }).limit(100)
      if (md) setStockMouvements(md as StockMouvement[])
    } catch (_) { /* table peut ne pas exister encore */ }
    try {
      const { data: dd } = await supabase.from("stock_demandes").select("*").order("created_at", { ascending: false })
      if (dd) setStockDemandes(dd as StockDemande[])
    } catch (_) { /* table peut ne pas exister encore */ }
  }

  const filterByPeriod = (list: Order[]) => {
    const now = new Date()
    return list.filter((o) => {
      const d = o.delivered_at || o.confirmed_at || o.cancelled_at || o.created_at
      if (!d) return true
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
    enCours: orders.filter(isEnCours).length,
    confirmed: orders.filter((o) => o.status === "Confirmé").length,
    delivered: orders.filter((o) => o.status === "Livré").length,
    gare: orders.filter((o) => o.logistic_status === "Envoyé à la gare").length,
    collected: orders.filter((o) => o.cash_collected === true).length,
    amountCollected: orders.filter((o) => o.cash_collected === true).reduce((s, o) => s + Number(o.amount || 0), 0),
    amountPending: orders.filter((o) => o.cash_collected !== true && isEnCours(o)).reduce((s, o) => s + Number(o.amount || 0), 0),
    stockByDriver: driverStocks.reduce((acc: Record<string, number>, i) => { acc[i.driver_name] = (acc[i.driver_name] || 0) + Number(i.quantity || 0); return acc }, {}),
  }), [orders, driverStocks])

  const commissionStats = useMemo(() => {
    const byDriver: Record<string, { name: string; total: number; count: number }> = {}
    filterByPeriod(orders.filter((o) => o.driver_commission && o.driver_commission > 0)).forEach((o) => {
      const key = o.assigned_driver_id || "inconnu"
      if (!byDriver[key]) byDriver[key] = { name: o.driver_name || "Inconnu", total: 0, count: 0 }
      byDriver[key].total += Number(o.driver_commission); byDriver[key].count += 1
    })
    const byCloser: Record<string, { name: string; total: number; count: number }> = {}
    filterByPeriod(orders.filter((o) => o.closer_id && o.closer_commission && o.closer_commission > 0)).forEach((o) => {
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

  const enCoursOrders = useMemo(() => orders.filter(isEnCours), [orders])
  const historiqueOrders = useMemo(() => orders.filter(isHistorique), [orders])

  const visibleOrders = useMemo(() => {
    const base = statusFilter === "encours" ? enCoursOrders : historiqueOrders
    return base.filter((o) => {
      const matchDriver = driverFilter === "Tous" || o.driver_name === driverFilter
      const q = search.trim().toLowerCase()
      const matchSearch = q === "" || [o.customer_name, o.phone, o.city, o.driver_name || "", o.product, String(o.amount || "")].join(" ").toLowerCase().includes(q)
      return matchDriver && matchSearch
    })
  }, [orders, statusFilter, driverFilter, search, enCoursOrders, historiqueOrders])

  const getOrderHistory = (id: number) => history.filter((h) => h.order_id === id)

  const openEdit = (order: Order) => {
    setEditingOrder(order)
    setEditForm({
      customer_name: order.customer_name || "", phone: order.phone || "",
      city: order.city || "", address: order.address || "", product: order.product || "",
      quantity: String(order.quantity || 1), amount: String(order.amount || ""),
      delivery_type: order.delivery_type || "",
    })
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingOrder) return
    const payload = {
      customer_name: editForm.customer_name, phone: editForm.phone,
      city: editForm.city, address: editForm.address, product: editForm.product,
      quantity: Number(editForm.quantity), amount: Number(editForm.amount),
      delivery_type: normDT(editForm.delivery_type),
    }
    const { error } = await supabase.from("orders").update(payload).eq("id", editingOrder.id)
    if (error) { alert("Erreur : " + error.message); return }
    setOrders((prev) => prev.map((o) => o.id === editingOrder.id ? { ...o, ...payload } : o))
    await addHistory(editingOrder.id, "commande_modifiee", `Modifiée par ${profile?.full_name}`)
    setEditingOrder(null)
    alert("Commande modifiée ✅")
  }

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

  // Ancien handleAddStock gardé pour compatibilité (onglet stock livreur direct)
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

  // PHASE 4 — Ajouter au stock entrepôt
  const handleAddWarehouse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setStockPhase4Loading(true)
    const productName = warehouseForm.product_name.trim()
    const qty = Number(warehouseForm.quantity)
    const threshold = Number(warehouseForm.alert_threshold)
    if (!productName || qty <= 0) { alert("Données invalides."); setStockPhase4Loading(false); return }
    const existing = warehouseStocks.find((w) => w.product_name.trim().toLowerCase() === productName.toLowerCase())
    if (existing) {
      const newQty = existing.quantity + qty
      const { error } = await supabase.from("warehouse_stock").update({ quantity: newQty, alert_threshold: threshold, updated_at: new Date().toISOString() }).eq("id", existing.id)
      if (error) { alert("Erreur : " + error.message); setStockPhase4Loading(false); return }
      setWarehouseStocks((prev) => prev.map((w) => w.id === existing.id ? { ...w, quantity: newQty, alert_threshold: threshold } : w))
    } else {
      const { data, error } = await supabase.from("warehouse_stock").insert([{ product_name: productName, quantity: qty, alert_threshold: threshold }]).select()
      if (error) { alert("Erreur : " + error.message); setStockPhase4Loading(false); return }
      if (data) setWarehouseStocks([...warehouseStocks, ...(data as WarehouseStock[])])
    }
    // Log mouvement
    await supabase.from("stock_mouvements").insert([{
      product_name: productName, mouvement_type: "entree_entrepot", quantity: qty,
      from_location: "Fournisseur", to_location: "Entrepôt", created_by: profile?.full_name || "Admin"
    }])
    await loadPhase4Data()
    setWarehouseForm({ product_name: "", quantity: "1", alert_threshold: "5" })
    alert("Stock entrepôt mis à jour ✅"); setStockPhase4Loading(false)
  }

  // PHASE 4 — Transfert entrepôt → livreur
  const handleWarehouseToDriver = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setStockPhase4Loading(true)
    const driver = drivers.find((d) => d.id === warehouseToDriverForm.driver_id)
    if (!driver) { alert("Choisis un livreur."); setStockPhase4Loading(false); return }
    const productName = warehouseToDriverForm.product_name.trim()
    const qty = Number(warehouseToDriverForm.quantity)
    if (!productName || qty <= 0) { alert("Données invalides."); setStockPhase4Loading(false); return }
    const wStock = warehouseStocks.find((w) => w.product_name.trim().toLowerCase() === productName.toLowerCase())
    if (!wStock || wStock.quantity < qty) { alert(`Stock entrepôt insuffisant. Disponible : ${wStock?.quantity || 0}`); setStockPhase4Loading(false); return }
    // Déduire entrepôt
    const { error: wErr } = await supabase.from("warehouse_stock").update({ quantity: wStock.quantity - qty, updated_at: new Date().toISOString() }).eq("id", wStock.id)
    if (wErr) { alert("Erreur : " + wErr.message); setStockPhase4Loading(false); return }
    // Ajouter livreur
    const existing = driverStocks.find((i) => i.driver_id === driver.id && i.product_name.trim().toLowerCase() === productName.toLowerCase())
    if (existing) {
      const newQty = existing.quantity + qty
      await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", existing.id)
      setDriverStocks((prev) => prev.map((i) => i.id === existing.id ? { ...i, quantity: newQty } : i))
    } else {
      const { data } = await supabase.from("driver_stock").insert([{ driver_id: driver.id, driver_name: driver.full_name, product_name: productName, quantity: qty }]).select()
      if (data) setDriverStocks([...(data as DriverStock[]), ...driverStocks])
    }
    // Log mouvement
    await supabase.from("stock_mouvements").insert([{
      product_name: productName, mouvement_type: "transfert_entrepot_livreur", quantity: qty,
      from_location: "Entrepôt", to_location: driver.full_name, created_by: profile?.full_name || "Admin"
    }])
    await loadPhase4Data()
    setWarehouseToDriverForm({ product_name: "", driver_id: "", quantity: "1" })
    alert(`✅ ${qty} unité(s) transférée(s) à ${driver.full_name}`)
    setStockPhase4Loading(false)
  }

  // PHASE 4 — Transfert livreur → livreur
  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setStockPhase4Loading(true)
    const fromDriver = drivers.find((d) => d.id === transferForm.from_driver_id)
    const toDriver = drivers.find((d) => d.id === transferForm.to_driver_id)
    if (!fromDriver || !toDriver) { alert("Choisis les deux livreurs."); setStockPhase4Loading(false); return }
    if (fromDriver.id === toDriver.id) { alert("Les deux livreurs doivent être différents."); setStockPhase4Loading(false); return }
    const productName = transferForm.product_name.trim()
    const qty = Number(transferForm.quantity)
    if (!productName || qty <= 0) { alert("Données invalides."); setStockPhase4Loading(false); return }
    const fromStock = driverStocks.find((i) => i.driver_id === fromDriver.id && i.product_name.trim().toLowerCase() === productName.toLowerCase())
    if (!fromStock || fromStock.quantity < qty) { alert(`Stock insuffisant pour ${fromDriver.full_name}. Disponible : ${fromStock?.quantity || 0}`); setStockPhase4Loading(false); return }
    // Déduire source
    const { error: e1 } = await supabase.from("driver_stock").update({ quantity: fromStock.quantity - qty }).eq("id", fromStock.id)
    if (e1) { alert("Erreur : " + e1.message); setStockPhase4Loading(false); return }
    setDriverStocks((prev) => prev.map((i) => i.id === fromStock.id ? { ...i, quantity: fromStock.quantity - qty } : i))
    // Ajouter destination
    const toStock = driverStocks.find((i) => i.driver_id === toDriver.id && i.product_name.trim().toLowerCase() === productName.toLowerCase())
    if (toStock) {
      await supabase.from("driver_stock").update({ quantity: toStock.quantity + qty }).eq("id", toStock.id)
      setDriverStocks((prev) => prev.map((i) => i.id === toStock.id ? { ...i, quantity: toStock.quantity + qty } : i))
    } else {
      const { data } = await supabase.from("driver_stock").insert([{ driver_id: toDriver.id, driver_name: toDriver.full_name, product_name: productName, quantity: qty }]).select()
      if (data) setDriverStocks((prev) => [...(data as DriverStock[]), ...prev])
    }
    // Log mouvement
    await supabase.from("stock_mouvements").insert([{
      product_name: productName, mouvement_type: "transfert_livreur", quantity: qty,
      from_location: fromDriver.full_name, to_location: toDriver.full_name, created_by: profile?.full_name || "Admin"
    }])
    await loadPhase4Data()
    setTransferForm({ product_name: "", from_driver_id: "", to_driver_id: "", quantity: "1" })
    alert(`✅ Transfert effectué : ${qty} unité(s) de ${fromDriver.full_name} → ${toDriver.full_name}`)
    setStockPhase4Loading(false)
  }

  // PHASE 4 — Approuver demande livreur
  const handleApproveDemandeStock = async (demande: StockDemande) => {
    if (!confirm(`Approuver la demande de ${demande.driver_name} pour ${demande.quantity_requested} × ${demande.product_name} ?`)) return
    setStockPhase4Loading(true)
    const wStock = warehouseStocks.find((w) => w.product_name.trim().toLowerCase() === demande.product_name.trim().toLowerCase())
    if (!wStock || wStock.quantity < demande.quantity_requested) {
      alert(`Stock entrepôt insuffisant. Disponible : ${wStock?.quantity || 0}`); setStockPhase4Loading(false); return
    }
    await supabase.from("warehouse_stock").update({ quantity: wStock.quantity - demande.quantity_requested, updated_at: new Date().toISOString() }).eq("id", wStock.id)
    const existing = driverStocks.find((i) => i.driver_id === demande.driver_id && i.product_name.trim().toLowerCase() === demande.product_name.trim().toLowerCase())
    if (existing) {
      await supabase.from("driver_stock").update({ quantity: existing.quantity + demande.quantity_requested }).eq("id", existing.id)
      setDriverStocks((prev) => prev.map((i) => i.id === existing.id ? { ...i, quantity: existing.quantity + demande.quantity_requested } : i))
    } else {
      const { data } = await supabase.from("driver_stock").insert([{ driver_id: demande.driver_id, driver_name: demande.driver_name, product_name: demande.product_name, quantity: demande.quantity_requested }]).select()
      if (data) setDriverStocks((prev) => [...(data as DriverStock[]), ...prev])
    }
    await supabase.from("stock_demandes").update({ status: "approuvée" }).eq("id", demande.id)
    await supabase.from("stock_mouvements").insert([{
      product_name: demande.product_name, mouvement_type: "demande_approuvee", quantity: demande.quantity_requested,
      from_location: "Entrepôt", to_location: demande.driver_name, created_by: profile?.full_name || "Admin"
    }])
    await loadPhase4Data()
    const { data: dsd } = await supabase.from("driver_stock").select("*").order("id", { ascending: false })
    setDriverStocks((dsd as DriverStock[]) || [])
    alert("Demande approuvée ✅"); setStockPhase4Loading(false)
  }

  const handleRejectDemandeStock = async (demande: StockDemande) => {
    if (!confirm(`Refuser la demande de ${demande.driver_name} ?`)) return
    await supabase.from("stock_demandes").update({ status: "refusée" }).eq("id", demande.id)
    setStockDemandes((prev) => prev.map((d) => d.id === demande.id ? { ...d, status: "refusée" } : d))
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

  const markDeliveredAndPaid = async (order: Order) => {
    const now = new Date().toISOString()
    const driverComm = 2000
    const closerComm = order.closer_id ? 500 : 0
    const payload = {
      status: "Livré", logistic_status: "Livré", payment_status: "Payé",
      cash_collected: true, cash_collected_at: now, cash_collected_by: order.driver_name || "",
      delivered_at: now, driver_commission: driverComm, closer_commission: closerComm, commission_calculated: true,
    }
    const { error } = await supabase.from("orders").update(payload).eq("id", order.id)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, ...payload } : o))
    // Déduire stock livreur
    if (order.assigned_driver_id && order.product) {
      const s = driverStocks.find((i) => i.driver_id === order.assigned_driver_id && i.product_name.trim().toLowerCase() === order.product.trim().toLowerCase())
      if (s && s.quantity > 0) {
        const newQty = Math.max(0, s.quantity - (order.quantity || 1))
        await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", s.id)
        setDriverStocks((prev) => prev.map((i) => i.id === s.id ? { ...i, quantity: newQty } : i))
        // Log mouvement livraison
        await supabase.from("stock_mouvements").insert([{
          product_name: order.product, mouvement_type: "vente_livraison", quantity: order.quantity || 1,
          from_location: order.driver_name || "Livreur", to_location: order.customer_name,
          note: `Commande #${order.id}`, created_by: order.driver_name || "Livreur"
        }])
      }
    }
    await addHistory(order.id, "livre_paye", `Livré et payé. Comm. livreur : ${driverComm} FCFA. Comm. closureuse : ${closerComm} FCFA.`)
    return true
  }

  const markSentToGare = async (order: Order) => {
    const now = new Date().toISOString()
    const driverComm = 2000
    const closerComm = order.closer_id ? 500 : 0
    const payload = {
      status: "Livré", logistic_status: "Envoyé à la gare", payment_status: "Payé",
      cash_collected: true, cash_collected_at: now, cash_collected_by: order.driver_name || "",
      delivered_at: now, driver_commission: driverComm, closer_commission: closerComm, commission_calculated: true,
    }
    const { error } = await supabase.from("orders").update(payload).eq("id", order.id)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, ...payload } : o))
    await addHistory(order.id, "envoye_gare", `Envoyé à la gare. Comm. livreur : ${driverComm} FCFA.`)
    return true
  }

  const assignDriver = async (orderId: number) => {
    const driverId = selectedDrivers[orderId]
    if (!driverId) { alert("Choisis un livreur."); return false }
    const driver = drivers.find((d) => d.id === driverId)
    if (!driver) return false
    const now = new Date().toISOString()
    const { error } = await supabase.from("orders").update({ assigned_driver_id: driverId, driver_name: driver.full_name, is_assigned: true, assigned_at: now }).eq("id", orderId)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, assigned_driver_id: driverId, driver_name: driver.full_name, is_assigned: true, assigned_at: now } : o))
    await addHistory(orderId, "livreur_assigne", `Assigné à ${driver.full_name}`)
    return true
  }

  const getActions = (order: Order) => {
    const actions = [{ value: "", label: "-- Action --" }]
    if (order.status !== "Confirmé") actions.push({ value: "confirmer", label: "✅ Confirmer" })
    if (!order.is_assigned) actions.push({ value: "assigner", label: "🚴 Assigner livreur" })
    actions.push({ value: "livre_paye", label: "🎯 Livré + Payé" })
    actions.push({ value: "gare", label: "🚌 Envoyé à la gare" })
    actions.push({ value: "annuler", label: "❌ Annuler" })
    return actions
  }

  const requestAction = (order: Order) => {
    const action = selectedActions[order.id]
    if (!action) return
    if (action === "assigner") { void assignDriver(order.id).then((ok) => { if (ok) alert("Livreur assigné ✅") }); return }
    if (action === "confirmer") { setConfirmAction({ order, action }); return }
    if (action === "livre_paye" || action === "gare" || action === "annuler") { setConfirmAction({ order, action }); return }
  }

  const executeAction = async (order: Order, action: string) => {
    setConfirmAction(null)
    if (action === "confirmer") { const ok = await updateStatus(order.id, "Confirmé"); if (ok) alert("Confirmée ✅") }
    if (action === "livre_paye") { const ok = await markDeliveredAndPaid(order); if (ok) alert("Livrée et payée ✅\nCommissions enregistrées !") }
    if (action === "gare") { const ok = await markSentToGare(order); if (ok) alert("Envoyée à la gare ✅\nCommissions enregistrées !") }
    if (action === "annuler") { const ok = await updateStatus(order.id, "Annulé"); if (ok) alert("Annulée ✅") }
    setSelectedActions((prev) => ({ ...prev, [order.id]: "" }))
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login") }
  const periodLabels: Record<string, string> = { today: "Aujourd'hui", semaine: "Semaine", mois: "Ce mois" }

  const navItems = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "commandes", label: `📦 Commandes (${enCoursOrders.length})` },
    { id: "creer", label: "➕ Créer" },
    { id: "stock", label: "🗄️ Stock" },
    { id: "commissions", label: "💰 Commissions" },
  ]

  const fs = { width: "100%", padding: "13px 14px", background: "#111118", border: "1px solid #2a2a3e", borderRadius: 12, color: "white" as const, fontSize: 14, outline: "none", boxSizing: "border-box" as const }

  // PHASE 4 — alertes stock bas
  const lowWarehouseStocks = warehouseStocks.filter((w) => w.quantity <= w.alert_threshold)
  const pendingDemandes = stockDemandes.filter((d) => d.status === "en_attente")

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
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", fontFamily: "Inter, Arial, sans-serif" }}>

      {/* Modal modification commande */}
      {editingOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16, overflowY: "auto" }}>
          <div style={{ background: "#111118", border: "1px solid #2a2a3e", borderRadius: 20, padding: 24, width: "100%", maxWidth: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 18, fontWeight: 700 }}>✏️ Modifier la commande</p>
              <button onClick={() => setEditingOrder(null)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { name: "customer_name", label: "Nom client" },
                { name: "phone", label: "Téléphone" },
                { name: "city", label: "Ville" },
                { name: "address", label: "Adresse" },
                { name: "product", label: "Produit" },
              ].map((f) => (
                <div key={f.name}>
                  <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 4 }}>{f.label}</label>
                  <input name={f.name} value={(editForm as Record<string, string>)[f.name]}
                    onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })}
                    required style={fs} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 4 }}>Quantité</label>
                  <input type="number" min="1" value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} required style={fs} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 4 }}>Montant (FCFA)</label>
                  <input type="number" value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} required style={fs} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 4 }}>Type de livraison</label>
                <select value={editForm.delivery_type}
                  onChange={(e) => setEditForm({ ...editForm, delivery_type: e.target.value })} required style={fs}>
                  <option value="">Choisir...</option>
                  <option value="direct">🚚 Direct</option>
                  <option value="gare">🚌 Gare</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setEditingOrder(null)}
                  style={{ padding: 14, background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 12, color: "#9ca3af", cursor: "pointer", fontSize: 14 }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ padding: 14, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation action commande */}
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#111118", border: "1px solid #2a2a3e", borderRadius: 20, padding: 28, maxWidth: 380, width: "100%" }}>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              {confirmAction.action === "livre_paye" ? "🎯 Confirmer la livraison ?"
                : confirmAction.action === "gare" ? "🚌 Confirmer envoi à la gare ?"
                : "❌ Annuler la commande ?"}
            </p>
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>
              {confirmAction.action === "livre_paye"
                ? `Commande de ${confirmAction.order.customer_name} → Livré + Payé. Commissions enregistrées. Irréversible.`
                : confirmAction.action === "gare"
                ? `Commande de ${confirmAction.order.customer_name} → Envoyée à la gare. Commissions enregistrées. Irréversible.`
                : `Annuler la commande de ${confirmAction.order.customer_name} définitivement ?`}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: 13, background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 12, color: "#9ca3af", cursor: "pointer", fontSize: 14 }}>Retour</button>
              <button onClick={() => executeAction(confirmAction.order, confirmAction.action)}
                style={{ padding: 13, background: confirmAction.action === "annuler" ? "#dc2626" : "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: confirmAction.action === "annuler" ? "white" : "#0a0a0f", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {confirmAction.action === "annuler" ? "Oui, annuler" : "Confirmer"}
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
            <p style={{ fontSize: 11, color: "#9ca3af" }}>🛒 Administrateur</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(lowWarehouseStocks.length > 0 || pendingDemandes.length > 0) && (
            <button onClick={() => { setActiveView("stock"); setStockSubView(pendingDemandes.length > 0 ? "demandes" : "warehouse") }}
              style={{ padding: "6px 12px", background: "#450a0a", border: "1px solid #f87171", borderRadius: 20, color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              ⚠️ {lowWarehouseStocks.length > 0 ? `${lowWarehouseStocks.length} stock bas` : ""}{lowWarehouseStocks.length > 0 && pendingDemandes.length > 0 ? " · " : ""}{pendingDemandes.length > 0 ? `${pendingDemandes.length} demande(s)` : ""}
            </button>
          )}
          <button onClick={handleLogout} style={{ padding: "7px 14px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 20, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid #1e1e2e", background: "#111118", padding: "0 4px" }}>
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveView(item.id)}
            style={{ padding: "14px 14px", border: "none", borderBottom: activeView === item.id ? "2px solid #f59e0b" : "2px solid transparent", background: "transparent", color: activeView === item.id ? "#f59e0b" : "#9ca3af", fontWeight: activeView === item.id ? 700 : 500, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>

        {/* ─── DASHBOARD ─── */}
        {activeView === "dashboard" && (
          <div>
            <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>AUJOURD'HUI</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16, textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>📝 Créées</p>
                <p style={{ fontSize: 32, fontWeight: 700 }}>{todayStats.created}</p>
              </div>
              <div style={{ background: "#052e16", border: "1px solid #4ade8030", borderRadius: 16, padding: 16, textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>🎯 Livrées</p>
                <p style={{ fontSize: 32, fontWeight: 700, color: "#4ade80" }}>{todayStats.delivered}</p>
              </div>
              <div style={{ background: "#1a1200", border: "1px solid #f59e0b30", borderRadius: 16, padding: 16, textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>💵 Encaissé</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>{fmt(todayStats.amount)}</p>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>GLOBAL</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#1a1200", border: "1px solid #f59e0b30", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>📦 Total</p><p style={{ fontSize: 32, fontWeight: 700 }}>{dashStats.total}</p></div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>⚡ En cours</p><p style={{ fontSize: 32, fontWeight: 700, color: "#fb923c" }}>{dashStats.enCours}</p></div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>✅ Confirmées</p><p style={{ fontSize: 32, fontWeight: 700, color: "#60a5fa" }}>{dashStats.confirmed}</p></div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>🎯 Livrées</p><p style={{ fontSize: 32, fontWeight: 700, color: "#4ade80" }}>{dashStats.delivered}</p></div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>🚌 Gare</p><p style={{ fontSize: 32, fontWeight: 700, color: "#c084fc" }}>{dashStats.gare}</p></div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>💰 Encaissées</p><p style={{ fontSize: 32, fontWeight: 700, color: "#4ade80" }}>{dashStats.collected}</p></div>
            </div>

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

            <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>STOCK PAR LIVREUR</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
              {Object.entries(dashStats.stockByDriver).map(([driver, qty]) => (
                <div key={driver} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 14, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>{driver}</p>
                  <p style={{ fontSize: 30, fontWeight: 700, color: "#f59e0b" }}>{qty}</p>
                </div>
              ))}
            </div>

            {/* Alertes stock bas dans dashboard */}
            {lowWarehouseStocks.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 12, color: "#f87171", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>⚠️ ALERTES STOCK BAS — ENTREPÔT</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {lowWarehouseStocks.map((w) => (
                    <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#2d0808", border: "1px solid #f87171", borderRadius: 12 }}>
                      <span style={{ fontWeight: 600 }}>{w.product_name}</span>
                      <span style={{ color: "#f87171", fontWeight: 700 }}>{w.quantity} / {w.alert_threshold} unités</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── COMMANDES ─── */}
        {activeView === "commandes" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <input type="text" placeholder="🔍 Recherche nom, ville, produit..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ ...fs, marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 6, marginBottom: 12, background: "#111118", borderRadius: 12, padding: 4, maxWidth: 360 }}>
                <button onClick={() => setStatusFilter("encours")}
                  style={{ flex: 1, padding: "10px 6px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, background: statusFilter === "encours" ? "#f59e0b" : "transparent", color: statusFilter === "encours" ? "#0a0a0f" : "#6b7280" }}>
                  ⚡ En cours ({enCoursOrders.length})
                </button>
                <button onClick={() => setStatusFilter("historique")}
                  style={{ flex: 1, padding: "10px 6px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, background: statusFilter === "historique" ? "#f59e0b" : "transparent", color: statusFilter === "historique" ? "#0a0a0f" : "#6b7280" }}>
                  📋 Historique ({historiqueOrders.length})
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
                <button onClick={() => setDriverFilter("Tous")}
                  style={{ padding: "8px 14px", border: "1px solid", borderColor: driverFilter === "Tous" ? "#f59e0b" : "#2a2a3e", background: driverFilter === "Tous" ? "#f59e0b" : "#111118", color: driverFilter === "Tous" ? "#0a0a0f" : "#6b7280", borderRadius: 20, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0, fontWeight: driverFilter === "Tous" ? 700 : 400 }}>
                  Tous livreurs
                </button>
                {drivers.map((d) => (
                  <button key={d.id} onClick={() => setDriverFilter(d.full_name)}
                    style={{ padding: "8px 14px", border: "1px solid", borderColor: driverFilter === d.full_name ? "#f59e0b" : "#2a2a3e", background: driverFilter === d.full_name ? "#f59e0b" : "#111118", color: driverFilter === d.full_name ? "#0a0a0f" : "#6b7280", borderRadius: 20, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0, fontWeight: driverFilter === d.full_name ? 700 : 400 }}>
                    {d.full_name}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "#6b7280" }}>{visibleOrders.length} commande(s)</p>
            </div>

            {visibleOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>📭</p><p>Aucune commande</p></div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {visibleOrders.map((order) => {
                  const ss = statusStyle(order.status)
                  const ls = statusStyle(order.logistic_status)
                  const ps = statusStyle(order.payment_status)
                  const enCours = isEnCours(order)
                  const driverPhone = getDriverPhone(order.assigned_driver_id)
                  return (
                    <div key={order.id} style={{ background: "#111118", border: `1px solid ${enCours ? "#f59e0b20" : "#1e1e2e"}`, borderRadius: 16, padding: 16, opacity: enCours ? 1 : 0.9 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{order.customer_name}</p>
                          <p style={{ fontSize: 13, color: "#9ca3af" }}>📍 {order.city} · {order.phone}</p>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                          <span style={{ background: ss.bg, color: ss.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                            {order.status || "En attente"}
                          </span>
                          {enCours && (
                            <button onClick={() => openEdit(order)}
                              style={{ padding: "4px 8px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 20, color: "#9ca3af", fontSize: 11, cursor: "pointer" }}>
                              ✏️
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ background: "#0a0a0f", borderRadius: 12, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>📦</span><span>{order.product} × {order.quantity || 1}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 14 }}><span>💵</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>{fmt(order.amount)}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>🚚</span><span>{prettyDT(order.delivery_type)}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>👤</span><span>{order.driver_name || "Non assigné"}</span></div>
                        <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#6b7280" }}><span>📅</span><span>Créée : {fmtDate(order.created_at)}</span></div>
                        {order.confirmed_at && <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#60a5fa" }}><span>✅</span><span>Confirmée : {fmtDate(order.confirmed_at)}</span></div>}
                        {order.delivered_at && <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#4ade80" }}><span>🎯</span><span>Finalisée : {fmtDate(order.delivered_at)}</span></div>}
                        {order.cancelled_at && <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#f87171" }}><span>❌</span><span>Annulée : {fmtDate(order.cancelled_at)}</span></div>}
                        {(order.driver_commission || order.closer_commission) ? (
                          <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#4ade80" }}><span>💰</span><span>Livreur : {fmt(order.driver_commission)} · Closureuse : {fmt(order.closer_commission)}</span></div>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                        <span style={{ background: ls.bg, color: ls.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{order.logistic_status || "En attente"}</span>
                        <span style={{ background: ps.bg, color: ps.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{order.payment_status || "Non payé"}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <a href={callUrl(order.phone)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 10px", background: "#1e3a5f", border: "1px solid #60a5fa30", borderRadius: 10, color: "#60a5fa", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                          📞 Client
                        </a>
                        <a href={waUrl(order.phone, clientWaMsg(order))} target="_blank" rel="noreferrer"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 10px", background: "#052e16", border: "1px solid #4ade8030", borderRadius: 10, color: "#4ade80", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                          💬 WhatsApp
                        </a>
                      </div>
                      {driverPhone && (
                        <div style={{ marginBottom: 10 }}>
                          <a href={callUrl(driverPhone)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 10px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 10, color: "#9ca3af", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                            📞 Appeler {order.driver_name || "Livreur"}
                          </a>
                        </div>
                      )}
                      {enCours && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <select value={selectedActions[order.id] || ""} onChange={(e) => setSelectedActions((p) => ({ ...p, [order.id]: e.target.value }))}
                            style={{ flex: 1, minWidth: 130, padding: "10px 10px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 10, color: "white", fontSize: 13, outline: "none" }}>
                            {getActions(order).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                          <select value={selectedDrivers[order.id] || ""} onChange={(e) => setSelectedDrivers((p) => ({ ...p, [order.id]: e.target.value }))}
                            style={{ flex: 1, minWidth: 110, padding: "10px 10px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 10, color: "white", fontSize: 13, outline: "none" }}>
                            <option value="">Livreur...</option>
                            {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                          </select>
                          <button onClick={() => requestAction(order)}
                            style={{ padding: "10px 16px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 10, color: "#0a0a0f", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                            OK
                          </button>
                        </div>
                      )}
                      {getOrderHistory(order.id).length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1e1e2e" }}>
                          <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>HISTORIQUE ACTIONS</p>
                          {getOrderHistory(order.id).slice(0, 2).map((h) => (
                            <div key={h.id} style={{ padding: "5px 0", borderBottom: "1px solid #1a1a2e" }}>
                              <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 1 }}>{h.action_by_name} — {h.action_type}</p>
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

        {/* ─── CRÉER ─── */}
        {activeView === "creer" && (
          <div style={{ maxWidth: 700 }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>➕ Nouvelle commande</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { name: "customer_name", label: "Nom client", placeholder: "Ex: Kofi Mensah" },
                  { name: "phone", label: "Téléphone", placeholder: "Ex: 22890000000" },
                  { name: "city", label: "Ville", placeholder: "Ex: Lomé" },
                  { name: "address", label: "Adresse", placeholder: "Ex: Akodessewa..." },
                  { name: "product", label: "Produit", placeholder: "Ex: THERAWOLF" },
                  { name: "amount", label: "Montant (FCFA)", placeholder: "25000", type: "number" },
                  { name: "quantity", label: "Quantité", placeholder: "1", type: "number" },
                ].map((f) => (
                  <div key={f.name}>
                    <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>{f.label}</label>
                    <input name={f.name} value={(form as Record<string, string>)[f.name]} onChange={handleChange} required placeholder={f.placeholder} type={f.type || "text"} style={fs} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Type de livraison</label>
                  <select name="delivery_type" value={form.delivery_type} onChange={handleChange} required style={fs}>
                    <option value="">Choisir...</option>
                    <option value="direct">🚚 Direct</option>
                    <option value="gare">🚌 Gare</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={loading}
                style={{ padding: 16, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 14, color: "#0a0a0f", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                {loading ? "Création..." : "✅ Créer la commande"}
              </button>
            </form>
          </div>
        )}

        {/* ─── STOCK — PHASE 4 ─── */}
        {activeView === "stock" && (
          <div>
            {/* Sous-navigation stock */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 24, paddingBottom: 4 }}>
              {[
                { id: "overview", label: "📊 Vue d'ensemble" },
                { id: "warehouse", label: "🏭 Entrepôt" },
                { id: "drivers", label: "🚴 Livreurs" },
                { id: "transfer", label: "🔄 Transferts" },
                { id: "history", label: "📋 Historique" },
                { id: "demandes", label: `📬 Demandes${pendingDemandes.length > 0 ? ` (${pendingDemandes.length})` : ""}` },
              ].map((sub) => (
                <button key={sub.id} onClick={() => setStockSubView(sub.id as typeof stockSubView)}
                  style={{ padding: "9px 14px", border: "1px solid", borderColor: stockSubView === sub.id ? "#f59e0b" : "#2a2a3e", background: stockSubView === sub.id ? "#1a1200" : "#111118", color: stockSubView === sub.id ? "#f59e0b" : "#9ca3af", borderRadius: 20, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0, fontWeight: stockSubView === sub.id ? 700 : 400 }}>
                  {sub.label}
                </button>
              ))}
            </div>

            {/* ── Vue d'ensemble ── */}
            {stockSubView === "overview" && (
              <div>
                {lowWarehouseStocks.length > 0 && (
                  <div style={{ marginBottom: 20, padding: 16, background: "#2d0808", border: "1px solid #f87171", borderRadius: 16 }}>
                    <p style={{ fontSize: 13, color: "#f87171", fontWeight: 700, marginBottom: 10 }}>⚠️ ALERTES STOCK BAS</p>
                    {lowWarehouseStocks.map((w) => (
                      <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #3d0a0a" }}>
                        <span style={{ fontSize: 14 }}>{w.product_name}</span>
                        <span style={{ color: "#f87171", fontWeight: 700 }}>{w.quantity} restant(s) / seuil {w.alert_threshold}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>STOCK ENTREPÔT</p>
                {warehouseStocks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 20px", color: "#6b7280", background: "#111118", borderRadius: 16, marginBottom: 20 }}>
                    <p style={{ fontSize: 32, marginBottom: 8 }}>🏭</p>
                    <p>Aucun stock entrepôt. Utilisez l&apos;onglet &ldquo;Entrepôt&rdquo; pour en ajouter.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
                    {warehouseStocks.map((w) => {
                      const isLow = w.quantity <= w.alert_threshold
                      return (
                        <div key={w.id} style={{ background: isLow ? "#2d0808" : "#111118", border: `1px solid ${isLow ? "#f87171" : "#1e1e2e"}`, borderRadius: 16, padding: 18, textAlign: "center" }}>
                          <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>ENTREPÔT</p>
                          <p style={{ fontSize: 26, marginBottom: 6 }}>🏭</p>
                          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{w.product_name}</p>
                          <p style={{ fontSize: 36, fontWeight: 700, color: isLow ? "#f87171" : "#f59e0b" }}>{w.quantity}</p>
                          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>seuil alerte : {w.alert_threshold}</p>
                          {isLow && <p style={{ fontSize: 11, color: "#f87171", marginTop: 4, fontWeight: 700 }}>⚠️ Stock bas</p>}
                        </div>
                      )
                    })}
                  </div>
                )}

                <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>STOCK PAR LIVREUR</p>
                {driverStocks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 20px", color: "#6b7280", background: "#111118", borderRadius: 16 }}>
                    <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p><p>Aucun stock livreur.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                    {driverStocks.map((s) => {
                      const isLow = s.quantity <= 3
                      return (
                        <div key={s.id} style={{ background: isLow ? "#1a0a00" : "#111118", border: `1px solid ${isLow ? "#f59e0b60" : "#1e1e2e"}`, borderRadius: 16, padding: 18, textAlign: "center" }}>
                          <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{s.driver_name}</p>
                          <p style={{ fontSize: 26, marginBottom: 6 }}>📦</p>
                          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{s.product_name}</p>
                          <p style={{ fontSize: 36, fontWeight: 700, color: isLow ? "#f87171" : "#f59e0b" }}>{s.quantity}</p>
                          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>unités</p>
                          {isLow && <p style={{ fontSize: 11, color: "#f87171", marginTop: 4, fontWeight: 700 }}>⚠️ Stock bas</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Entrepôt ── */}
            {stockSubView === "warehouse" && (
              <div>
                <div style={{ maxWidth: 600, marginBottom: 32 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏭 Ajouter au stock entrepôt</p>
                  <form onSubmit={handleAddWarehouse} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Produit</label>
                        <input value={warehouseForm.product_name} onChange={(e) => setWarehouseForm({ ...warehouseForm, product_name: e.target.value })} required style={fs} placeholder="Ex: THERAWOLF" />
                      </div>
                      <div>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Quantité</label>
                        <input type="number" min="1" value={warehouseForm.quantity} onChange={(e) => setWarehouseForm({ ...warehouseForm, quantity: e.target.value })} required style={fs} />
                      </div>
                      <div>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Seuil alerte</label>
                        <input type="number" min="1" value={warehouseForm.alert_threshold} onChange={(e) => setWarehouseForm({ ...warehouseForm, alert_threshold: e.target.value })} required style={fs} />
                      </div>
                    </div>
                    <button type="submit" disabled={stockPhase4Loading}
                      style={{ padding: 14, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                      {stockPhase4Loading ? "En cours..." : "➕ Ajouter au stock entrepôt"}
                    </button>
                  </form>
                </div>

                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Stock actuel entrepôt</p>
                {warehouseStocks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>🏭</p><p>Aucun stock entrepôt</p></div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {warehouseStocks.map((w) => {
                      const isLow = w.quantity <= w.alert_threshold
                      return (
                        <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: isLow ? "#2d0808" : "#111118", border: `1px solid ${isLow ? "#f87171" : "#1e1e2e"}`, borderRadius: 14 }}>
                          <div>
                            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{w.product_name}</p>
                            <p style={{ fontSize: 12, color: "#6b7280" }}>Seuil alerte : {w.alert_threshold} unités</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 32, fontWeight: 700, color: isLow ? "#f87171" : "#f59e0b" }}>{w.quantity}</p>
                            {isLow && <p style={{ fontSize: 11, color: "#f87171", fontWeight: 700 }}>⚠️ Stock bas !</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Stock livreurs ── */}
            {stockSubView === "drivers" && (
              <div>
                <div style={{ maxWidth: 600, marginBottom: 32 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>➕ Ajouter stock direct à un livreur</p>
                  <form onSubmit={handleAddStock} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Livreur</label>
                      <select name="driver_id" value={stockForm.driver_id} onChange={handleStockChange} required style={fs}>
                        <option value="">Choisir un livreur</option>
                        {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Produit</label>
                        <input name="product_name" value={stockForm.product_name} onChange={handleStockChange} required style={fs} placeholder="Ex: THERAWOLF" />
                      </div>
                      <div>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Quantité</label>
                        <input name="quantity" type="number" min="1" value={stockForm.quantity} onChange={handleStockChange} required style={fs} />
                      </div>
                    </div>
                    <button type="submit" disabled={stockLoading}
                      style={{ padding: 14, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                      {stockLoading ? "Ajout..." : "➕ Ajouter"}
                    </button>
                  </form>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Stock actuel livreurs</p>
                {driverStocks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>📭</p><p>Aucun stock livreur</p></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
                    {driverStocks.map((s) => {
                      const isLow = s.quantity <= 3
                      return (
                        <div key={s.id} style={{ background: isLow ? "#1a0a00" : "#111118", border: `1px solid ${isLow ? "#f87171" : "#1e1e2e"}`, borderRadius: 16, padding: 20, textAlign: "center" }}>
                          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{s.driver_name}</p>
                          <p style={{ fontSize: 28, marginBottom: 8 }}>📦</p>
                          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{s.product_name}</p>
                          <p style={{ fontSize: 36, fontWeight: 700, color: isLow ? "#f87171" : "#f59e0b" }}>{s.quantity}</p>
                          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>unités</p>
                          {isLow && <p style={{ fontSize: 11, color: "#f87171", marginTop: 6, fontWeight: 700 }}>⚠️ Stock bas</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Transferts ── */}
            {stockSubView === "transfer" && (
              <div>
                <div style={{ maxWidth: 600, marginBottom: 32 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔄 Transfert Entrepôt → Livreur</p>
                  <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Déduire du stock entrepôt et ajouter au livreur</p>
                  <form onSubmit={handleWarehouseToDriver} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Produit (entrepôt)</label>
                      <select value={warehouseToDriverForm.product_name} onChange={(e) => setWarehouseToDriverForm({ ...warehouseToDriverForm, product_name: e.target.value })} required style={fs}>
                        <option value="">Choisir un produit</option>
                        {warehouseStocks.map((w) => <option key={w.id} value={w.product_name}>{w.product_name} (dispo : {w.quantity})</option>)}
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Livreur destinataire</label>
                        <select value={warehouseToDriverForm.driver_id} onChange={(e) => setWarehouseToDriverForm({ ...warehouseToDriverForm, driver_id: e.target.value })} required style={fs}>
                          <option value="">Choisir un livreur</option>
                          {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Quantité</label>
                        <input type="number" min="1" value={warehouseToDriverForm.quantity} onChange={(e) => setWarehouseToDriverForm({ ...warehouseToDriverForm, quantity: e.target.value })} required style={fs} />
                      </div>
                    </div>
                    <button type="submit" disabled={stockPhase4Loading}
                      style={{ padding: 14, background: "linear-gradient(135deg, #1d4ed8, #1e40af)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                      {stockPhase4Loading ? "Transfert..." : "🔄 Transférer vers livreur"}
                    </button>
                  </form>
                </div>

                <div style={{ maxWidth: 600, borderTop: "1px solid #1e1e2e", paddingTop: 28 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>↔️ Transfert Livreur → Livreur</p>
                  <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Déplacer du stock entre deux livreurs</p>
                  <form onSubmit={handleTransfer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Produit</label>
                      <select value={transferForm.product_name} onChange={(e) => setTransferForm({ ...transferForm, product_name: e.target.value })} required style={fs}>
                        <option value="">Choisir un produit</option>
                        {Array.from(new Set(driverStocks.map((s) => s.product_name))).map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Livreur source</label>
                        <select value={transferForm.from_driver_id} onChange={(e) => setTransferForm({ ...transferForm, from_driver_id: e.target.value })} required style={fs}>
                          <option value="">De...</option>
                          {drivers.map((d) => {
                            const stock = driverStocks.find((s) => s.driver_id === d.id && (!transferForm.product_name || s.product_name === transferForm.product_name))
                            return <option key={d.id} value={d.id}>{d.full_name} (stock: {stock?.quantity || 0})</option>
                          })}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Livreur destinataire</label>
                        <select value={transferForm.to_driver_id} onChange={(e) => setTransferForm({ ...transferForm, to_driver_id: e.target.value })} required style={fs}>
                          <option value="">Vers...</option>
                          {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Quantité à transférer</label>
                      <input type="number" min="1" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} required style={fs} />
                    </div>
                    <button type="submit" disabled={stockPhase4Loading}
                      style={{ padding: 14, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                      {stockPhase4Loading ? "Transfert..." : "↔️ Transférer entre livreurs"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── Historique mouvements ── */}
            {stockSubView === "history" && (
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Historique des mouvements de stock</p>
                {stockMouvements.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>📋</p><p>Aucun mouvement enregistré</p></div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stockMouvements.map((m) => {
                      const typeColor: Record<string, string> = {
                        entree_entrepot: "#4ade80",
                        transfert_entrepot_livreur: "#60a5fa",
                        transfert_livreur: "#c084fc",
                        vente_livraison: "#fb923c",
                        demande_approuvee: "#4ade80",
                      }
                      const typeLabel: Record<string, string> = {
                        entree_entrepot: "➕ Entrée entrepôt",
                        transfert_entrepot_livreur: "🔄 Entrepôt → Livreur",
                        transfert_livreur: "↔️ Livreur → Livreur",
                        vente_livraison: "🎯 Vendu (livraison)",
                        demande_approuvee: "✅ Demande approuvée",
                      }
                      const color = typeColor[m.mouvement_type] || "#9ca3af"
                      return (
                        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "14px 16px", background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 4 }}>{typeLabel[m.mouvement_type] || m.mouvement_type}</p>
                            <p style={{ fontSize: 13, color: "#e5e7eb", marginBottom: 2 }}>{m.product_name}</p>
                            <p style={{ fontSize: 12, color: "#6b7280" }}>{m.from_location} → {m.to_location}</p>
                            {m.note && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>📝 {m.note}</p>}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                            <p style={{ fontSize: 22, fontWeight: 700, color }}>{m.quantity}</p>
                            <p style={{ fontSize: 11, color: "#6b7280" }}>{fmtDate(m.created_at)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Demandes livreurs ── */}
            {stockSubView === "demandes" && (
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>📬 Demandes de stock</p>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>Les livreurs peuvent demander du stock depuis leur interface. Approuvez ou refusez ici.</p>
                {stockDemandes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>📬</p><p>Aucune demande</p></div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {stockDemandes.map((d) => {
                      const isPending = d.status === "en_attente"
                      const statusColors: Record<string, { bg: string; color: string }> = {
                        en_attente: { bg: "#1a1200", color: "#f59e0b" },
                        approuvée: { bg: "#052e16", color: "#4ade80" },
                        refusée: { bg: "#450a0a", color: "#f87171" },
                      }
                      const sc = statusColors[d.status] || { bg: "#111118", color: "#9ca3af" }
                      return (
                        <div key={d.id} style={{ padding: 16, background: "#111118", border: "1px solid #1e1e2e", borderRadius: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div>
                              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{d.driver_name}</p>
                              <p style={{ fontSize: 13, color: "#9ca3af" }}>📦 {d.product_name} × {d.quantity_requested}</p>
                              {d.note && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>💬 {d.note}</p>}
                              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>📅 {fmtDate(d.created_at)}</p>
                            </div>
                            <span style={{ background: sc.bg, color: sc.color, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {d.status === "en_attente" ? "⏳ En attente" : d.status === "approuvée" ? "✅ Approuvée" : "❌ Refusée"}
                            </span>
                          </div>
                          {isPending && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <button onClick={() => handleApproveDemandeStock(d)} disabled={stockPhase4Loading}
                                style={{ padding: "10px 0", background: "linear-gradient(135deg, #052e16, #065f46)", border: "1px solid #4ade8040", borderRadius: 10, color: "#4ade80", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                                ✅ Approuver
                              </button>
                              <button onClick={() => handleRejectDemandeStock(d)}
                                style={{ padding: "10px 0", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 10, color: "#f87171", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                                ❌ Refuser
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── COMMISSIONS ─── */}
        {activeView === "commissions" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "#111118", borderRadius: 12, padding: 4, maxWidth: 360 }}>
              {Object.entries(periodLabels).map(([key, label]) => (
                <button key={key} onClick={() => setPeriodFilter(key)}
                  style={{ flex: 1, padding: "11px 6px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, background: periodFilter === key ? "#f59e0b" : "transparent", color: periodFilter === key ? "#0a0a0f" : "#6b7280" }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28, maxWidth: 600 }}>
              <div style={{ background: "linear-gradient(135deg, #052e16, #065f46)", border: "1px solid #4ade8040", borderRadius: 18, padding: 22 }}>
                <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Total livreurs</p>
                <p style={{ fontSize: 28, fontWeight: 700 }}>{fmt(commissionStats.totalDriver)}</p>
              </div>
              <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)", border: "1px solid #60a5fa30", borderRadius: 18, padding: 22 }}>
                <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Total closeuses</p>
                <p style={{ fontSize: 28, fontWeight: 700 }}>{fmt(commissionStats.totalCloser)}</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 12 }}>🚚 PAR LIVREUR — 2 000 FCFA / LIVRAISON</p>
            {Object.values(commissionStats.byDriver).length === 0 ? (
              <p style={{ color: "#6b7280", marginBottom: 24 }}>Aucune commission sur cette période.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {Object.values(commissionStats.byDriver).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#111118", borderRadius: 12 }}>
                    <div><p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{item.name}</p><p style={{ fontSize: 13, color: "#6b7280" }}>{item.count} livraison(s)</p></div>
                    <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 18 }}>{fmt(item.total)}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 12 }}>💼 PAR CLOSUREUSE — 500 FCFA / LIVRAISON</p>
            {Object.values(commissionStats.byCloser).length === 0 ? (
              <p style={{ color: "#6b7280" }}>Aucune commission sur cette période.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.values(commissionStats.byCloser).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#111118", borderRadius: 12 }}>
                    <div><p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{item.name}</p><p style={{ fontSize: 13, color: "#6b7280" }}>{item.count} commande(s)</p></div>
                    <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 18 }}>{fmt(item.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
