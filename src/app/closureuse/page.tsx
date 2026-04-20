"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

type Order = {
  id: number
  customer_name: string
  city: string
  product: string
  amount?: number | string | null
  status?: string
  delivery_type?: string | null
  delivery_group_id?: string | null
}

export default function ClosureusePage() {
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false })

    setOrders(orders || [])
    setLoading(false)
  }

  // =========================
  // 💰 GAINS (BON ENDROIT)
  // =========================

  const deliveredOrders = orders.filter(o => o.status === "Livré")

  const closeuseGain = deliveredOrders.length * 500

  const directCount = deliveredOrders.filter(
    o => (o.delivery_type || "").toLowerCase() === "direct"
  ).length

  const gareGroups = new Set(
    deliveredOrders
      .filter(o => (o.delivery_type || "").toLowerCase() === "gare")
      .map(o => o.delivery_group_id || o.id)
  )

  const livreurGain = (directCount * 2000) + (gareGroups.size * 2000)

  // =========================

  if (loading) return <div>Chargement...</div>

  return (
    <div style={{ padding: 20, background: "#0f172a", color: "white", minHeight: "100vh" }}>

      <h1>💰 Espace Closureuse</h1>

      <h2>Tableau de bord</h2>

      {/* 💰 GAINS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 20
      }}>
        <div style={{ background: "#16a34a", padding: 16, borderRadius: 12 }}>
          💰 Mes gains : <b>{closeuseGain} FCFA</b>
        </div>

        <div style={{ background: "#2563eb", padding: 16, borderRadius: 12 }}>
          🚚 Gains livreurs : <b>{livreurGain} FCFA</b>
        </div>
      </div>

      {/* COMMANDES */}
      {orders.map((o) => (
        <div key={o.id} style={{ background: "#1e293b", padding: 10, marginTop: 10 }}>
          <p><b>{o.customer_name}</b> - {o.city}</p>
          <p>{o.product} - {o.amount} FCFA</p>
          <p>Status : {o.status}</p>
          <p>Type : {o.delivery_type}</p>
        </div>
      ))}

    </div>
  )
}