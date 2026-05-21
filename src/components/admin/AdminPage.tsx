"use client"

// ============================================================
// SHIPIVO — Admin Page (slim)
// ============================================================

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/app/lib/supabase"

import type { Order, Profile, DriverStock, OrderHistory, OrderFormData, StockFormData } from "@/types"
import { normalizeRole, normDT, isEnCours } from "@/lib/utils"

import LoadingSpinner   from "@/components/ui/LoadingSpinner"
import AppHeader        from "@/components/ui/AppHeader"
import NavTabs          from "@/components/ui/NavTabs"
import ConfirmModal     from "@/components/ui/ConfirmModal"
import EditOrderModal   from "@/components/ui/EditOrderModal"
import OrderForm        from "@/components/order/OrderForm"
import DashboardView    from "@/components/admin/DashboardView"
import CommandesView    from "@/components/admin/CommandesView"
import StockView        from "@/components/admin/StockView"
import CommissionsView  from "@/components/admin/CommissionsView"

const EMPTY_FORM: OrderFormData = { customer_name: "", phone: "", city: "", address: "", product: "", quantity: "1", amount: "", delivery_type: "" }
const EMPTY_STOCK: StockFormData = { driver_id: "", product_name: "", quantity: "1" }

export default function AdminPage() {
  const router = useRouter()
  const [orders, setOrders]               = useState<Order[]>([])
  const [drivers, setDrivers]             = useState<Profile[]>([])
  const [closers, setClosers]             = useState<Profile[]>([])
  const [driverStocks, setDriverStocks]   = useState<DriverStock[]>([])
  const [history, setHistory]             = useState<OrderHistory[]>([])
  const [profile, setProfile]             = useState<Profile | null>(null)
  const [authLoading, setAuthLoading]     = useState(true)
  const [loading, setLoading]             = useState(false)
  const [stockLoading, setStockLoading]   = useState(false)
  const [activeView, setActiveView]       = useState("dashboard")
  const [form, setForm]                   = useState<OrderFormData>(EMPTY_FORM)
  const [stockForm, setStockForm]         = useState<StockFormData>(EMPTY_STOCK)
  const [selectedDrivers, setSelectedDrivers] = useState<Record<number, string>>({})
  const [selectedActions, setSelectedActions] = useState<Record<number, string>>({})
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: string } | null>(null)
  const [editingOrder, setEditingOrder]   = useState<Order | null>(null)
  const [editForm, setEditForm]           = useState<OrderFormData>(EMPTY_FORM)

  const enCoursOrders = useMemo(() => orders.filter(isEnCours), [orders])

  const navItems = [
    { id: "dashboard",   label: "📊 Dashboard" },
    { id: "commandes",   label: `📦 Commandes (${enCoursOrders.length})` },
    { id: "creer",       label: "➕ Créer" },
    { id: "stock",       label: "🗄️ Stock" },
    { id: "commissions", label: "💰 Commissions" },
  ]

  // ---- Init ----
  useEffect(() => { void initPage() }, [])

  const initPage = async () => {
    setAuthLoading(true)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.replace("/login"); return }
    const { data: pd } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (!pd) { router.replace("/login"); return }
    const p = pd as Profile
    if (normalizeRole(p.role) !== "admin") {
      router.replace(normalizeRole(p.role) === "closureuse" ? "/closureuse" : normalizeRole(p.role) === "livreur" ? "/livreur" : "/login")
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
    const sel: Record<number, string> = {}; const act: Record<number, string> = {}
    fetched.forEach((o) => { sel[o.id] = o.assigned_driver_id || ""; act[o.id] = "" })
    setSelectedDrivers(sel); setSelectedActions(act)
    const { data: sd } = await supabase.from("driver_stock").select("*").order("id", { ascending: false })
    setDriverStocks((sd as DriverStock[]) || [])
    const { data: hd } = await supabase.from("order_history").select("*").order("created_at", { ascending: false })
    setHistory((hd as OrderHistory[]) || [])
    setAuthLoading(false)
  }

  const addHistory = async (orderId: number, actionType: string, details: string) => {
    if (!profile) return
    const { data } = await supabase.from("order_history").insert([{ order_id: orderId, action_type: actionType, action_by_user_id: profile.id, action_by_name: profile.full_name, action_details: details }]).select()
    if (data) setHistory((prev) => [...(data as OrderHistory[]), ...prev])
  }

  // ---- Actions commande ----
  const updateStatus = async (id: number, newStatus: string) => {
    const extra: Record<string, string | null> = {}
    if (newStatus === "Confirmé") extra.confirmed_at = new Date().toISOString()
    if (newStatus === "Annulé")   extra.cancelled_at = new Date().toISOString()
    const { error } = await supabase.from("orders").update({ status: newStatus, ...extra }).eq("id", id)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus, ...extra } : o))
    await addHistory(id, "statut_modifie", `Statut → ${newStatus}`)
    return true
  }

  const consumeStock = async (order: Order) => {
    const item = driverStocks.find((i) => i.driver_id === order.assigned_driver_id && i.product_name.trim().toLowerCase() === (order.product || "").trim().toLowerCase())
    if (!item) { alert("Aucun stock trouvé."); return false }
    const qty = Number(order.quantity || 1)
    if (Number(item.quantity) < qty) { alert("Stock insuffisant."); return false }
    const newQty = Number(item.quantity) - qty
    const { error } = await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", item.id)
    if (error) { alert("Erreur : " + error.message); return false }
    setDriverStocks((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: newQty } : i))
    return true
  }

  const markDelivered = async (order: Order, isGare = false) => {
    const ok = await consumeStock(order)
    if (!ok) return false
    const now = new Date().toISOString()
    const payload = {
      status: "Livré", logistic_status: isGare ? "Envoyé à la gare" : "Livré",
      payment_status: "Payé", cash_collected: true, cash_collected_at: now,
      cash_collected_by: profile?.full_name || null,
      driver_commission: 2000, closer_commission: 500, commission_calculated: true, delivered_at: now,
    }
    const { error } = await supabase.from("orders").update(payload).eq("id", order.id)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, ...payload } : o))
    await addHistory(order.id, isGare ? "envoye_gare" : "livraison_payee", isGare ? "Envoyé à la gare — commissions enregistrées" : "Livré + Payé — commissions enregistrées")
    return true
  }

  const assignDriver = async (orderId: number) => {
    const driverId = selectedDrivers[orderId]
    const driver = drivers.find((d) => d.id === driverId)
    if (!driver) { alert("Livreur introuvable."); return false }
    const payload = { driver_name: driver.full_name, assigned_driver_id: driver.id, is_assigned: true, assigned_at: new Date().toISOString() }
    const { error } = await supabase.from("orders").update(payload).eq("id", orderId)
    if (error) { alert("Erreur : " + error.message); return false }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...payload } : o))
    await addHistory(orderId, "livreur_assigne", `Livreur : ${driver.full_name}`)
    return true
  }

  const handleActionSubmit = (order: Order) => {
    const action = selectedActions[order.id]
    if (!action) { alert("Choisis une action."); return }
    if (["livre_paye", "annuler", "gare"].includes(action)) setConfirmAction({ order, action })
    else void executeAction(order, action)
  }

  const executeAction = async (order: Order, action: string) => {
    setConfirmAction(null)
    if (action === "confirmer")   { const ok = await updateStatus(order.id, "Confirmé"); if (ok) alert("Confirmée ✅") }
    if (action === "livre_paye")  { const ok = await markDelivered(order, false); if (ok) alert("Livrée et payée ✅\nCommissions enregistrées !") }
    if (action === "gare")        { const ok = await markDelivered(order, true);  if (ok) alert("Envoyée à la gare ✅\nCommissions enregistrées !") }
    if (action === "annuler")     { const ok = await updateStatus(order.id, "Annulé"); if (ok) alert("Annulée ✅") }
    if (action === "assigner")    { const ok = await assignDriver(order.id); if (ok) alert("Livreur assigné ✅") }
    setSelectedActions((prev) => ({ ...prev, [order.id]: "" }))
  }

  // ---- Formulaires ----
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setLoading(true)
    const { data, error } = await supabase.from("orders").insert([{
      ...form, quantity: Number(form.quantity), delivery_type: normDT(form.delivery_type), amount: Number(form.amount),
      cash_collected: false, status: "En attente", logistic_status: "En attente", payment_status: "Non payé",
      is_assigned: false, closer_id: profile?.id || null, closer_name: profile?.full_name || null,
      closer_commission: 0, driver_commission: 0, commission_calculated: false,
    }]).select()
    if (error) alert("Erreur : " + error.message)
    else if (data) {
      const newOrders = data as Order[]
      setOrders([...newOrders, ...orders])
      if (newOrders[0]) await addHistory(newOrders[0].id, "commande_creee", `Créée pour ${newOrders[0].customer_name}`)
      setForm(EMPTY_FORM)
      alert("Commande créée ✅")
    }
    setLoading(false)
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingOrder) return
    const payload = { ...editForm, quantity: Number(editForm.quantity), amount: Number(editForm.amount), delivery_type: normDT(editForm.delivery_type) }
    const { error } = await supabase.from("orders").update(payload).eq("id", editingOrder.id)
    if (error) { alert("Erreur : " + error.message); return }
    setOrders((prev) => prev.map((o) => o.id === editingOrder.id ? { ...o, ...payload } : o))
    await addHistory(editingOrder.id, "commande_modifiee", `Modifiée par ${profile?.full_name}`)
    setEditingOrder(null)
    alert("Commande modifiée ✅")
  }

  const openEdit = (order: Order) => {
    setEditingOrder(order)
    setEditForm({ customer_name: order.customer_name, phone: order.phone, city: order.city, address: order.address, product: order.product, quantity: String(order.quantity || 1), amount: String(order.amount || ""), delivery_type: order.delivery_type })
  }

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setStockForm({ ...stockForm, [e.target.name]: e.target.value })

  const handleAddStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setStockLoading(true)
    const driver = drivers.find((d) => d.id === stockForm.driver_id)
    if (!driver) { alert("Choisis un livreur."); setStockLoading(false); return }
    const productName = stockForm.product_name.trim(); const qty = Number(stockForm.quantity)
    const existing = driverStocks.find((i) => i.driver_id === driver.id && i.product_name.trim().toLowerCase() === productName.toLowerCase())
    if (existing) {
      const newQty = Number(existing.quantity) + qty
      await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", existing.id)
      setDriverStocks((prev) => prev.map((i) => i.id === existing.id ? { ...i, quantity: newQty } : i))
    } else {
      const { data } = await supabase.from("driver_stock").insert([{ driver_id: driver.id, driver_name: driver.full_name, product_name: productName, quantity: qty }]).select()
      if (data) setDriverStocks([...(data as DriverStock[]), ...driverStocks])
    }
    setStockForm(EMPTY_STOCK); alert("Stock ajouté ✅"); setStockLoading(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login") }

  if (authLoading) return <LoadingSpinner />

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", fontFamily: "Inter, Arial, sans-serif" }}>

      {/* Modals */}
      {editingOrder && (
        <EditOrderModal form={editForm} onChange={setEditForm} onSubmit={handleEditSubmit} onClose={() => setEditingOrder(null)} />
      )}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.action === "livre_paye" ? "🎯 Confirmer la livraison ?" : confirmAction.action === "gare" ? "🚌 Confirmer envoi à la gare ?" : "❌ Annuler la commande ?"}
          message={confirmAction.action === "annuler" ? `Annuler la commande de ${confirmAction.order.customer_name} définitivement ?` : `Commande de ${confirmAction.order.customer_name} — action irréversible.`}
          danger={confirmAction.action === "annuler"}
          confirmLabel={confirmAction.action === "annuler" ? "Oui, annuler" : "Confirmer"}
          onConfirm={() => executeAction(confirmAction.order, confirmAction.action)}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <AppHeader name={profile?.full_name || ""} roleLabel="🛒 Administrateur" onLogout={handleLogout} />
      <NavTabs items={navItems} active={activeView} onChange={setActiveView} />

      <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
        {activeView === "dashboard"   && <DashboardView   orders={orders} driverStocks={driverStocks} />}
        {activeView === "commandes"   && (
          <CommandesView
            orders={orders} drivers={drivers} history={history}
            selectedDrivers={selectedDrivers} selectedActions={selectedActions}
            onDriverChange={(id, val) => setSelectedDrivers((p) => ({ ...p, [id]: val }))}
            onActionChange={(id, val) => setSelectedActions((p) => ({ ...p, [id]: val }))}
            onActionSubmit={handleActionSubmit}
            onEditClick={openEdit}
          />
        )}
        {activeView === "creer"       && (
          <div style={{ maxWidth: 700 }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>➕ Nouvelle commande</p>
            <OrderForm form={form} onChange={handleChange} onSubmit={handleSubmit} loading={loading} />
          </div>
        )}
        {activeView === "stock"       && <StockView drivers={drivers} driverStocks={driverStocks} stockForm={stockForm} stockLoading={stockLoading} onStockChange={handleStockChange} onStockSubmit={handleAddStock} />}
        {activeView === "commissions" && <CommissionsView orders={orders} closers={closers} />}
      </div>
    </div>
  )
}
