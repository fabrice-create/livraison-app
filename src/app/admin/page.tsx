"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function AdminPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false })

    setOrders(data || [])
    setLoading(false)
  }

  const delivered = orders.filter(o => o.status === "Livré")

  // ======================
  // 💰 GLOBAL PRO
  // ======================

  const totalCloseuse = delivered.reduce(
    (sum, o) => sum + (o.closer_commission || 0),
    0
  )

  const totalLivreur = delivered.reduce(
    (sum, o) => sum + (o.driver_commission || 0),
    0
  )

  const chiffreAffaire = delivered.reduce(
    (sum, o) => sum + Number(o.amount || 0),
    0
  )

  const profit = chiffreAffaire - (totalCloseuse + totalLivreur)

  // ======================
  // 🚚 PAR LIVREUR PRO
  // ======================

  const gainsParLivreur: any = {}

  delivered.forEach(o => {
    if (!o.driver_name) return

    if (!gainsParLivreur[o.driver_name]) {
      gainsParLivreur[o.driver_name] = 0
    }

    gainsParLivreur[o.driver_name] += (o.driver_commission || 0)
  })

  const gainsLivreurFinal = Object.entries(gainsParLivreur).map(
    ([name, gain]: any) => ({
      name,
      gain,
    })
  )

  // ======================
  // 📅 PAR JOUR
  // ======================

  const gainsParJour: any = {}

  delivered.forEach(o => {
    const date = new Date(o.created_at).toLocaleDateString()

    if (!gainsParJour[date]) {
      gainsParJour[date] = 0
    }

    gainsParJour[date] += Number(o.amount || 0)
  })

  if (loading) return <div style={{ color: "white" }}>Chargement...</div>

  return (
    <div style={{ padding: 20, background: "#0f172a", color: "white", minHeight: "100vh" }}>

      <h1>📊 ADMIN PRO DASHBOARD</h1>

      {/* GLOBAL */}
      <div style={{ marginBottom: 30, background: "#1e293b", padding: 20, borderRadius: 10 }}>
        <h2>💰 Résumé global</h2>
        <p>Closeuse : <b>{totalCloseuse} FCFA</b></p>
        <p>Livreurs : <b>{totalLivreur} FCFA</b></p>
        <p>Chiffre d’affaire : <b>{chiffreAffaire} FCFA</b></p>
        <p style={{ color: "#22c55e" }}>
          Profit : <b>{profit} FCFA</b>
        </p>
      </div>

      {/* PAR LIVREUR */}
      <div style={{ marginBottom: 30, background: "#1e293b", padding: 20, borderRadius: 10 }}>
        <h2>🚚 Gains par livreur</h2>

        {gainsLivreurFinal.map((l: any, i: number) => (
          <p key={i}>
            {l.name} : <b>{l.gain} FCFA</b>
          </p>
        ))}
      </div>

      {/* PAR JOUR */}
      <div style={{ marginBottom: 30, background: "#1e293b", padding: 20, borderRadius: 10 }}>
        <h2>📅 Chiffre par jour</h2>

        {Object.entries(gainsParJour).map(([date, total]: any) => (
          <p key={date}>
            {date} : <b>{total} FCFA</b>
          </p>
        ))}
      </div>

    </div>
  )
}