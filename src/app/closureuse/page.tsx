"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

export default function ClosureusePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [selectedDrivers, setSelectedDrivers] = useState<any>({})
  const [activeView, setActiveView] = useState("dashboard")

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    city: "",
    address: "",
    product: "",
    quantity: "1",
    delivery_type: "",
    amount: "",
  })

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: orders } = await supabase.from("orders").select("*").order("id", { ascending: false })
    const { data: drivers } = await supabase.from("profiles").select("*").eq("role", "livreur")

    setOrders(orders || [])
    setDrivers(drivers || [])

    const map: any = {}
    orders?.forEach((o: any) => {
      map[o.id] = o.assigned_driver_id || ""
    })
    setSelectedDrivers(map)

    setLoading(false)
  }

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    const isGare = form.delivery_type === "gare"

    const groupId = isGare
      ? `${form.city}-${new Date().toISOString().slice(0, 10)}`
      : null

    await supabase.from("orders").insert([
      {
        ...form,
        quantity: Number(form.quantity),
        amount: Number(form.amount),
        delivery_group_id: groupId,
        is_grouped: isGare,
        status: "En attente",
        logistic_status: "En attente",
        payment_status: "Non payé",
        is_assigned: false,
      },
    ])

    alert("Commande créée ✅")
    location.reload()
  }

  const assignDriver = async (orderId: number) => {
    const driverId = selectedDrivers[orderId]
    const driver = drivers.find((d) => d.id === driverId)

    await supabase
      .from("orders")
      .update({
        assigned_driver_id: driver.id,
        driver_name: driver.full_name,
        is_assigned: true,
      })
      .eq("id", orderId)

    alert("Assigné ✅")
    location.reload()
  }

  // ======================
  // 💰 GAINS PRO (SUPABASE)
  // ======================

  const delivered = orders.filter(o => o.status === "Livré")

  const closeuseGain = delivered.reduce(
    (sum, o) => sum + (o.closer_commission || 0),
    0
  )

  const livreurGain = delivered.reduce(
    (sum, o) => sum + (o.driver_commission || 0),
    0
  )

  const totalOrders = orders.length
  const pending = orders.filter(o => o.status === "En attente").length
  const confirmed = orders.filter(o => o.status === "Confirmé").length
  const deliveredCount = delivered.length

  if (loading) return <div>Chargement...</div>

  return (
    <div style={{ padding: 20, background: "#0f172a", color: "white", minHeight: "100vh" }}>

      <h1>💰 Espace Closeuse PRO</h1>

      {/* DASHBOARD */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 30 }}>
        <div>Total : {totalOrders}</div>
        <div>En attente : {pending}</div>
        <div>Confirmées : {confirmed}</div>
        <div>Livrées : {deliveredCount}</div>
      </div>

      {/* 💰 GAINS */}
      <div style={{ background: "#1e293b", padding: 20, borderRadius: 10, marginBottom: 30 }}>
        <h2>💰 Mes gains</h2>
        <p>Closeuse : <b>{closeuseGain} FCFA</b></p>
        <p>Livreurs : <b>{livreurGain} FCFA</b></p>
      </div>

      {/* MENU */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setActiveView("dashboard")}>Dashboard</button>
        <button onClick={() => setActiveView("create")}>Créer</button>
        <button onClick={() => setActiveView("orders")}>Commandes</button>
      </div>

      {/* CREATE */}
      {activeView === "create" && (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, maxWidth: 400 }}>
          <input name="customer_name" placeholder="Nom" onChange={handleChange} required />
          <input name="phone" placeholder="Téléphone" onChange={handleChange} required />
          <input name="city" placeholder="Ville" onChange={handleChange} required />
          <input name="address" placeholder="Adresse" onChange={handleChange} required />
          <input name="product" placeholder="Produit" onChange={handleChange} required />
          <input name="quantity" type="number" onChange={handleChange} required />
          <input name="amount" type="number" onChange={handleChange} required />

          <select name="delivery_type" onChange={handleChange} required>
            <option value="">Type livraison</option>
            <option value="direct">Direct</option>
            <option value="gare">Gare</option>
          </select>

          <button type="submit">Créer</button>
        </form>
      )}

      {/* ORDERS */}
      {activeView === "orders" && (
        <div>
          {orders.map((o) => (
            <div key={o.id} style={{ background: "#1e293b", padding: 10, marginTop: 10 }}>
              <p>{o.customer_name} - {o.city}</p>
              <p>{o.product} - {o.amount} FCFA</p>
              <p>Status : {o.status}</p>
              <p>Type : {o.delivery_type}</p>

              <p>💰 Closeuse : {o.closer_commission || 0}</p>
              <p>🚚 Livreur : {o.driver_commission || 0}</p>

              <select
                value={selectedDrivers[o.id] || ""}
                onChange={(e) =>
                  setSelectedDrivers({ ...selectedDrivers, [o.id]: e.target.value })
                }
              >
                <option value="">Livreur</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>

              <button onClick={() => assignDriver(o.id)}>Assigner</button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}