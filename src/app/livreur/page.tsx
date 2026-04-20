"use client"

import { useEffect, useState } from "react"
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
  // 💰 GAINS PRO (SUPABASE)
  // ========================

  const delivered = orders.filter(o => o.status === "Livré")

  const totalGain = delivered.reduce(
    (sum, o) => sum + (o.driver_commission || 0),
    0
  )

  const totalOrders = orders.length
  const pending = orders.filter(o => o.status === "En attente").length
  const confirmed = orders.filter(o => o.status === "Confirmé").length
  const deliveredCount = delivered.length

  if (loading) return <div style={{ color: "white" }}>Chargement...</div>

  return (
    <div style={{ padding: 20, background: "#0f172a", color: "white", minHeight: "100vh" }}>

      <h1>🚚 Espace Livreur PRO</h1>

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
        <p><b>{totalGain} FCFA</b></p>
      </div>

      {/* COMMANDES */}
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

          <p style={{ color: "#22c55e" }}>
            💰 Gain : {o.driver_commission || 0} FCFA
          </p>
        </div>
      ))}

    </div>
  )
}