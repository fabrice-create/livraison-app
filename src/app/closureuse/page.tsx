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
  delivery_group_id?: string | null
}

type Profile = {
  id: string
  email: string
  role: string
  full_name: string
}

export default function ClosureusePage() {
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    setProfile(profile)

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false })

    setOrders(orders || [])
    setLoading(false)
  }

  // =========================
  // 💰 COMMISSIONS (AJOUT)
  // =========================

  const delivered = orders.filter(o => o.status === "Livré")

  const closeuseGain = delivered.length * 500

  const direct = delivered.filter(
    o => (o.delivery_type || "").toLowerCase() === "direct"
  ).length

  const groups = new Set(
    delivered
      .filter(o => (o.delivery_type || "").toLowerCase() === "gare")
      .map(o => o.delivery_group_id || o.id)
  )

  const livreurGain = (direct * 2000) + (groups.size * 2000)

  // =========================

  if (loading) return <div>Chargement...</div>

  return (
    <div style={{ padding: 20, background: "#0f172a", color: "white", minHeight: "100vh" }}>

      <h1>💰 Espace Closureuse</h1>

      {/* 💰 GAINS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 20
      }}>
        <div style={{ background: "#16a34a", padding: 14, borderRadius: 12 }}>
          💰 Mes gains : {closeuseGain} FCFA
        </div>

        <div style={{ background: "#2563eb", padding: 14, borderRadius: 12 }}>
          🚚 Gains livreurs : {livreurGain} FCFA
        </div>
      </div>

      {/* COMMANDES */}
      {orders.map((o) => (
        <div key={o.id} style={{ background: "#1e293b", padding: 10, marginTop: 10 }}>
          <p>{o.customer_name} - {o.city}</p>
          <p>{o.product} - {o.amount} FCFA</p>
          <p>Status : {o.status}</p>
          <p>Type : {o.delivery_type}</p>
        </div>
      ))}

    </div>
  )
}