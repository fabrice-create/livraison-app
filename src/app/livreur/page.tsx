"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

export default function LivreurPage() {
  const router = useRouter()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    setProfile(profile)

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("assigned_driver_id", user.id)
      .order("id", { ascending: false })

    setOrders(orders || [])
    setLoading(false)
  }

  // ========================
  // 💰 GAINS LIVREUR
  // ========================

  const delivered = orders.filter(o => o.status === "Livré")

  const direct = delivered.filter(o => o.delivery_type === "direct").length

  const groups = new Set(
    delivered
      .filter(o => o.delivery_type === "gare")
      .map(o => o.delivery_group_id)
  )

  const totalGain = (direct * 2000) + (groups.size * 2000)

  if (loading) return <div style={{ color: "white" }}>Chargement...</div>

  return (
    <div style={{ padding: 20, background: "#0f172a", color: "white", minHeight: "100vh" }}>

      <h1>🚚 Espace Livreur</h1>

      {/* 💰 GAINS */}
      <div style={{ marginBottom: 20 }}>
        <h2>Mes gains</h2>
        <p>{totalGain} FCFA</p>
      </div>

      <h2>Mes commandes</h2>

      {orders.map((o) => (
        <div key={o.id} style={{ background: "#1e293b", padding: 10, marginTop: 10 }}>
          <p><b>Client :</b> {o.customer_name}</p>
          <p><b>Ville :</b> {o.city}</p>
          <p><b>Produit :</b> {o.product}</p>
          <p><b>Montant :</b> {o.amount} FCFA</p>
          <p><b>Status :</b> {o.status}</p>
          <p><b>Type :</b> {o.delivery_type}</p>
          <p><b>Groupe :</b> {o.delivery_group_id || "Aucun"}</p>
        </div>
      ))}

    </div>
  )
}