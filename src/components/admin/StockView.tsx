"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"

const S = {
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", info: "#60A5FA", warning: "#FB923C",
}

interface StockItem {
  id: string
  driver_id: string
  driver_name: string
  product_name: string
  quantity: number
}

interface StockMouvement {
  id: string
  type: string
  product_name: string
  quantity: number
  from_driver?: string
  to_driver?: string
  created_at: string
}

interface Driver {
  id: string
  full_name: string
}

const SEUIL_BAS = 3

export default function StockView({ tenantId: propTenantId }: { tenantId: string }) {
  const [tenantId, setTenantId] = useState(propTenantId)
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [mouvements, setMouvements] = useState<StockMouvement[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"stock" | "transfert" | "historique">("stock")
  const [addForm, setAddForm] = useState({ driver_id: "", product_name: "", quantity: "" })
  const [adding, setAdding] = useState(false)
  const [transferForm, setTransferForm] = useState({ from_driver_id: "", to_driver_id: "", product_name: "", quantity: "" })
  const [transferring, setTransferring] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  // Charger tenantId depuis supabase si pas fourni
  useEffect(() => {
    if (tenantId) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.tenant_id) setTenantId(data.tenant_id)
        })
    })
  }, [])

  useEffect(() => {
    if (tenantId) loadAll()
  }, [tenantId])

  const loadAll = async () => {
    setLoading(true)
    // Charger livreurs
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("role", "livreur")
    setDrivers((profiles || []) as Driver[])

    // Charger stocks — essayer driver_stocks puis driver_stock
    let stockData: Record<string, unknown>[] = []
    const { data: sd1 } = await supabase
      .from("driver_stocks")
      .select("id, driver_id, product_name, quantity, profiles(full_name)")
      .eq("tenant_id", tenantId)
      .order("quantity", { ascending: true })
    
    if (sd1 && sd1.length > 0) {
      stockData = sd1
    } else {
      // Essayer l'ancienne table
      const { data: sd2 } = await supabase
        .from("driver_stock")
        .select("id, driver_id, driver_name, product_name, quantity")
        .order("quantity", { ascending: true })
      stockData = sd2 || []
    }

    const formatted = stockData.map((s) => ({
      id: String(s.id),
      driver_id: String(s.driver_id),
      driver_name: (s.profiles as Record<string, unknown>)?.full_name as string || String(s.driver_name || "?"),
      product_name: String(s.product_name),
      quantity: Number(s.quantity),
    }))
    setStocks(formatted)

    // Charger historique mouvements
    const { data: mvts } = await supabase
      .from("stock_mouvements")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50)
    setMouvements(mvts || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!addForm.driver_id || !addForm.product_name || !addForm.quantity) {
      setError("Tous les champs sont requis"); return
    }
    setError(""); setAdding(true)
    const existing = stocks.find(s => s.driver_id === addForm.driver_id && s.product_name === addForm.product_name)
    if (existing) {
      await supabase.from("driver_stocks").update({ quantity: existing.quantity + Number(addForm.quantity) }).eq("id", existing.id)
    } else {
      await supabase.from("driver_stocks").insert({
        tenant_id: tenantId, driver_id: addForm.driver_id,
        product_name: addForm.product_name, quantity: Number(addForm.quantity),
      })
    }
    const driver = drivers.find(d => d.id === addForm.driver_id)
    await supabase.from("stock_mouvements").insert({
      tenant_id: tenantId, type: "ajout",
      product_name: addForm.product_name, quantity: Number(addForm.quantity),
      to_driver: driver?.full_name, note: "Ajout depuis entrepôt",
    })
    setAdding(false)
    setAddForm({ driver_id: "", product_name: "", quantity: "" })
    setSuccess("Stock ajouté ✓")
    setTimeout(() => setSuccess(""), 3000)
    loadAll()
  }

  const handleTransfer = async () => {
    if (!transferForm.from_driver_id || !transferForm.to_driver_id || !transferForm.product_name || !transferForm.quantity) {
      setError("Tous les champs sont requis"); return
    }
    if (transferForm.from_driver_id === transferForm.to_driver_id) {
      setError("Les deux livreurs doivent être différents"); return
    }
    const qty = Number(transferForm.quantity)
    const fromStock = stocks.find(s => s.driver_id === transferForm.from_driver_id && s.product_name === transferForm.product_name)
    if (!fromStock || fromStock.quantity < qty) {
      setError(`Stock insuffisant. ${fromStock ? fromStock.quantity : 0} unité(s) disponible(s)`); return
    }
    setError(""); setTransferring(true)
    await supabase.from("driver_stocks").update({ quantity: fromStock.quantity - qty }).eq("id", fromStock.id)
    const toStock = stocks.find(s => s.driver_id === transferForm.to_driver_id && s.product_name === transferForm.product_name)
    if (toStock) {
      await supabase.from("driver_stocks").update({ quantity: toStock.quantity + qty }).eq("id", toStock.id)
    } else {
      await supabase.from("driver_stocks").insert({
        tenant_id: tenantId, driver_id: transferForm.to_driver_id,
        product_name: transferForm.product_name, quantity: qty,
      })
    }
    const fromDriver = drivers.find(d => d.id === transferForm.from_driver_id)
    const toDriver = drivers.find(d => d.id === transferForm.to_driver_id)
    await supabase.from("stock_mouvements").insert({
      tenant_id: tenantId, type: "transfert",
      product_name: transferForm.product_name, quantity: qty,
      from_driver: fromDriver?.full_name, to_driver: toDriver?.full_name,
    })
    setTransferring(false)
    setTransferForm({ from_driver_id: "", to_driver_id: "", product_name: "", quantity: "" })
    setSuccess("Transfert effectué ✓")
    setTimeout(() => setSuccess(""), 3000)
    loadAll()
  }

  const stockBas = stocks.filter(s => s.quantity <= SEUIL_BAS)
  const totalStock = stocks.reduce((s, i) => s + i.quantity, 0)
  const produits = [...new Set(stocks.map(s => s.product_name))]

  const inp = {
    width: "100%", background: S.bg, border: `1px solid ${S.border}`,
    borderRadius: 8, padding: "10px 12px", color: S.text, fontSize: 13,
    outline: "none", boxSizing: "border-box" as const,
  }

  return (
    <div style={{ padding: "0 0 60px 0", fontFamily: "Inter, sans-serif" }}>
      <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: "0 0 4px 0" }}>Gestion du stock</h2>
      <p style={{ color: S.text3, fontSize: 13, margin: "0 0 16px 0" }}>{totalStock} unités en circulation</p>

      {/* Alertes stock bas */}
      {stockBas.length > 0 && (
        <div style={{ background: S.dangerBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
          <p style={{ color: S.danger, fontSize: 13, fontWeight: 700, margin: "0 0 6px 0" }}>⚠️ Stock bas</p>
          {stockBas.map(s => (
            <p key={s.id} style={{ color: S.text2, fontSize: 12, margin: "2px 0" }}>
              • {s.driver_name} — {s.product_name} : <strong style={{ color: S.danger }}>{s.quantity}</strong> unité(s)
            </p>
          ))}
        </div>
      )}

      {success && <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: S.success, fontSize: 13 }}>{success}</div>}
      {error && <div style={{ background: S.dangerBg, borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: S.danger, fontSize: 13 }}>⚠️ {error}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${S.border}` }}>
        {[["stock","📦 Stock"], ["transfert","🔄 Transfert"], ["historique","📋 Historique"]].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as "stock" | "transfert" | "historique")}
            style={{ padding: "10px 16px", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "transparent", color: activeTab === tab ? S.gold : S.text3,
              borderBottom: activeTab === tab ? `2px solid ${S.gold}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: S.text3, textAlign: "center", padding: "40px 0" }}>Chargement...</p>
      ) : (
        <>
          {/* STOCK */}
          {activeTab === "stock" && (
            <>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <p style={{ color: S.text, fontSize: 14, fontWeight: 700, margin: "0 0 12px 0" }}>➕ Ajouter stock</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <select value={addForm.driver_id} onChange={e => setAddForm(p => ({ ...p, driver_id: e.target.value }))}
                    style={{ ...inp, appearance: "none" as const }}>
                    <option value="">Choisir un livreur</option>
                    {drivers.map(d => <option key={d.id} value={d.id} style={{ background: S.card }}>{d.full_name}</option>)}
                  </select>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input value={addForm.product_name} onChange={e => setAddForm(p => ({ ...p, product_name: e.target.value }))}
                      placeholder="Produit" style={inp}
                      onFocus={e => e.target.style.borderColor = S.gold}
                      onBlur={e => e.target.style.borderColor = S.border} />
                    <input type="number" min="1" value={addForm.quantity} onChange={e => setAddForm(p => ({ ...p, quantity: e.target.value }))}
                      placeholder="Quantité" style={inp}
                      onFocus={e => e.target.style.borderColor = S.gold}
                      onBlur={e => e.target.style.borderColor = S.border} />
                  </div>
                  <button onClick={handleAdd} disabled={adding}
                    style={{ background: adding ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 10, padding: "12px", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    {adding ? "Ajout..." : "➕ Ajouter"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stocks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                    <p style={{ color: S.text3 }}>Aucun stock.</p>
                  </div>
                ) : stocks.map(s => (
                  <div key={s.id} style={{ background: S.card, border: `1px solid ${s.quantity <= SEUIL_BAS ? "rgba(248,113,113,0.3)" : S.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ color: S.text, fontSize: 14, fontWeight: 600, margin: "0 0 2px 0" }}>{s.driver_name}</p>
                      <p style={{ color: S.text3, fontSize: 12, margin: 0 }}>{s.product_name}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ color: s.quantity <= SEUIL_BAS ? S.danger : S.success, fontSize: 22, fontWeight: 800, margin: "0 0 2px 0" }}>{s.quantity}</p>
                      <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>{s.quantity <= SEUIL_BAS ? "⚠️ Stock bas" : "unités"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TRANSFERT */}
          {activeTab === "transfert" && (
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16 }}>
              <p style={{ color: S.text, fontSize: 14, fontWeight: 700, margin: "0 0 14px 0" }}>🔄 Transférer entre livreurs</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <select value={transferForm.from_driver_id} onChange={e => setTransferForm(p => ({ ...p, from_driver_id: e.target.value }))}
                  style={{ ...inp, appearance: "none" as const }}>
                  <option value="">De (livreur source)</option>
                  {drivers.map(d => <option key={d.id} value={d.id} style={{ background: S.card }}>{d.full_name}</option>)}
                </select>
                <select value={transferForm.to_driver_id} onChange={e => setTransferForm(p => ({ ...p, to_driver_id: e.target.value }))}
                  style={{ ...inp, appearance: "none" as const }}>
                  <option value="">Vers (livreur destination)</option>
                  {drivers.map(d => <option key={d.id} value={d.id} style={{ background: S.card }}>{d.full_name}</option>)}
                </select>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <select value={transferForm.product_name} onChange={e => setTransferForm(p => ({ ...p, product_name: e.target.value }))}
                    style={{ ...inp, appearance: "none" as const }}>
                    <option value="">Produit</option>
                    {produits.map(p => <option key={p} value={p} style={{ background: S.card }}>{p}</option>)}
                  </select>
                  <input type="number" min="1" value={transferForm.quantity} onChange={e => setTransferForm(p => ({ ...p, quantity: e.target.value }))}
                    placeholder="Quantité" style={inp}
                    onFocus={e => e.target.style.borderColor = S.gold}
                    onBlur={e => e.target.style.borderColor = S.border} />
                </div>
                <button onClick={handleTransfer} disabled={transferring}
                  style={{ background: transferring ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 10, padding: "12px", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  {transferring ? "Transfert..." : "🔄 Transférer"}
                </button>
              </div>
            </div>
          )}

          {/* HISTORIQUE */}
          {activeTab === "historique" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mouvements.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                  <p style={{ color: S.text3 }}>Aucun mouvement.</p>
                </div>
              ) : mouvements.map(m => (
                <div key={m.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{m.type === "ajout" ? "➕" : "🔄"}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: "0 0 2px 0" }}>
                      {m.type === "transfert" ? `${m.from_driver} → ${m.to_driver}` : m.to_driver}
                    </p>
                    <p style={{ color: S.text3, fontSize: 12, margin: 0 }}>{m.product_name}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: m.type === "ajout" ? S.success : S.info, fontSize: 16, fontWeight: 800, margin: "0 0 2px 0" }}>
                      {m.type === "ajout" ? "+" : ""}{m.quantity}
                    </p>
                    <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>
                      {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
