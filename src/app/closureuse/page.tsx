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
  phone?: string | null
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
  const [periodFilter, setPeriodFilter] = useState("mois")
  const [confirmAssign, setConfirmAssign] = useState<{ orderId: number; driverName: string } | null>(null)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editForm, setEditForm] = useState({ customer_name: "", phone: "", city: "", address: "", product: "", quantity: "1", amount: "", delivery_type: "" })

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
  const isToday = (d?: string | null) => { if (!d) return false; return new Date(d).toDateString() === new Date().toDateString() }

  // En cours = En attente + Confirmé
  const isEnCours = (o: Order) => {
    const s = o.status || "En attente"
    return s === "En attente" || s === "Confirmé"
  }
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
  const clientWaMsg = (o: Order) => `Bonjour ${o.customer_name}, votre commande est en cours de traitement !\n\nProduit : ${o.product} × ${o.quantity || 1}\nMontant : ${fmt(o.amount)}\nVille : ${o.city}\nLivraison : ${prettyDT(o.delivery_type)}\n\nMerci de vous tenir disponible.`

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
  const myEnCours = useMemo(() => myOrders.filter(isEnCours), [myOrders])
  const myHistorique = useMemo(() => myOrders.filter(isHistorique), [myOrders])
  const allEnCours = useMemo(() => orders.filter(isEnCours), [orders])

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
    enCours: orders.filter(isEnCours).length,
    confirmed: orders.filter((o) => o.status === "Confirmé").length,
    delivered: orders.filter((o) => o.status === "Livré").length,
    gare: orders.filter((o) => o.logistic_status === "Envoyé à la gare").length,
    paid: orders.filter((o) => o.payment_status === "Payé").length,
  }), [orders])

  const stockByDriver = useMemo(() => {
    const r: Record<string, number> = {}
    driverStocks.forEach((i) => { r[i.driver_name] = (r[i.driver_name] || 0) + Number(i.quantity || 0) })
    return r
  }, [driverStocks])

  const filteredDriverStocks = useMemo(() => {
    if (stockDriverFilter === "Tous") return driverStocks
    return driverStocks.filter((s) => s.driver_name === stockDriverFilter)
  }, [driverStocks, stockDriverFilter])

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

  const openEdit = (order: Order) => {
    setEditingOrder(order)
    setEditForm({
      customer_name: order.customer_name || "",
      phone: order.phone || "",
      city: order.city || "",
      address: order.address || "",
      product: order.product || "",
      quantity: String(order.quantity || 1),
      amount: String(order.amount || ""),
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
    setEditingOrder(null)
    alert("Commande modifiée ✅")
  }

  const requestAssign = (orderId: number) => {
    const driverId = selectedDrivers[orderId]
    if (!driverId) { alert("Choisis un livreur."); return }
    const driver = drivers.find((d) => d.id === driverId)
    if (!driver) return
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
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "commissions", label: "💰 Commissions" },
    { id: "mes_commandes", label: `📋 Mes cmd (${myEnCours.length})` },
    { id: "assigner", label: `👤 Assigner (${allEnCours.length})` },
    { id: "creer", label: "➕ Créer" },
    { id: "stocks", label: "🗄️ Stocks" },
  ]

  const fs = { width: "100%", padding: "13px 14px", background: "#111118", border: "1px solid #2a2a3e", borderRadius: 12, color: "white" as const, fontSize: 15, outline: "none", boxSizing: "border-box" as const }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0f", color: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #f59e0b", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#9ca3af" }}>Chargement...</p>
      </div>
    </div>
  )

  const renderCard = (o: Order, showEdit = false, showAssign = false) => {
    const ss = statusStyle(o.status)
    const enCours = isEnCours(o)
    return (
      <div key={o.id} style={{ background: "#111118", border: `1px solid ${enCours ? "#f59e0b20" : "#1e1e2e"}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 8 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{o.customer_name}</p>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>📍 {o.city} · {o.phone}</p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <span style={{ background: ss.bg, color: ss.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
              {o.status || "En attente"}
            </span>
            {showEdit && enCours && (
              <button onClick={() => openEdit(o)}
                style={{ padding: "4px 8px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 20, color: "#9ca3af", fontSize: 11, cursor: "pointer" }}>
                ✏️
              </button>
            )}
          </div>
        </div>

        <div style={{ background: "#0a0a0f", borderRadius: 12, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>📦</span><span>{o.product} × {o.quantity || 1}</span></div>
          <div style={{ display: "flex", gap: 8, fontSize: 14 }}><span>💵</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>{fmt(o.amount)}</span></div>
          <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>🚚</span><span>{prettyDT(o.delivery_type)}</span></div>
          <div style={{ display: "flex", gap: 8, fontSize: 14, color: "#e5e7eb" }}><span>👤</span><span>{o.driver_name || "Non assigné"}</span></div>
          <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#6b7280" }}><span>📅</span><span>Créée : {fmtDate(o.created_at)}</span></div>
          {o.confirmed_at && <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#60a5fa" }}><span>✅</span><span>Confirmée : {fmtDate(o.confirmed_at)}</span></div>}
          {o.delivered_at && <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#4ade80" }}><span>🎯</span><span>Finalisée : {fmtDate(o.delivered_at)}</span></div>}
          {o.cancelled_at && <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#f87171" }}><span>❌</span><span>Annulée : {fmtDate(o.cancelled_at)}</span></div>}
        </div>

        {/* Boutons appel + WhatsApp */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <a href={callUrl(o.phone)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "#1e3a5f", border: "1px solid #60a5fa30", borderRadius: 12, color: "#60a5fa", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            📞 Appeler
          </a>
          <a href={waUrl(o.phone, clientWaMsg(o))} target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "#052e16", border: "1px solid #4ade8030", borderRadius: 12, color: "#4ade80", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            💬 WhatsApp
          </a>
        </div>

        {o.closer_commission ? (
          <div style={{ background: "#1e3a5f", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#60a5fa", fontWeight: 600, marginBottom: showAssign && enCours ? 10 : 0 }}>
            💰 Ma commission : {fmt(o.closer_commission)}
          </div>
        ) : null}

        {showAssign && enCours && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <select value={selectedDrivers[o.id] || ""} onChange={(e) => setSelectedDrivers((p) => ({ ...p, [o.id]: e.target.value }))}
              style={{ flex: 1, padding: "11px 12px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 12, color: "white", fontSize: 14, outline: "none" }}>
              <option value="">Choisir livreur</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
            <button onClick={() => requestAssign(o.id)}
              style={{ padding: "11px 18px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              OK
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", fontFamily: "Inter, Arial, sans-serif" }}>

      {/* Modal modification */}
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

      {/* Confirmation assignation */}
      {confirmAssign && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#111118", border: "1px solid #2a2a3e", borderRadius: 20, padding: 28, maxWidth: 360, width: "100%" }}>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Assigner ce livreur ?</p>
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>
              Assigner <strong style={{ color: "white" }}>{confirmAssign.driverName}</strong> à cette commande ?
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setConfirmAssign(null)} style={{ padding: 13, background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 12, color: "#9ca3af", cursor: "pointer", fontSize: 14 }}>Retour</button>
              <button onClick={executeAssign} style={{ padding: 13, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Confirmer</button>
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
            <p style={{ fontSize: 11, color: "#9ca3af" }}>💼 Closureuse</p>
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
            style={{ padding: "14px 14px", border: "none", borderBottom: activeView === item.id ? "2px solid #f59e0b" : "2px solid transparent", background: "transparent", color: activeView === item.id ? "#f59e0b" : "#9ca3af", fontWeight: activeView === item.id ? 700 : 500, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>

        {/* DASHBOARD */}
        {activeView === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 18, textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>Créées aujourd'hui</p>
                <p style={{ fontSize: 36, fontWeight: 700 }}>{todayStats.created}</p>
              </div>
              <div style={{ background: "#052e16", border: "1px solid #4ade8030", borderRadius: 16, padding: 18, textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>Livrées aujourd'hui</p>
                <p style={{ fontSize: 36, fontWeight: 700, color: "#4ade80" }}>{todayStats.delivered}</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#1a1200", border: "1px solid #f59e0b30", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>📦 Total</p><p style={{ fontSize: 32, fontWeight: 700 }}>{globalStats.total}</p></div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>⚡ En cours</p><p style={{ fontSize: 32, fontWeight: 700, color: "#fb923c" }}>{globalStats.enCours}</p></div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>✅ Confirmées</p><p style={{ fontSize: 32, fontWeight: 700, color: "#60a5fa" }}>{globalStats.confirmed}</p></div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>🎯 Livrées</p><p style={{ fontSize: 32, fontWeight: 700, color: "#4ade80" }}>{globalStats.delivered}</p></div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>🚌 Gare</p><p style={{ fontSize: 32, fontWeight: 700, color: "#c084fc" }}>{globalStats.gare}</p></div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>💰 Payées</p><p style={{ fontSize: 32, fontWeight: 700, color: "#4ade80" }}>{globalStats.paid}</p></div>
            </div>
            <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 16 }}>
              <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12, fontWeight: 600 }}>STOCK PAR LIVREUR</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                {Object.entries(stockByDriver).length === 0 ? <p style={{ color: "#6b7280" }}>Aucun stock</p> :
                  Object.entries(stockByDriver).map(([driver, qty]) => (
                    <div key={driver} style={{ background: "#0a0a0f", borderRadius: 10, padding: 12, textAlign: "center" }}>
                      <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{driver}</p>
                      <p style={{ fontSize: 26, fontWeight: 700, color: "#f59e0b" }}>{qty}</p>
                    </div>
                  ))}
              </div>
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
              <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)", border: "1px solid #60a5fa30", borderRadius: 18, padding: 20 }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>Gagné — {periodLabels[periodFilter]}</p>
                <p style={{ fontSize: 28, fontWeight: 700 }}>{fmt(commissionStats.total)}</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{commissionStats.count} commande(s)</p>
              </div>
              <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 18, padding: 20 }}>
                <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>Total général</p>
                <p style={{ fontSize: 28, fontWeight: 700 }}>{fmt(commissionStats.allTime)}</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{commissionStats.allCount} commande(s)</p>
              </div>
            </div>
            <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 14, padding: 16, fontSize: 14, color: "#9ca3af", lineHeight: 1.6, display: "flex", gap: 10 }}>
              <span>💡</span>
              <p>500 FCFA par commande <strong style={{ color: "white" }}>Livré + Payé</strong> ou <strong style={{ color: "white" }}>Envoyé à la gare</strong>.</p>
            </div>
          </div>
        )}

        {/* MES COMMANDES */}
        {activeView === "mes_commandes" && (
          <div>
            {myEnCours.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <p style={{ fontSize: 16, fontWeight: 700 }}>⚡ En cours</p>
                  <span style={{ background: "#f59e0b", color: "#0a0a0f", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{myEnCours.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {myEnCours.map((o) => renderCard(o, true, false))}
                </div>
              </div>
            )}

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#9ca3af" }}>📋 Historique</p>
                  <span style={{ background: "#1e1e2e", color: "#9ca3af", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{myHistorique.length}</span>
                </div>
                <div style={{ display: "flex", gap: 6, background: "#111118", borderRadius: 12, padding: 4 }}>
                  {Object.entries(periodLabels).map(([key, label]) => (
                    <button key={key} onClick={() => setPeriodFilter(key)}
                      style={{ padding: "6px 10px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, background: periodFilter === key ? "#f59e0b" : "transparent", color: periodFilter === key ? "#0a0a0f" : "#6b7280" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {filterByPeriod(myHistorique).length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 20px", color: "#6b7280" }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
                  <p>Aucune commande dans l'historique pour cette période</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: 0.85 }}>
                  {filterByPeriod(myHistorique).map((o) => renderCard(o, false, false))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ASSIGNER */}
        {activeView === "assigner" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 700 }}>👤 Commandes à assigner</p>
              <span style={{ background: "#f59e0b", color: "#0a0a0f", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{allEnCours.length}</span>
            </div>
            {allEnCours.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🎉</p>
                <p>Toutes les commandes sont traitées !</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {allEnCours.map((o) => renderCard(o, true, true))}
              </div>
            )}
          </div>
        )}

        {/* CRÉER */}
        {activeView === "creer" && (
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>➕ Nouvelle commande</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { name: "customer_name", label: "Nom client", placeholder: "Ex: Kofi Mensah" },
                { name: "phone", label: "Téléphone", placeholder: "Ex: 22890000000" },
                { name: "city", label: "Ville", placeholder: "Ex: Lomé" },
                { name: "address", label: "Adresse", placeholder: "Ex: Akodessewa..." },
                { name: "product", label: "Produit", placeholder: "Ex: THERAWOLF" },
              ].map((f) => (
                <div key={f.name}>
                  <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>{f.label}</label>
                  <input name={f.name} value={(form as Record<string, string>)[f.name]} onChange={handleChange} required placeholder={f.placeholder} style={fs} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Quantité</label>
                  <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} required style={fs} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Montant (FCFA)</label>
                  <input name="amount" type="number" value={form.amount} onChange={handleChange} required placeholder="25000" style={fs} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Type de livraison</label>
                <select name="delivery_type" value={form.delivery_type} onChange={handleChange} required style={fs}>
                  <option value="">Choisir...</option>
                  <option value="direct">🚚 Direct</option>
                  <option value="gare">🚌 Gare</option>
                </select>
              </div>
              <button type="submit" disabled={submitting}
                style={{ padding: 16, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 14, color: "#0a0a0f", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 4 }}>
                {submitting ? "Création..." : "✅ Créer la commande"}
              </button>
            </form>
          </div>
        )}

        {/* STOCKS */}
        {activeView === "stocks" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <select value={stockDriverFilter} onChange={(e) => setStockDriverFilter(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", background: "#111118", border: "1px solid #2a2a3e", borderRadius: 12, color: "white", fontSize: 14, outline: "none" }}>
                <option value="Tous">Tous les livreurs</option>
                {drivers.map((d) => <option key={d.id} value={d.full_name}>{d.full_name}</option>)}
              </select>
            </div>
            {filteredDriverStocks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}><p style={{ fontSize: 40, marginBottom: 12 }}>📭</p><p>Aucun stock</p></div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                {filteredDriverStocks.map((s) => (
                  <div key={s.id} style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 16, padding: 20, textAlign: "center" }}>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{s.driver_name}</p>
                    <p style={{ fontSize: 32, marginBottom: 8 }}>📦</p>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{s.product_name}</p>
                    <p style={{ fontSize: 36, fontWeight: 700, color: s.quantity > 0 ? "#f59e0b" : "#f87171" }}>{s.quantity}</p>
                    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>unités</p>
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