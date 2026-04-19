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
  quantity?: number | null
  amount?: number | string | null
  status?: string
  logistic_status?: string | null
  payment_status?: string | null
  cash_collected?: boolean | null
  cash_collected_at?: string | null
  cash_collected_by?: string | null
  assigned_driver_id?: string | null
  driver_name?: string | null
  delivery_type?: string | null
}

type DriverStock = {
  id: number
  driver_id: string
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

type LivreurView = "dashboard" | "commandes" | "stock"

export default function LivreurPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [stocks, setStocks] = useState<DriverStock[]>([])
  const [activeView, setActiveView] = useState<LivreurView>("dashboard")
  const [selectedActions, setSelectedActions] = useState<Record<number, string>>(
    {}
  )

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

  const isDirect = (value?: string | null) =>
    normalizeDeliveryType(value) === "direct"

  const isGare = (value?: string | null) =>
    normalizeDeliveryType(value) === "gare"

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

    if (role !== "livreur") {
      if (role === "admin") {
        router.replace("/admin")
        return
      }

      if (role === "closureuse") {
        router.replace("/closureuse")
        return
      }

      router.replace("/login")
      return
    }

    setProfile(currentProfile)

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("assigned_driver_id", user.id)
      .order("id", { ascending: false })

    if (ordersError) {
      console.log("Erreur commandes livreur:", ordersError.message)
    }

    const { data: stockData, error: stockError } = await supabase
      .from("driver_stock")
      .select("*")
      .eq("driver_id", user.id)
      .order("id", { ascending: false })

    if (stockError) {
      console.log("Erreur stock livreur:", stockError.message)
    }

    const fetchedOrders = (ordersData || []) as Order[]
    setOrders(fetchedOrders)
    setStocks((stockData || []) as DriverStock[])

    const initialActions: Record<number, string> = {}
    fetchedOrders.forEach((order) => {
      initialActions[order.id] = ""
    })
    setSelectedActions(initialActions)

    setLoading(false)
  }

  const stats = useMemo(() => {
    const totalOrders = orders.length
    const pendingOrders = orders.filter(
      (o) => (o.status || "En attente") === "En attente"
    ).length
    const confirmedOrders = orders.filter(
      (o) => (o.status || "") === "Confirmé"
    ).length
    const deliveredOrders = orders.filter(
      (o) => (o.status || "") === "Livré"
    ).length
    const gareOrders = orders.filter(
      (o) => (o.logistic_status || "") === "Envoyé à la gare"
    ).length

    const totalStock = stocks.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    )

    const totalAmount = orders.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    )

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      gareOrders,
      totalStock,
      totalAmount,
    }
  }, [orders, stocks])

  const consumeOwnStock = async (order: Order) => {
    const driverId = order.assigned_driver_id
    const productName = (order.product || "").trim()
    const qtyToRemove = Number(order.quantity || 1)

    if (!driverId || !productName || qtyToRemove <= 0) {
      alert("Commande incomplète pour décrémenter le stock.")
      return false
    }

    const stockItem = stocks.find(
      (item) =>
        item.driver_id === driverId &&
        item.product_name.trim().toLowerCase() === productName.toLowerCase()
    )

    if (!stockItem) {
      alert("Aucun stock trouvé pour ce produit.")
      return false
    }

    if (Number(stockItem.quantity) < qtyToRemove) {
      alert("Stock insuffisant.")
      return false
    }

    const newQty = Number(stockItem.quantity) - qtyToRemove

    const { error } = await supabase
      .from("driver_stock")
      .update({ quantity: newQty })
      .eq("id", stockItem.id)

    if (error) {
      alert("Erreur décrément stock : " + error.message)
      return false
    }

    setStocks((prev) =>
      prev.map((item) =>
        item.id === stockItem.id ? { ...item, quantity: newQty } : item
      )
    )

    return true
  }

  const updateStatusOnly = async (orderId: number, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)

    if (error) {
      alert("Erreur statut : " + error.message)
      return false
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )

    return true
  }

  const updatePaymentAndCash = async (
    orderId: number,
    newPaymentStatus: string,
    collected: boolean
  ) => {
    const payload = {
      payment_status: newPaymentStatus,
      cash_collected: collected,
      cash_collected_at: collected ? new Date().toISOString() : null,
      cash_collected_by: collected ? profile?.full_name || null : null,
    }

    const { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId)

    if (error) {
      alert("Erreur paiement : " + error.message)
      return false
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...payload } : o))
    )

    return true
  }

  const markDirectDeliveredAndPaid = async (order: Order) => {
    const stockOk = await consumeOwnStock(order)
    if (!stockOk) return false

    const payload = {
      status: "Livré",
      logistic_status: "Livré",
      payment_status: "Payé",
      cash_collected: true,
      cash_collected_at: new Date().toISOString(),
      cash_collected_by: profile?.full_name || null,
    }

    const { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", order.id)

    if (error) {
      alert("Erreur livraison : " + error.message)
      return false
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, ...payload } : o))
    )

    return true
  }

  const markSentToGare = async (order: Order) => {
    const stockOk = await consumeOwnStock(order)
    if (!stockOk) return false

    const payload = {
      logistic_status: "Envoyé à la gare",
    }

    const { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", order.id)

    if (error) {
      alert("Erreur gare : " + error.message)
      return false
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, ...payload } : o))
    )

    return true
  }

  const handleActionSelect = (orderId: number, action: string) => {
    setSelectedActions((prev) => ({
      ...prev,
      [orderId]: action,
    }))
  }

  const getAvailableActions = (order: Order) => {
    const actions = [
      { value: "", label: "Choisir une action" },
      { value: "confirmer", label: "Confirmer" },
      { value: "annuler", label: "Annuler" },
    ]

    if (isDirect(order.delivery_type)) {
      actions.push({
        value: "livre_paye_direct",
        label: "Livré + Payé",
      })
    }

    if (isGare(order.delivery_type)) {
      actions.push({
        value: "envoye_gare",
        label: "Envoyé à la gare",
      })
      actions.push({
        value: "marquer_paye",
        label: "Marquer Payé",
      })
    }

    return actions
  }

  const applyOrderAction = async (order: Order) => {
    const action = selectedActions[order.id]

    if (!action) {
      alert("Choisis une action.")
      return
    }

    if (action === "confirmer") {
      const ok = await updateStatusOnly(order.id, "Confirmé")
      if (ok) alert("Commande confirmée ✅")
    }

    if (action === "livre_paye_direct") {
      const ok = await markDirectDeliveredAndPaid(order)
      if (ok) alert("Commande livrée et payée ✅")
    }

    if (action === "envoye_gare") {
      const ok = await markSentToGare(order)
      if (ok) alert("Commande envoyée à la gare ✅")
    }

    if (action === "marquer_paye") {
      const ok = await updatePaymentAndCash(order.id, "Payé", true)
      if (ok) alert("Paiement marqué comme payé ✅")
    }

    if (action === "annuler") {
      const ok = await updateStatusOnly(order.id, "Annulé")
      if (ok) alert("Commande annulée ✅")
    }

    setSelectedActions((prev) => ({
      ...prev,
      [order.id]: "",
    }))
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
            <h1 className="pageTitle">🚚 Espace Livreur</h1>
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
            className={`menuBtn ${activeView === "commandes" ? "active" : ""}`}
            onClick={() => setActiveView("commandes")}
          >
            Mes commandes
          </button>

          <button
            className={`menuBtn ${activeView === "stock" ? "active" : ""}`}
            onClick={() => setActiveView("stock")}
          >
            Mon stock
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
                <span className="statLabel">En attente</span>
                <span className="statValue">{stats.pendingOrders}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Confirmées</span>
                <span className="statValue">{stats.confirmedOrders}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Livrées</span>
                <span className="statValue">{stats.deliveredOrders}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Envoyées gare</span>
                <span className="statValue">{stats.gareOrders}</span>
              </div>

              <div className="statCard">
                <span className="statLabel">Stock total</span>
                <span className="statValue">{stats.totalStock}</span>
              </div>

              <div className="statCard wide">
                <span className="statLabel">Montant total de mes commandes</span>
                <span className="statValue">{formatMoney(stats.totalAmount)}</span>
              </div>
            </div>
          </section>
        )}

        {activeView === "commandes" && (
          <section className="panel">
            <h2 className="sectionTitle">Mes commandes</h2>

            {orders.length === 0 ? (
              <p className="emptyText">Aucune commande assignée.</p>
            ) : (
              <div className="cardsGrid">
                {orders.map((order) => (
                  <article key={order.id} className="card">
                    <p><b>Client :</b> {order.customer_name}</p>
                    <p><b>Téléphone :</b> {order.phone}</p>
                    <p><b>Ville :</b> {order.city}</p>
                    <p><b>Adresse :</b> {order.address}</p>
                    <p><b>Produit :</b> {order.product}</p>
                    <p><b>Quantité :</b> {order.quantity || 1}</p>
                    <p><b>Montant :</b> {formatMoney(order.amount)}</p>
                    <p><b>Livraison :</b> {prettyDeliveryType(order.delivery_type)}</p>

                    <div className="badgesWrap">
                      <span
                        className="badge"
                        style={{ background: getBadgeColor(order.status) }}
                      >
                        Global : {order.status || "En attente"}
                      </span>

                      <span
                        className="badge"
                        style={{ background: getBadgeColor(order.logistic_status) }}
                      >
                        Logistique : {order.logistic_status || "En attente"}
                      </span>

                      <span
                        className="badge"
                        style={{ background: getBadgeColor(order.payment_status) }}
                      >
                        Paiement : {order.payment_status || "Non payé"}
                      </span>
                    </div>

                    <div className="actionRow">
                      <select
                        value={selectedActions[order.id] || ""}
                        onChange={(e) =>
                          handleActionSelect(order.id, e.target.value)
                        }
                        className="field"
                      >
                        {getAvailableActions(order).map((action) => (
                          <option key={action.value} value={action.value}>
                            {action.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => applyOrderAction(order)}
                        className="submitBtn"
                      >
                        Appliquer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeView === "stock" && (
          <section className="panel">
            <h2 className="sectionTitle">Mon stock</h2>

            {stocks.length === 0 ? (
              <p className="emptyText">Aucun stock disponible.</p>
            ) : (
              <div className="cardsGrid">
                {stocks.map((stock) => (
                  <article key={stock.id} className="card">
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

        .statCard.wide {
          grid-column: span 2;
        }

        .statLabel {
          opacity: 0.9;
          font-size: 15px;
        }

        .statValue {
          font-size: 28px;
          font-weight: bold;
        }

        .cardsGrid {
          display: grid;
          gap: 14px;
        }

        .card {
          background: #334155;
          border-radius: 16px;
          padding: 16px;
        }

        .card p {
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

        .actionRow {
          display: grid;
          grid-template-columns: 1fr 140px;
          gap: 10px;
          margin-top: 10px;
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

        .emptyText {
          opacity: 0.9;
          margin: 0;
        }

        @media (max-width: 980px) {
          .actionRow {
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

          .statCard.wide {
            grid-column: span 1;
          }
        }
      `}</style>
    </main>
  )
}