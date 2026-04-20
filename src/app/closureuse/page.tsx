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
  const [selectedDrivers, setSelectedDrivers] = useState<Record<number, string>>(
    {}
  )

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

    if (role !== "closureuse") {
      if (role === "admin") {
        router.replace("/admin")
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

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true })

    if (profilesError) {
      console.log("Erreur chargement profils:", profilesError.message)
    }

    const onlyDrivers = ((profilesData || []) as Profile[]).filter(
      (p) => normalizeRole(p.role) === "livreur"
    )
    setDrivers(onlyDrivers)

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false })

    if (ordersError) {
      console.log("Erreur chargement commandes:", ordersError.message)
    }

    const fetchedOrders = (ordersData || []) as Order[]
    setOrders(fetchedOrders)

    const initialSelections: Record<number, string> = {}
    fetchedOrders.forEach((order) => {
      initialSelections[order.id] = order.assigned_driver_id || ""
    })
    setSelectedDrivers(initialSelections)

    const { data: stockData, error: stockError } = await supabase
      .from("driver_stock")
      .select("*")
      .order("driver_name", { ascending: true })

    if (stockError) {
      console.log("Erreur chargement stocks:", stockError.message)
    }

    setDriverStocks((stockData || []) as DriverStock[])

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
    const unpaid = orders.filter((o) => o.payment_status !== "Payé").length
    const paid = orders.filter((o) => o.payment_status === "Payé").length
    const totalStock = driverStocks.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    )

    return {
      totalOrders,
      notAssigned,
      confirmed,
      delivered,
      gare,
      unpaid,
      paid,
      totalStock,
    }
  }, [orders, driverStocks])

  const stockByDriver = useMemo(() => {
    return driverStocks.reduce((acc: Record<string, number>, item) => {
      if (!acc[item.driver_name]) {
        acc[item.driver_name] = 0
      }
      acc[item.driver_name] += Number(item.quantity || 0)
      return acc
    }, {})
  }, [driverStocks])

  const filteredDriverStocks = useMemo(() => {
    if (stockDriverFilter === "Tous") return driverStocks

    return driverStocks.filter(
      (stock) => stock.driver_name === stockDriverFilter
    )
  }, [driverStocks, stockDriverFilter])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)

    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          ...form,
          quantity: Number(form.quantity),
          amount: Number(form.amount),
          delivery_type: normalizeDeliveryType(form.delivery_type),
          status: "En attente",
          logistic_status: "En attente",
          payment_status: "Non payé",
          cash_collected: false,
          cash_collected_at: null,
          cash_collected_by: null,
          is_assigned: false,
          driver_name: null,
          assigned_driver_id: null,
          assigned_at: null,
        },
      ])
      .select()

    if (error) {
      alert("Erreur création commande : " + error.message)
      setSubmitting(false)
      return
    }

    if (data) {
      const newOrders = data as Order[]
      setOrders([...newOrders, ...orders])

      const nextSelections = { ...selectedDrivers }
      newOrders.forEach((o) => {
        nextSelections[o.id] = ""
      })
      setSelectedDrivers(nextSelections)
    }

    setForm({
      customer_name: "",
      phone: "",
      city: "",
      address: "",
      product: "",
      quantity: "1",
      delivery_type: "",
      amount: "",
    })

    alert("Commande créée ✅")
    setSubmitting(false)
  }

  const assignDriver = async (orderId: number) => {
    const driverId = selectedDrivers[orderId]

    if (!driverId) {
      alert("Choisis un livreur.")
      return
    }

    const driver = drivers.find((d) => d.id === driverId)

    if (!driver) {
      alert("Livreur introuvable.")
      return
    }

    const payload = {
      assigned_driver_id: driver.id,
      driver_name: driver.full_name,
      is_assigned: true,
      assigned_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId)

    if (error) {
      alert("Erreur assignation : " + error.message)
      return
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...payload } : o))
    )

    alert("Livreur assigné ✅")
  }

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
            <h1 className="pageTitle">💰 Espace Closureuse</h1>
            <p className="subText">
              Connecté : <b>{profile?.full_name}</b>
            </p>
          </div>

          <button onClick={logout} className="logoutBtn">
            Déconnexion
          </button>
        </div>

        <div className="menuBar">
          <button
            className={`menuBtn ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >
            Tableau de bord
          </button>

          <button
            className={`menuBtn ${activeView === "creer" ? "active" : ""}`}
            onClick={() => setActiveView("creer")}
          >
            Créer commande
          </button>

          <button
            className={`menuBtn ${activeView === "commandes" ? "active" : ""}`}
            onClick={() => setActiveView("commandes")}
          >
            Commandes / Assigner
          </button>

          <button
            className={`menuBtn ${activeView === "stocks" ? "active" : ""}`}
            onClick={() => setActiveView("stocks")}
          >
            Stocks livreurs
          </button>
        </div>

        {activeView === "dashboard" && (
          <section className="panel">
            <h2 className="sectionTitle">Tableau de bord</h2>

            <div className="statsGrid">
              <div className="statCard">
                <span className="statLabel">Total commandes</span>
                <span className="statValue">{stats.totalOrders}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Non assignées</span>
                <span className="statValue">{stats.notAssigned}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Confirmées</span>
                <span className="statValue">{stats.confirmed}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Livrées</span>
                <span className="statValue">{stats.delivered}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Envoyées gare</span>
                <span className="statValue">{stats.gare}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Non payées</span>
                <span className="statValue">{stats.unpaid}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Payées</span>
                <span className="statValue">{stats.paid}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Stock total livreurs</span>
                <span className="statValue">{stats.totalStock}</span>
              </div>
            </div>

            <div className="stockSummaryBlock">
              <h3 className="miniTitle">Stock total par livreur</h3>

              <div className="statsGrid">
                {Object.entries(stockByDriver).length === 0 ? (
                  <div className="statCard">
                    <span className="statLabel">Aucun stock</span>
                    <span className="statValue">0</span>
                  </div>
                ) : (
                  Object.entries(stockByDriver).map(([driver, qty]) => (
                    <div className="statCard" key={driver}>
                      <span className="statLabel">{driver}</span>
                      <span className="statValue">{qty}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeView === "creer" && (
          <section className="panel">
            <h2 className="sectionTitle">Créer une commande</h2>

            <form onSubmit={handleSubmit} className="form">
              <input
                name="customer_name"
                placeholder="Nom client"
                value={form.customer_name}
                onChange={handleChange}
                required
                className="field"
              />

              <input
                name="phone"
                placeholder="Téléphone"
                value={form.phone}
                onChange={handleChange}
                required
                className="field"
              />

              <input
                name="city"
                placeholder="Ville"
                value={form.city}
                onChange={handleChange}
                required
                className="field"
              />

              <input
                name="address"
                placeholder="Adresse"
                value={form.address}
                onChange={handleChange}
                required
                className="field"
              />

              <input
                name="product"
                placeholder="Produit"
                value={form.product}
                onChange={handleChange}
                required
                className="field"
              />

              <input
                name="quantity"
                type="number"
                min="1"
                placeholder="Quantité"
                value={form.quantity}
                onChange={handleChange}
                required
                className="field"
              />

              <input
                name="amount"
                type="number"
                placeholder="Montant"
                value={form.amount}
                onChange={handleChange}
                required
                className="field"
              />

              <select
                name="delivery_type"
                value={form.delivery_type}
                onChange={handleChange}
                required
                className="field"
              >
                <option value="">Choisir type de livraison</option>
                <option value="direct">Direct</option>
                <option value="gare">Gare</option>
              </select>

              <button type="submit" disabled={submitting} className="submitBtn">
                {submitting ? "Création..." : "Créer la commande"}
              </button>
            </form>
          </section>
        )}

        {activeView === "commandes" && (
          <section className="panel">
            <h2 className="sectionTitle">Commandes / Assigner</h2>

            <div className="ordersList">
              {orders.length === 0 ? (
                <p className="emptyText">Aucune commande.</p>
              ) : (
                orders.map((o) => (
                  <article key={o.id} className="orderCard">
                    <p><b>Client :</b> {o.customer_name}</p>
                    <p><b>Téléphone :</b> {o.phone}</p>
                    <p><b>Ville :</b> {o.city}</p>
                    <p><b>Adresse :</b> {o.address}</p>
                    <p><b>Produit :</b> {o.product}</p>
                    <p><b>Quantité :</b> {o.quantity || 1}</p>
                    <p><b>Montant :</b> {formatMoney(o.amount)}</p>
                    <p><b>Livraison :</b> {prettyDeliveryType(o.delivery_type)}</p>
                    <p><b>Livreur :</b> {o.driver_name || "Non assigné"}</p>

                    <div className="badgesWrap">
                      <span
                        className="badge"
                        style={{ background: getBadgeColor(o.status) }}
                      >
                        Global : {o.status || "En attente"}
                      </span>

                      <span
                        className="badge"
                        style={{ background: getBadgeColor(o.logistic_status) }}
                      >
                        Logistique : {o.logistic_status || "En attente"}
                      </span>

                      <span
                        className="badge"
                        style={{ background: getBadgeColor(o.payment_status) }}
                      >
                        Paiement : {o.payment_status || "Non payé"}
                      </span>
                    </div>

                    <div className="assignRow">
                      <select
                        value={selectedDrivers[o.id] || ""}
                        onChange={(e) =>
                          setSelectedDrivers((prev) => ({
                            ...prev,
                            [o.id]: e.target.value,
                          }))
                        }
                        className="field"
                      >
                        <option value="">Choisir un livreur</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.full_name} — {driver.email}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => assignDriver(o.id)}
                        className="submitBtn"
                      >
                        Assigner
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {activeView === "stocks" && (
          <section className="panel">
            <h2 className="sectionTitle">Stocks des livreurs</h2>

            <div className="filterRow">
              <select
                value={stockDriverFilter}
                onChange={(e) => setStockDriverFilter(e.target.value)}
                className="field"
              >
                <option value="Tous">Tous les livreurs</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.full_name}>
                    {driver.full_name}
                  </option>
                ))}
              </select>
            </div>

            {filteredDriverStocks.length === 0 ? (
              <p className="emptyText">Aucun stock enregistré pour ce filtre.</p>
            ) : (
              <div className="ordersList">
                {filteredDriverStocks.map((stock) => (
                  <article key={stock.id} className="orderCard">
                    <p><b>Livreur :</b> {stock.driver_name}</p>
                    <p><b>Produit :</b> {stock.product_name}</p>
                    <p><b>Quantité restante :</b> {stock.quantity}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
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
          max-width: 1200px;
          margin: 0 auto;
        }

        .topBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .pageTitle {
          margin: 0 0 8px 0;
          font-size: 30px;
          line-height: 1.2;
        }

        .subText {
          margin: 0;
          opacity: 0.9;
        }

        .logoutBtn {
          padding: 12px 16px;
          border-radius: 12px;
          border: none;
          background: #dc2626;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }

        .menuBar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .menuBtn {
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #475569;
          background: #1e293b;
          color: white;
          cursor: pointer;
          font-weight: bold;
        }

        .menuBtn.active {
          background: #2563eb;
          border-color: #2563eb;
        }

        .panel {
          background: #1e293b;
          padding: 18px;
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        .sectionTitle {
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 28px;
        }

        .miniTitle {
          margin-top: 24px;
          margin-bottom: 14px;
          font-size: 20px;
        }

        .stockSummaryBlock {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid #475569;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
        }

        .statCard {
          background: #334155;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .statLabel {
          opacity: 0.9;
          font-size: 15px;
        }

        .statValue {
          font-size: 28px;
          font-weight: bold;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 560px;
        }

        .field {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid #475569;
          background: #0f172a;
          color: white;
          font-size: 16px;
          box-sizing: border-box;
          outline: none;
        }

        .submitBtn {
          padding: 14px 16px;
          border-radius: 12px;
          border: none;
          background: #22c55e;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }

        .ordersList {
          display: grid;
          gap: 14px;
        }

        .orderCard {
          background: #334155;
          padding: 16px;
          border-radius: 16px;
        }

        .orderCard p {
          margin: 0 0 8px 0;
          line-height: 1.45;
        }

        .badgesWrap {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
          margin-bottom: 12px;
        }

        .badge {
          display: inline-block;
          padding: 7px 12px;
          border-radius: 999px;
          color: white;
          font-size: 14px;
          font-weight: bold;
        }

        .assignRow {
          display: grid;
          grid-template-columns: 1fr 140px;
          gap: 10px;
          margin-top: 10px;
        }

        .filterRow {
          max-width: 320px;
          margin-bottom: 16px;
        }

        .emptyText {
          opacity: 0.9;
          margin: 0;
        }

        @media (max-width: 980px) {
          .assignRow {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .page {
            padding: 18px 10px;
          }

          .panel {
            padding: 14px;
            border-radius: 14px;
          }

          .pageTitle {
            font-size: 24px;
          }

          .sectionTitle {
            font-size: 22px;
          }

          .menuBar {
            display: grid;
            grid-template-columns: 1fr;
          }

          .menuBtn,
          .logoutBtn,
          .submitBtn {
            width: 100%;
          }
        }
      `}</style>
    </main>
  )
}