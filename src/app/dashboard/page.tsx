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

  const initPage = async () => {
    setLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      router.replace("/login")
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError || !profileData) {
      router.replace("/login")
      return
    }

    const currentProfile = profileData as Profile
    const role = normalizeRole(currentProfile.role)

    // ✅ Seul admin voit le dashboard global
    if (role !== "admin") {
      if (role === "closureuse") {
        router.replace("/closureuse")
        return
      }

      if (role === "livreur") {
        router.replace("/livreur")
        return
      }

      router.replace("/login")
      return
    }

    setProfile(currentProfile)

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")

    if (ordersError) {
      console.log("Erreur orders:", ordersError.message)
    }

    const { data: stockData, error: stockError } = await supabase
      .from("driver_stock")
      .select("*")

    if (stockError) {
      console.log("Erreur stock:", stockError.message)
    }

    setOrders((ordersData || []) as Order[])
    setStocks((stockData || []) as DriverStock[])
    setLoading(false)
  }

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
      if (!acc[item.driver_name]) {
        acc[item.driver_name] = 0
      }
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

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0f172a",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Chargement...
      </div>
    )
  }

  return (
    <main className="page">
      <div className="container">
        <div className="topBar">
          <div>
            <h1 className="pageTitle">📊 Dashboard Admin</h1>
            <p className="subText">
              Connecté : <b>{profile?.full_name}</b>
            </p>
          </div>

          <div className="topActions">
            <a href="/admin" className="linkBtn">
              Retour admin
            </a>
            <button onClick={logout} className="logoutBtn">
              Déconnexion
            </button>
          </div>
        </div>

        <h2 className="sectionLabel">📦 Commandes</h2>
        <div className="grid">
          <div className="card">📦 Total : {stats.totalOrders}</div>
          <div className="card">❌ Non assignées : {stats.notAssigned}</div>
          <div className="card">✅ Confirmées : {stats.confirmed}</div>
          <div className="card">🚚 Livrées : {stats.delivered}</div>
          <div className="card">🏢 Gare : {stats.gare}</div>
        </div>

        <h2 className="sectionLabel">💰 Argent</h2>
        <div className="grid">
          <div className="card green">💵 Encaissé : {stats.totalCollected}</div>
          <div className="card red">💸 Non encaissé : {stats.totalNotCollected}</div>
          <div className="card green">
            💰 Montant encaissé : {stats.amountCollected} FCFA
          </div>
          <div className="card red">
            💰 Non encaissé : {stats.amountNotCollected} FCFA
          </div>
        </div>

        <h2 className="sectionLabel">📦 Stock par livreur</h2>
        <div className="grid">
          {Object.entries(stats.stockByDriver).length === 0 ? (
            <div className="card">Aucun stock enregistré</div>
          ) : (
            Object.entries(stats.stockByDriver).map(([driver, qty]) => (
              <div className="card" key={driver}>
                {driver} : {qty}
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #0f172a;
          color: white;
          padding: 28px 14px;
          font-family: Arial, sans-serif;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .topBar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .pageTitle {
          margin: 0 0 8px 0;
          font-size: 40px;
          line-height: 1.2;
        }

        .subText {
          margin: 0;
          opacity: 0.9;
        }

        .topActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .linkBtn,
        .logoutBtn {
          padding: 12px 16px;
          border-radius: 12px;
          border: none;
          text-decoration: none;
          color: white;
          font-weight: bold;
          cursor: pointer;
          display: inline-block;
        }

        .linkBtn {
          background: #2563eb;
        }

        .logoutBtn {
          background: #dc2626;
        }

        .sectionLabel {
          margin-top: 26px;
          margin-bottom: 14px;
          font-size: 18px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        .card {
          background: #1e293b;
          padding: 24px;
          border-radius: 16px;
          font-size: 18px;
          font-weight: bold;
        }

        .green {
          background: #16a34a;
        }

        .red {
          background: #dc2626;
        }

        @media (max-width: 640px) {
          .page {
            padding: 18px 10px;
          }

          .pageTitle {
            font-size: 28px;
          }

          .topActions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .linkBtn,
          .logoutBtn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  )
}