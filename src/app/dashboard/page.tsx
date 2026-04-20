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
    initPage()
  }, [])

  const normalizeRole = (role?: string | null) =>
    String(role || "").trim().toLowerCase()

  const normalizeType = (t?: string | null) =>
    String(t || "").trim().toLowerCase()

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

    if (!profileData || normalizeRole(profileData.role) !== "admin") {
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
  // 💰 AJOUT GAINS
  // =========================

  const deliveredOrders = orders.filter(o => o.status === "Livré")

  const closeuseGain = deliveredOrders.length * 500

  const directCount = deliveredOrders.filter(
    o => normalizeType(o.delivery_type) === "direct"
  ).length

  const gareGroups = new Set(
    deliveredOrders
      .filter(o => normalizeType(o.delivery_type) === "gare")
      .map(o => o.delivery_group_id || o.id)
  )

  const livreurGain = (directCount * 2000) + (gareGroups.size * 2000)

  const chiffreAffaire = deliveredOrders.reduce(
    (sum, o) => sum + Number(o.amount || 0),
    0
  )

  const profit = chiffreAffaire - (closeuseGain + livreurGain)

  // =========================

  const stats = useMemo(() => {
    const totalOrders = orders.length
    const notAssigned = orders.filter((o) => !o.is_assigned).length
    const confirmed = orders.filter((o) => o.status === "Confirmé").length
    const delivered = orders.filter((o) => o.status === "Livré").length
    const gare = orders.filter(
      (o) => o.logistic_status === "Envoyé à la gare"
    ).length

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
      gare,
      totalCollected,
      totalNotCollected,
      amountCollected,
      amountNotCollected,
      stockByDriver,
    }
  }, [orders, stocks])

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (loading) return <div style={{ color: "white" }}>Chargement...</div>

  return (
    <main className="page">
      <div className="container">

        <h1>📊 Dashboard Admin</h1>

        {/* 💰 GAINS */}
        <div className="grid">
          <div className="card green">💰 Closeuse : {closeuseGain} FCFA</div>
          <div className="card">🚚 Livreurs : {livreurGain} FCFA</div>
          <div className="card green">📈 CA : {chiffreAffaire} FCFA</div>
          <div className="card red">💸 Profit : {profit} FCFA</div>
        </div>

        <h2>📦 Commandes</h2>
        <div className="grid">
          <div className="card">Total : {stats.totalOrders}</div>
          <div className="card">Non assignées : {stats.notAssigned}</div>
          <div className="card">Confirmées : {stats.confirmed}</div>
          <div className="card">Livrées : {stats.delivered}</div>
        </div>

      </div>
    </main>
  )
}