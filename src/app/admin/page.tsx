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
  // GLOBAL
  // ======================
  const totalCloseuse = delivered.length * 500

  const direct = delivered.filter(o => o.delivery_type === "direct").length

  const groups = new Set(
    delivered
      .filter(o => o.delivery_type === "gare")
      .map(o => o.delivery_group_id)
  )

  const totalLivreur = (direct * 2000) + (groups.size * 2000)

  const chiffreAffaire = delivered.reduce(
    (sum, o) => sum + Number(o.amount || 0),
    0
  )

  // ======================
  // PAR LIVREUR
  // ======================
  const gainsParLivreur: any = {}

  delivered.forEach(o => {
    if (!o.driver_name) return

    if (!gainsParLivreur[o.driver_name]) {
      gainsParLivreur[o.driver_name] = {
        direct: 0,
        groups: new Set()
      }
    }

    if (o.delivery_type === "direct") {
      gainsParLivreur[o.driver_name].direct++
    }

    if (o.delivery_type === "gare" && o.delivery_group_id) {
      gainsParLivreur[o.driver_name].groups.add(o.delivery_group_id)
    }
  })

  const gainsLivreurFinal = Object.entries(gainsParLivreur).map(([name, data]: any) => ({
    name,
    gain: (data.direct * 2000) + (data.groups.size * 2000)
  }))

  // ======================
  // PAR JOUR
  // ======================
  const gainsParJour: any = {}

  delivered.forEach(o => {
    const date = new Date(o.created_at).toLocaleDateString()

    if (!gainsParJour[date]) {
      gainsParJour[date] = 0
    }

    gainsParJour[date] += Number(o.amount || 0)
  })

  if (loading) return <div>Chargement...</div>

  return (
    <div style={{ padding: 20, background: "#0f172a", color: "white", minHeight: "100vh" }}>

      <h1>📊 ADMIN FINAL DASHBOARD</h1>

      {/* GLOBAL */}
      <div style={{ marginBottom: 30 }}>
        <h2>💰 Résumé global</h2>
        <p>Closeuse : {totalCloseuse} FCFA</p>
        <p>Livreurs : {totalLivreur} FCFA</p>
        <p>Chiffre d’affaire : {chiffreAffaire} FCFA</p>
        <p>Profit : {chiffreAffaire - (totalCloseuse + totalLivreur)} FCFA</p>
      </div>

      {/* PAR LIVREUR */}
      <div style={{ marginBottom: 30 }}>
        <h2>🚚 Gains par livreur</h2>

        {gainsLivreurFinal.map((l: any, i: number) => (
          <p key={i}>
            {l.name} : {l.gain} FCFA
          </p>
        ))}
      </div>

      {/* PAR JOUR */}
      <div style={{ marginBottom: 30 }}>
        <h2>📅 Chiffre par jour</h2>

        {Object.entries(gainsParJour).map(([date, total]: any) => (
          <p key={date}>
            {date} : {total} FCFA
          </p>
        ))}
      </div>

    </div>
  )
}