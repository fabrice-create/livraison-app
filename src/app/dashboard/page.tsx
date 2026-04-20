"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

type Order = {
  id: number
  status?: string
  logistic_status?: string | null
  payment_status?: string | null
  cash_collected?: boolean | null
  amount?: number | string | null
  is_assigned?: boolean
  delivery_type?: string | null
  delivery_group_id?: string | null
}

type DriverStock = {
  id: number
  driver_name: string
  product_name: string
  quantity: number
}

type Profile = {
  id: string
  role: string
  full_name: string
  email: string
}

export default function DashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [stocks, setStocks] = useState<DriverStock[]>([])

  useEffect(() => {
    void initPage()
  }, [])

  const normalizeRole = (role?: string | null) =>
    String(role || "").trim().toLowerCase()

  const normalizeDeliveryType = (value?: string | null) =>
    String(value || "").trim().toLowerCase()

  const initPage = async () => {
    setLoading(true)

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

    const role = normalizeRole(profileData.role)

    if (role !== "admin") {
      router.replace("/login")
      return
    }

    setProfile(profileData)

    const { data: ordersData } = await supabase.from("orders").select("*")
    const { data: stockData } = await supabase.from("driver_stock").select("*")

    setOrders(ordersData || [])
    setStocks(stockData || [])
    setLoading(false)
  }

  // =========================
  // 💰 COMMISSIONS (AJOUT)
  // =========================

  const deliveredOrders = orders.filter(o => o.status === "Livré")

  const totalCloseuse = deliveredOrders.length * 500

  const direct = deliveredOrders.filter(
    o => normalizeDeliveryType(o.delivery_type) === "direct"
  ).length

  const groups = new Set(
    deliveredOrders
      .filter(o => normalizeDeliveryType(o.delivery_type) === "gare")
      .map(o => o.delivery_group_id || o.id)
  )

  const totalLivreur = (direct * 2000) + (groups.size * 2000)

  const chiffreAffaire = deliveredOrders.reduce(
    (sum, o) => sum + Number(o.amount || 0),
    0
  )

  const profit = chiffreAffaire - (totalCloseuse + totalLivreur)

  // =========================

  const stats = useMemo(() => {
    const totalOrders = orders.length
    const notAssigned = orders.filter((o) => !o.is_assigned).length
    const confirmed = orders.filter((o) => o.status === "Confirmé").length
    const delivered = orders.filter((o) => o.status === "Livré").length

    const totalCollected = orders.filter((o) => o.cash_collected === true).length
    const totalNotCollected = orders.filter((o) => o.cash_collected !== true).length

    const amountCollected = orders
      .filter((o) => o.cash_collected === true)
      .reduce((sum, o) => sum + Number(o.amount || 0), 0)

    const amountNotCollected = orders
      .filter((o) => o.cash_collected !== true)
      .reduce((sum, o) => sum + Number(o.amount || 0), 0)

    const stockByDriver = stocks.reduce((acc: Record<string, number>, item) => {
      if (!acc[item.driver_name]) acc[item.driver_name] = 0
      acc[item.driver_name] += Number(item.quantity || 0)
      return acc
    }, {})

    return {
      totalOrders,
      notAssigned,
      confirmed,
      delivered,
      totalCollected,
      totalNotCollected,
      amountCollected,
      amountNotCollected,
      stockByDriver,
    }
  }, [orders, stocks])

  if (loading) return <div>Chargement...</div>

  return (
    <main style={{ background: "#0f172a", color: "white", minHeight: "100vh", padding: 20 }}>

      <h1>📊 Dashboard Admin</h1>

      {/* 💰 COMMISSIONS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "#16a34a", padding: 12, borderRadius: 10 }}>
          💰 Closeuse : {totalCloseuse}
        </div>

        <div style={{ background: "#2563eb", padding: 12, borderRadius: 10 }}>
          🚚 Livreurs : {totalLivreur}
        </div>

        <div style={{ background: "#22c55e", padding: 12, borderRadius: 10 }}>
          📈 CA : {chiffreAffaire}
        </div>

        <div style={{ background: "#f59e0b", padding: 12, borderRadius: 10 }}>
          💸 Profit : {profit}
        </div>
      </div>

      {/* RESTE DE TON DASHBOARD (INTOUCHÉ) */}
      <div>📦 Total : {stats.totalOrders}</div>
      <div>🚚 Livrées : {stats.delivered}</div>
      <div>💵 Encaissé : {stats.amountCollected}</div>

    </main>
  )
}