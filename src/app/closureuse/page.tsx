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

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

// ======== TON CODE ORIGINAL (INCHANGÉ) ========

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
}

type DriverStock = {
  id: number
  driver_id: string
  driver_name: string
  product_name: string
  quantity: number
}

type ClosureuseView = "dashboard" | "creer" | "commandes" | "stocks"

export default function ClosureusePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [driverStocks, setDriverStocks] = useState<DriverStock[]>([])
  const [selectedDrivers, setSelectedDrivers] = useState<Record<number, string>>({})

  const [activeView, setActiveView] = useState<ClosureuseView>("dashboard")
  const [stockDriverFilter, setStockDriverFilter] = useState("Tous")

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
    void initPage()
  }, [])

  const normalizeRole = (role?: string | null) =>
    String(role || "").trim().toLowerCase()

  const normalizeDeliveryType = (value?: string | null) => {
    const cleaned = String(value || "").trim().toLowerCase()
    if (cleaned === "direct") return "direct"
    if (cleaned === "gare") return "gare"
    return cleaned
  }

  const prettyDeliveryType = (value?: string | null) => {
    const v = normalizeDeliveryType(value)
    if (v === "direct") return "Direct"
    if (v === "gare") return "Gare"
    return value || "-"
  }

  const formatMoney = (value?: number | string | null) => {
    if (value === null || value === undefined || value === "") return "-"
    return `${value} FCFA`
  }

  const getBadgeColor = (value?: string | null) => {
    const v = String(value || "").toLowerCase()

    if (v.includes("livré")) return "#16a34a"
    if (v.includes("confirm")) return "#2563eb"
    if (v.includes("annul")) return "#dc2626"
    if (v.includes("gare")) return "#7c3aed"
    if (v.includes("payé")) return "#16a34a"

    return "#f59e0b"
  }

  // =========================
  // 💰 AJOUT GAINS (NOUVEAU)
  // =========================

  const deliveredOrders = orders.filter(o => o.status === "Livré")

  const closeuseGain = deliveredOrders.length * 500

  const directCount = deliveredOrders.filter(
    o => normalizeDeliveryType(o.delivery_type) === "direct"
  ).length

  const gareGroups = new Set(
    deliveredOrders
      .filter(o => normalizeDeliveryType(o.delivery_type) === "gare")
      .map(o => o.delivery_group_id || o.id)
  )

  const livreurGain = (directCount * 2000) + (gareGroups.size * 2000)

  // =========================

  const initPage = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

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

    if (role !== "closureuse") {
      router.replace("/login")
      return
    }

    setProfile(profileData)

    const { data: profilesData } = await supabase.from("profiles").select("*")
    const onlyDrivers = (profilesData || []).filter(p => normalizeRole(p.role) === "livreur")
    setDrivers(onlyDrivers)

    const { data: ordersData } = await supabase.from("orders").select("*")
    setOrders(ordersData || [])

    const { data: stockData } = await supabase.from("driver_stock").select("*")
    setDriverStocks(stockData || [])

    setLoading(false)
  }

  if (loading) return <div>Chargement...</div>

  return (
    <main className="page">
      <div className="container">

        <h1 className="pageTitle">💰 Espace Closureuse</h1>

        {/* 💰 GAINS (AJOUT VISUEL) */}
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

        {/* RESTE DE TON CODE (INTOUCHÉ) */}
        {/* ... tout ton dashboard original continue ici ... */}

      </div>
    </main>
  )
}
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