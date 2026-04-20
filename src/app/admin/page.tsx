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
  phone?: string | null
}

type DriverStock = {
  id: number
  driver_id: string
  driver_name: string
  product_name: string
  quantity: number
}

type OrderHistory = {
  id: number
  created_at: string
  order_id: number
  action_type: string
  action_by_user_id: string
  action_by_name: string
  action_details: string
}

export default function AdminPage() {
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [driverStocks, setDriverStocks] = useState<DriverStock[]>([])
  const [history, setHistory] = useState<OrderHistory[]>([])
  const [selectedDrivers, setSelectedDrivers] = useState<Record<number, string>>(
    {}
  )
  const [selectedActions, setSelectedActions] = useState<Record<number, string>>(
    {}
  )

  const [loading, setLoading] = useState(false)
  const [stockLoading, setStockLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState("Tous")
  const [search, setSearch] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)

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

  const [stockForm, setStockForm] = useState({
    driver_id: "",
    product_name: "",
    quantity: "1",
  })

  useEffect(() => {
    void initPage()
  }, [])

  const normalizeRole = (role?: string | null) =>
    (role || "").trim().toLowerCase()

  const normalizeDeliveryType = (value?: string | null) => {
    const cleaned = (value || "").trim().toLowerCase()
    if (cleaned === "direct") return "direct"
    if (cleaned === "gare") return "gare"
    return cleaned
  }

  const prettyDeliveryType = (value?: string | null) => {
    const normalized = normalizeDeliveryType(value)
    if (normalized === "direct") return "Direct"
    if (normalized === "gare") return "Gare"
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Confirmé":
        return "#2563eb"
      case "Livré":
        return "#16a34a"
      case "Annulé":
        return "#dc2626"
      default:
        return "#f59e0b"
    }
  }

  const getLogisticColor = (status?: string | null) => {
    switch (status) {
      case "Livré":
        return "#16a34a"
      case "Envoyé à la gare":
        return "#7c3aed"
      case "Confirmé":
        return "#2563eb"
      default:
        return "#f59e0b"
    }
  }

  const getPaymentColor = (status?: string | null) => {
    switch (status) {
      case "Payé":
        return "#16a34a"
      default:
        return "#dc2626"
    }
  }

  const getCashColor = (collected?: boolean | null) => {
    return collected ? "#16a34a" : "#dc2626"
  }

  const getCashLabel = (collected?: boolean | null) => {
    return collected ? "Encaissé" : "Non encaissé"
  }

  const sanitizePhoneForWhatsapp = (phone?: string | null) => {
    return String(phone || "").replace(/[^\d]/g, "")
  }

  const getDriverPhone = (driverId?: string | null) => {
    if (!driverId) return ""
    const driver = drivers.find((d) => d.id === driverId)
    return sanitizePhoneForWhatsapp(driver?.phone || null)
  }

  const buildWhatsappUrl = (phone: string, message: string) => {
    const cleanPhone = sanitizePhoneForWhatsapp(phone)
    if (!cleanPhone) return "#"
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  const getClientWhatsappMessage = (order: Order) => {
    return `Bonjour ${order.customer_name},

Nous vous contactons concernant votre commande.

Produit : ${order.product}
Quantité : ${order.quantity || 1}
Montant : ${formatMoney(order.amount)}
Ville : ${order.city}
Livraison : ${prettyDeliveryType(order.delivery_type)}

Merci de confirmer votre disponibilité afin que nous puissions lancer ou poursuivre la livraison.`
  }

  const getDriverWhatsappMessage = (order: Order) => {
    return `Bonjour,

Nouvelle commande assignée.

Client : ${order.customer_name}
Téléphone : ${order.phone}
Ville : ${order.city}
Adresse : ${order.address}
Produit : ${order.product}
Quantité : ${order.quantity || 1}
Montant : ${formatMoney(order.amount)}
Livraison : ${prettyDeliveryType(order.delivery_type)}

Merci de prendre cela en charge.`
  }

  const addHistory = async (
    orderId: number,
    actionType: string,
    details: string
  ) => {
    if (!profile) return

    const payload = {
      order_id: orderId,
      action_type: actionType,
      action_by_user_id: profile.id,
      action_by_name: profile.full_name,
      action_details: details,
    }

    const { data, error } = await supabase
      .from("order_history")
      .insert([payload])
      .select()

    if (!error && data) {
      setHistory((prev) => [...(data as OrderHistory[]), ...prev])
    }
  }

  const initPage = async () => {
    setAuthLoading(true)

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

    if (role !== "admin") {
      if (role === "closureuse") router.replace("/closureuse")
      else if (role === "livreur") router.replace("/livreur")
      else router.replace("/login")
      return
    }

    setProfile(currentProfile)

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true })

    if (profilesData) {
      const onlyDrivers = (profilesData as Profile[]).filter(
        (p) => normalizeRole(p.role) === "livreur"
      )
      setDrivers(onlyDrivers)
    }

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false })

    const fetchedOrders = (ordersData as Order[]) || []
    setOrders(fetchedOrders)

    const initialSelections: Record<number, string> = {}
    const initialActions: Record<number, string> = {}

    fetchedOrders.forEach((order) => {
      initialSelections[order.id] = order.assigned_driver_id || ""
      initialActions[order.id] = ""
    })

    setSelectedDrivers(initialSelections)
    setSelectedActions(initialActions)

    const { data: stockData } = await supabase
      .from("driver_stock")
      .select("*")
      .order("id", { ascending: false })

    setDriverStocks((stockData as DriverStock[]) || [])

    const { data: historyData } = await supabase
      .from("order_history")
      .select("*")
      .order("created_at", { ascending: false })

    setHistory((historyData as OrderHistory[]) || [])

    setAuthLoading(false)
  }

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "Tous"
          ? true
          : (order.status || "En attente") === statusFilter

      const q = search.trim().toLowerCase()

      const matchesSearch =
        q === ""
          ? true
          : [
              order.customer_name,
              order.phone,
              order.city,
              order.driver_name || "",
              order.product,
              order.logistic_status || "",
              order.payment_status || "",
              order.delivery_type || "",
              String(order.amount || ""),
              String(order.quantity || ""),
            ]
              .join(" ")
              .toLowerCase()
              .includes(q)

      return matchesStatus && matchesSearch
    })
  }, [orders, statusFilter, search])

  const getOrderHistory = (orderId: number) => {
    return history.filter((item) => item.order_id === orderId)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleStockChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setStockForm({
      ...stockForm,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const normalizedDeliveryType = normalizeDeliveryType(form.delivery_type)

    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          ...form,
          quantity: Number(form.quantity),
          delivery_type: normalizedDeliveryType,
          amount: Number(form.amount),
          cash_collected: false,
          cash_collected_at: null,
          cash_collected_by: null,
          status: "En attente",
          logistic_status: "En attente",
          payment_status: "Non payé",
          driver_name: null,
          assigned_driver_id: null,
          is_assigned: false,
          assigned_at: null,
        },
      ])
      .select()

    if (error) {
      alert("Erreur lors de l'envoi : " + error.message)
    } else if (data) {
      const newOrders = data as Order[]
      setOrders([...newOrders, ...orders])

      const nextSelections = { ...selectedDrivers }
      const nextActions = { ...selectedActions }

      newOrders.forEach((order) => {
        nextSelections[order.id] = ""
        nextActions[order.id] = ""
      })

      setSelectedDrivers(nextSelections)
      setSelectedActions(nextActions)

      const createdOrder = newOrders[0]
      if (createdOrder) {
        await addHistory(
          createdOrder.id,
          "commande_creee",
          `Commande créée pour ${createdOrder.customer_name} - ${createdOrder.product}`
        )
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
    }

    setLoading(false)
  }

  const handleAddStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStockLoading(true)

    const driver = drivers.find((d) => d.id === stockForm.driver_id)

    if (!driver) {
      alert("Choisis un livreur.")
      setStockLoading(false)
      return
    }

    const productName = stockForm.product_name.trim()
    const quantityToAdd = Number(stockForm.quantity)

    if (!productName || quantityToAdd <= 0) {
      alert("Produit ou quantité invalide.")
      setStockLoading(false)
      return
    }

    const existing = driverStocks.find(
      (item) =>
        item.driver_id === driver.id &&
        item.product_name.trim().toLowerCase() === productName.toLowerCase()
    )

    if (existing) {
      const newQty = Number(existing.quantity) + quantityToAdd

      const { error } = await supabase
        .from("driver_stock")
        .update({ quantity: newQty })
        .eq("id", existing.id)

      if (error) {
        alert("Erreur stock : " + error.message)
        setStockLoading(false)
        return
      }

      setDriverStocks((prev) =>
        prev.map((item) =>
          item.id === existing.id ? { ...item, quantity: newQty } : item
        )
      )
    } else {
      const { data, error } = await supabase
        .from("driver_stock")
        .insert([
          {
            driver_id: driver.id,
            driver_name: driver.full_name,
            product_name: productName,
            quantity: quantityToAdd,
          },
        ])
        .select()

      if (error) {
        alert("Erreur stock : " + error.message)
        setStockLoading(false)
        return
      }

      if (data) {
        setDriverStocks([...(data as DriverStock[]), ...driverStocks])
      }
    }

    setStockForm({
      driver_id: "",
      product_name: "",
      quantity: "1",
    })

    alert("Stock ajouté ✅")
    setStockLoading(false)
  }

  const updateStatus = async (id: number, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id)

    if (error) {
      alert("Erreur mise à jour : " + error.message)
      return false
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: newStatus } : order
      )
    )

    await addHistory(id, "statut_modifie", `Statut changé en ${newStatus}`)
    return true
  }

  const updatePaymentAndCash = async (
    id: number,
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
      .eq("id", id)

    if (error) {
      alert("Erreur paiement : " + error.message)
      return false
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, ...payload } : order
      )
    )

    await addHistory(
      id,
      "paiement_modifie",
      `Paiement changé en ${newPaymentStatus}`
    )
    return true
  }

  const consumeDriverStock = async (order: Order) => {
    const driverId = order.assigned_driver_id
    const productName = (order.product || "").trim()
    const qtyToRemove = Number(order.quantity || 1)

    if (!driverId || !productName || qtyToRemove <= 0) {
      alert("Commande incomplète pour décrémenter le stock.")
      return false
    }

    const stockItem = driverStocks.find(
      (item) =>
        item.driver_id === driverId &&
        item.product_name.trim().toLowerCase() === productName.toLowerCase()
    )

    if (!stockItem) {
      alert("Aucun stock trouvé pour ce livreur et ce produit.")
      return false
    }

    if (Number(stockItem.quantity) < qtyToRemove) {
      alert("Stock insuffisant chez ce livreur.")
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

    setDriverStocks((prev) =>
      prev.map((item) =>
        item.id === stockItem.id ? { ...item, quantity: newQty } : item
      )
    )

    return true
  }

  const markDirectDeliveredAndPaid = async (order: Order) => {
    const stockOk = await consumeDriverStock(order)
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
      alert("Erreur livraison directe : " + error.message)
      return false
    }

    setOrders((prev) =>
      prev.map((item) =>
        item.id === order.id ? { ...item, ...payload } : item
      )
    )

    await addHistory(
      order.id,
      "livraison_payee",
      "Commande marquée Livré + Payé"
    )
    return true
  }

  const markSentToGare = async (order: Order) => {
    const stockOk = await consumeDriverStock(order)
    if (!stockOk) return false

    const { error } = await supabase
      .from("orders")
      .update({ logistic_status: "Envoyé à la gare" })
      .eq("id", order.id)

    if (error) {
      alert("Erreur logistique : " + error.message)
      return false
    }

    setOrders((prev) =>
      prev.map((item) =>
        item.id === order.id
          ? { ...item, logistic_status: "Envoyé à la gare" }
          : item
      )
    )

    await addHistory(
      order.id,
      "envoye_gare",
      "Commande marquée Envoyé à la gare"
    )
    return true
  }

  const handleDriverSelect = (orderId: number, driverId: string) => {
    setSelectedDrivers((prev) => ({
      ...prev,
      [orderId]: driverId,
    }))
  }

  const handleActionSelect = (orderId: number, action: string) => {
    setSelectedActions((prev) => ({
      ...prev,
      [orderId]: action,
    }))
  }

  const assignDriver = async (orderId: number) => {
    const driverId = selectedDrivers[orderId]

    if (!driverId) {
      alert("Choisis d'abord un livreur.")
      return false
    }

    const driver = drivers.find((d) => d.id === driverId)

    if (!driver) {
      alert("Livreur introuvable.")
      return false
    }

    const payload = {
      driver_name: driver.full_name,
      assigned_driver_id: driver.id,
      is_assigned: true,
      assigned_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId)

    if (error) {
      alert("Erreur assignation livreur : " + error.message)
      return false
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, ...payload } : order
      )
    )

    await addHistory(
      orderId,
      "livreur_assigne",
      `Livreur assigné : ${driver.full_name}`
    )
    return true
  }

  const applyOrderAction = async (order: Order) => {
    const action = selectedActions[order.id]

    if (!action) {
      alert("Choisis une action.")
      return
    }

    if (action === "confirmer") {
      const ok = await updateStatus(order.id, "Confirmé")
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
      const ok = await updateStatus(order.id, "Annulé")
      if (ok) alert("Commande annulée ✅")
    }

    if (action === "assigner_livreur") {
      const ok = await assignDriver(order.id)
      if (ok) alert("Livreur assigné ✅")
    }

    setSelectedActions((prev) => ({
      ...prev,
      [order.id]: "",
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

    actions.push({
      value: "assigner_livreur",
      label: "Assigner un livreur",
    })

    return actions
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0f172a",
          color: "white",
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
            <h1 className="pageTitle">🛒 Espace Admin</h1>
            <p className="subText">
              Connecté : <b>{profile?.full_name}</b> — rôle : <b>{profile?.role}</b>
            </p>
          </div>

          <div className="topActions">
            <a href="/dashboard" className="linkBtn">
              Dashboard
            </a>
            <button onClick={handleLogout} className="logoutBtn">
              Déconnexion
            </button>
          </div>
        </div>

        <div className="layout">
          <section className="panel">
            <h2 className="sectionTitle">Nouvelle commande</h2>

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
                placeholder="Montant de la commande"
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

              <button
                type="submit"
                disabled={loading}
                className={`submitBtn ${loading ? "isLoading" : ""}`}
              >
                {loading ? "Envoi..." : "Créer la commande"}
              </button>
            </form>

            <div className="stockBlock">
              <h2 className="sectionTitle" style={{ marginTop: "24px" }}>
                Ajouter du stock à un livreur
              </h2>

              <form onSubmit={handleAddStock} className="form">
                <select
                  name="driver_id"
                  value={stockForm.driver_id}
                  onChange={handleStockChange}
                  required
                  className="field"
                >
                  <option value="">Choisir un livreur</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name} — {driver.email}
                    </option>
                  ))}
                </select>

                <input
                  name="product_name"
                  placeholder="Nom du produit"
                  value={stockForm.product_name}
                  onChange={handleStockChange}
                  required
                  className="field"
                />
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  placeholder="Quantité à donner"
                  value={stockForm.quantity}
                  onChange={handleStockChange}
                  required
                  className="field"
                />

                <button
                  type="submit"
                  disabled={stockLoading}
                  className={`submitBtn ${stockLoading ? "isLoading" : ""}`}
                >
                  {stockLoading ? "Ajout..." : "Ajouter le stock"}
                </button>
              </form>
            </div>
          </section>

          <section className="panel">
            <h2 className="sectionTitle">📦 Commandes</h2>

            <div className="filters">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="field"
              >
                <option>Tous</option>
                <option>En attente</option>
                <option>Confirmé</option>
                <option>Livré</option>
                <option>Annulé</option>
              </select>

              <input
                type="text"
                placeholder="Recherche nom, téléphone, ville, livreur, produit"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field"
              />
            </div>

            <p className="countText">
              {visibleOrders.length} commande(s) trouvée(s)
            </p>

            {visibleOrders.length === 0 ? (
              <p className="emptyText">Aucune commande correspondante.</p>
            ) : (
              <div className="ordersList">
                {visibleOrders.map((order) => {
                  const clientWhatsappUrl = buildWhatsappUrl(
                    order.phone,
                    getClientWhatsappMessage(order)
                  )

                  const driverWhatsappUrl = buildWhatsappUrl(
                    getDriverPhone(order.assigned_driver_id),
                    getDriverWhatsappMessage(order)
                  )

                  const driverHasPhone = !!getDriverPhone(order.assigned_driver_id)

                  return (
                    <article key={order.id} className="orderCard">
                      <p><b>Nom :</b> {order.customer_name}</p>
                      <p><b>Téléphone :</b> {order.phone}</p>
                      <p><b>Ville :</b> {order.city}</p>
                      <p><b>Adresse :</b> {order.address}</p>
                      <p><b>Produit :</b> {order.product}</p>
                      <p><b>Quantité :</b> {order.quantity || 1}</p>
                      <p><b>Montant :</b> {formatMoney(order.amount)}</p>
                      <p><b>Livraison :</b> {prettyDeliveryType(order.delivery_type)}</p>
                      <p><b>Livreur :</b> {order.driver_name || "Non assigné"}</p>
                      <p><b>Assignée :</b> {order.is_assigned ? "Oui" : "Non"}</p>

                      <div className="badgesWrap">
                        <div
                          className="statusBadge"
                          style={{ background: getStatusColor(order.status) }}
                        >
                          Global : {order.status || "En attente"}
                        </div>
                        <div
                          className="statusBadge"
                          style={{ background: getLogisticColor(order.logistic_status) }}
                        >
                          Logistique : {order.logistic_status || "En attente"}
                        </div>
                        <div
                          className="statusBadge"
                          style={{ background: getPaymentColor(order.payment_status) }}
                        >
                          Paiement : {order.payment_status || "Non payé"}
                        </div>
                        <div
                          className="statusBadge"
                          style={{ background: getCashColor(order.cash_collected) }}
                        >
                          Argent : {getCashLabel(order.cash_collected)}
                        </div>
                      </div>

                      <div className="whatsappRow">
                        <a
                          href={clientWhatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="waBtn"
                        >
                          WhatsApp client
                        </a>

                        {driverHasPhone ? (
                          <a
                            href={driverWhatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="waBtn secondary"
                          >
                            WhatsApp livreur
                          </a>
                        ) : (
                          <button type="button" className="waBtn disabled" disabled>
                            Pas de numéro livreur
                          </button>
                        )}
                      </div>

                      <div className="cleanActionsBox">
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

                        <select
                          value={selectedDrivers[order.id] || ""}
                          onChange={(e) =>
                            handleDriverSelect(order.id, e.target.value)
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
                          onClick={() => applyOrderAction(order)}
                          className="applyBtn"
                        >
                          Appliquer
                        </button>
                      </div>

                      <div className="historyBlock">
                        <h3 className="historyTitle">Historique</h3>

                        {getOrderHistory(order.id).length === 0 ? (
                          <p className="historyEmpty">
                            Aucune action enregistrée.
                          </p>
                        ) : (
                          <div className="historyList">
                            {getOrderHistory(order.id).map((item) => (
                              <div key={item.id} className="historyItem">
                                <p>
                                  <b>{item.action_by_name}</b> — {item.action_type}
                                </p>
                                <p>{item.action_details}</p>
                                <p className="historyDate">
                                  {new Date(item.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            <div className="stockBlock">
              <h2 className="sectionTitle" style={{ marginTop: "24px" }}>
                📦 Stock livreurs
              </h2>

              {driverStocks.length === 0 ? (
                <p className="emptyText">Aucun stock enregistré.</p>
              ) : (
                <div className="ordersList">
                  {driverStocks.map((stock) => (
                    <article key={stock.id} className="orderCard">
                      <p><b>Livreur :</b> {stock.driver_name}</p>
                      <p><b>Produit :</b> {stock.product_name}</p>
                      <p><b>Quantité restante :</b> {stock.quantity}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
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
          max-width: 1250px;
          margin: 0 auto;
        }

        .topBar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
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

        .layout {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 24px;
        }

        .panel {
          background: #1e293b;
          padding: 18px;
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        .sectionTitle {
          margin-top: 0;
          margin-bottom: 14px;
          font-size: 28px;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stockBlock {
          border-top: 1px solid #475569;
          margin-top: 24px;
          padding-top: 24px;
        }

        .field {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid #475569;
          background: #0f172a;
          color: white;
          outline: none;
          font-size: 16px;
          box-sizing: border-box;
        }

        .submitBtn {
          padding: 15px;
          border-radius: 12px;
          border: none;
          background: #22c55e;
          color: white;
          font-weight: bold;
          cursor: pointer;
          margin-top: 6px;
          font-size: 18px;
        }

        .submitBtn.isLoading {
          background: #64748b;
          cursor: not-allowed;
        }

        .filters {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }

        .countText,
        .emptyText {
          opacity: 0.9;
          margin-top: 0;
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
          font-size: 16px;
          line-height: 1.45;
        }

        .badgesWrap {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin: 6px 0 14px 0;
        }

        .statusBadge {
          display: inline-block;
          padding: 7px 13px;
          border-radius: 999px;
          color: white;
          font-weight: bold;
          font-size: 14px;
        }

        .whatsappRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }

        .waBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 14px;
          border-radius: 12px;
          text-decoration: none;
          border: none;
          background: #16a34a;
          color: white;
          font-weight: bold;
          cursor: pointer;
          text-align: center;
        }

        .waBtn.secondary {
          background: #0ea5e9;
        }

        .waBtn.disabled {
          background: #64748b;
          cursor: not-allowed;
        }

        .cleanActionsBox {
          display: grid;
          grid-template-columns: 1fr 1fr 150px;
          gap: 10px;
          align-items: center;
          margin-top: 10px;
        }

        .applyBtn {
          padding: 14px 16px;
          border-radius: 12px;
          border: none;
          background: #7c3aed;
          color: white;
          font-weight: bold;
          cursor: pointer;
          font-size: 16px;
        }

        .historyBlock {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #475569;
        }

        .historyTitle {
          margin: 0 0 10px 0;
          font-size: 18px;
        }

        .historyEmpty {
          opacity: 0.85;
          margin: 0;
        }

        .historyList {
          display: grid;
          gap: 10px;
        }

        .historyItem {
          background: #1e293b;
          border-radius: 12px;
          padding: 12px;
        }

        .historyItem p {
          margin: 0 0 6px 0;
          font-size: 14px;
          line-height: 1.4;
        }

        .historyDate {
          opacity: 0.75;
          font-size: 13px;
        }

        @media (max-width: 980px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .cleanActionsBox,
          .whatsappRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}