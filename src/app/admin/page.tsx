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
  delivery_group_id?: string | null
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
  const [driverStocks, setDriverStocks] = useState<DriverStock[]>([])
  const [history, setHistory] = useState<OrderHistory[]>([])
  const [selectedDrivers, setSelectedDrivers] = useState<Record<number, string>>({})
  const [selectedActions, setSelectedActions] = useState<Record<number, string>>({})

  const [loading, setLoading] = useState(false)
  const [stockLoading, setStockLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState("Tous")
  const [search, setSearch] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)

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

  const [stockForm, setStockForm] = useState({
    driver_id: "",
    product_name: "",
    quantity: "1",
  })

  useEffect(() => {
    void initPage()
  }, [])

  const normalizeDeliveryType = (value?: string | null) =>
    (value || "").trim().toLowerCase()

  // =========================
  // 💰 COMMISSIONS (AJOUT PROPRE)
  // =========================

  const deliveredOrders = orders.filter(o => o.status === "Livré")

  const totalCloseuse = deliveredOrders.length * 500

  const directDeliveries = deliveredOrders.filter(
    o => normalizeDeliveryType(o.delivery_type) === "direct"
  ).length

  const gareGroups = new Set(
    deliveredOrders
      .filter(o => normalizeDeliveryType(o.delivery_type) === "gare")
      .map(o => o.delivery_group_id || o.id)
  )

  const totalLivreur = (directDeliveries * 2000) + (gareGroups.size * 2000)

  const chiffreAffaire = deliveredOrders.reduce(
    (sum, o) => sum + Number(o.amount || 0),
    0
  )

  const profit = chiffreAffaire - (totalCloseuse + totalLivreur)

  // =========================

  const initPage = async () => {
    setAuthLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace("/login")
      return
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (!profileData) {
      router.replace("/login")
      return
    }

    setProfile(profileData)

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false })

    setOrders(ordersData || [])
    setAuthLoading(false)
  }

  if (authLoading) {
    return <div style={{ color: "white" }}>Chargement...</div>
  }

  return (
    <main style={{ background: "#0f172a", color: "white", minHeight: "100vh", padding: 20 }}>
      
      <h1>📊 ADMIN PRO</h1>

      {/* 💰 DASHBOARD */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 12,
        marginBottom: 20
      }}>
        <div style={{ background: "#16a34a", padding: 12, borderRadius: 10 }}>
          💰 Closeuse : {totalCloseuse} FCFA
        </div>

        <div style={{ background: "#2563eb", padding: 12, borderRadius: 10 }}>
          🚚 Livreurs : {totalLivreur} FCFA
        </div>

        <div style={{ background: "#22c55e", padding: 12, borderRadius: 10 }}>
          📈 CA : {chiffreAffaire} FCFA
        </div>

        <div style={{ background: "#f59e0b", padding: 12, borderRadius: 10 }}>
          💸 Profit : {profit} FCFA
        </div>
      </div>

      {/* 📦 COMMANDES */}
      {orders.map((o) => (
        <div key={o.id} style={{ background: "#1e293b", padding: 10, marginTop: 10 }}>
          <p>{o.customer_name} - {o.city}</p>
          <p>{o.product} - {o.amount} FCFA</p>
          <p>Status : {o.status}</p>
          <p>Type : {o.delivery_type}</p>
        </div>
      ))}

    </main>
  )
}