"use client"

// ============================================================
// SHIPIVO — Admin : StockView complet
// Onglets : Entrepôt | Demandes | Transferts | Historique
// ============================================================

import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"
import { toast } from "@/components/ui/Toast"
import type { Profile, DriverStock, StockFormData } from "@/types"
import { inputStyle } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────

type WarehouseStock = {
  id: string
  tenant_id: string
  product_name: string
  quantity: number
  alert_threshold: number
  created_at?: string
  updated_at?: string
}

type Demande = {
  id: number
  driver_id: string
  driver_name: string
  product_name: string
  quantity_requested: number
  status: string
  note?: string | null
  created_at: string
}

type Mouvement = {
  id: number
  created_at: string
  product_name: string
  type: string
  quantity: number
  from_driver: string
  to_driver: string
  note?: string | null
}

type Props = {
  drivers: Profile[]
  driverStocks: DriverStock[]
  warehouseStocks?: WarehouseStock[]
  stockForm: StockFormData
  stockLoading: boolean
  tenantId?: string | null
  onStockChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onStockSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onRefresh?: () => void
}

// ─── Helpers ─────────────────────────────────────────────────

const S = {
  gold:   "#F59E0B", card: "#111118", border: "#1E1E2E",
  text:   "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  green:  "#4ADE80", greenBg: "#052E16",
  red:    "#F87171", redBg: "#2D0F0F",
  blue:   "#60A5FA", blueBg: "#0C1E3E",
  purple: "#C084FC", purpleBg: "#2E1065",
}

const fmtDate = (d?: string) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  : "-"

// ─── Composant ───────────────────────────────────────────────

export default function StockView({
  drivers, driverStocks, warehouseStocks = [], stockForm, stockLoading, tenantId,
  onStockChange, onStockSubmit, onRefresh,
}: Props) {

  const [tab,        setTab]        = useState<"entrepot" | "demandes" | "transferts" | "historique">("entrepot")
  const [wProduct,   setWProduct]   = useState("")
  const [wQty,       setWQty]       = useState("1")
  const [wLoading,   setWLoading]   = useState(false)
  const [wEditId,    setWEditId]    = useState<string | null>(null)
  const [wEditQty,   setWEditQty]   = useState(0)
  const [wSaving,    setWSaving]    = useState(false)
  const [localWH,    setLocalWH]    = useState<WarehouseStock[]>(warehouseStocks)
  const [demandes,   setDemandes]   = useState<Demande[]>([])
  const [mouvements, setMouvements] = useState<Mouvement[]>([])
  const [loadingD,   setLoadingD]   = useState(false)
  const [loadingM,   setLoadingM]   = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editQty,    setEditQty]    = useState(0)
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Transfert admin
  const [tFromId,    setTFromId]    = useState("")
  const [tToId,      setTToId]      = useState("")
  const [tProduct,   setTProduct]   = useState("")
  const [tQty,       setTQty]       = useState("1")
  const [tLoading,   setTLoading]   = useState(false)

  // ── Chargement ──
  // Sync local warehouse state
  useState(() => { setLocalWH(warehouseStocks) })

  const loadDemandes = async () => {
    if (!tenantId) return
    setLoadingD(true)
    const { data } = await supabase.from("stock_demandes")
      .select("*").eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }).limit(50)
    setDemandes((data as Demande[]) || [])
    setLoadingD(false)
  }

  const loadMouvements = async () => {
    if (!tenantId) return
    setLoadingM(true)
    const { data } = await supabase.from("stock_mouvements")
      .select("*").eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }).limit(100)
    setMouvements((data as Mouvement[]) || [])
    setLoadingM(false)
  }

  useEffect(() => {
    if (tab === "demandes")   void loadDemandes()
    if (tab === "historique") void loadMouvements()
  }, [tab, tenantId])

  // ── Modifier quantité ──
  const startEdit = (s: DriverStock) => { setEditingId(String(s.id)); setEditQty(Number(s.quantity)) }
  const cancelEdit = () => setEditingId(null)
  const saveEdit = async (id: string | number) => {
    setSaving(true)
    await supabase.from("driver_stock").update({ quantity: editQty }).eq("id", String(id))
    // Enregistrer mouvement
    const s = driverStocks.find(x => String(x.id) === String(id))
    if (s && tenantId) {
      await supabase.from("stock_mouvements").insert([{
        tenant_id: tenantId, product_name: s.product_name,
        type: "modification_admin", quantity: editQty,
        from_driver: "Admin", to_driver: s.driver_name || "Livreur",
      }])
    }
    setSaving(false); setEditingId(null)
    if (onRefresh) onRefresh()
    toast("Stock modifié ✅", "success")
  }

  // ── Supprimer ──
  const deleteStock = async (id: string | number) => {
    if (!confirm("Supprimer ce stock ?")) return
    setDeletingId(String(id))
    await supabase.from("driver_stock").delete().eq("id", String(id))
    setDeletingId(null)
    if (onRefresh) onRefresh()
    toast("Stock supprimé", "info")
  }

  // ── Approuver demande ──
  const approuverDemande = async (d: Demande) => {
    const driver = drivers.find(x => x.id === d.driver_id)
    if (!driver) return
    const existing = driverStocks.find(s => s.driver_id === d.driver_id && s.product_name.toLowerCase() === d.product_name.toLowerCase())
    if (existing) {
      await supabase.from("driver_stock").update({ quantity: Number(existing.quantity) + d.quantity_requested }).eq("id", existing.id)
    } else {
      await supabase.from("driver_stock").insert([{
        driver_id: d.driver_id, driver_name: driver.full_name,
        product_name: d.product_name, quantity: d.quantity_requested,
        tenant_id: tenantId,
      }])
    }
    await supabase.from("stock_demandes").update({ status: "approuvee" }).eq("id", d.id)
    if (tenantId) {
      await supabase.from("stock_mouvements").insert([{
        tenant_id: tenantId, product_name: d.product_name,
        type: "approbation_admin", quantity: d.quantity_requested,
        from_driver: "Admin", to_driver: driver.full_name,
      }])
    }
    toast(`✅ ${d.quantity_requested}× ${d.product_name} approuvé pour ${driver.full_name}`, "success")
    if (onRefresh) onRefresh()
    void loadDemandes()
  }

  const refuserDemande = async (d: Demande) => {
    await supabase.from("stock_demandes").update({ status: "refusee" }).eq("id", d.id)
    toast("Demande refusée", "error")
    void loadDemandes()
  }

  // ── Transfert admin ──
  const handleTransfert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tFromId || !tToId || !tProduct || tFromId === tToId) return
    setTLoading(true)
    const qty = Number(tQty)
    const fromStock = driverStocks.find(s => s.driver_id === tFromId && s.product_name.toLowerCase() === tProduct.toLowerCase())
    if (!fromStock || Number(fromStock.quantity) < qty) {
      toast(`Stock insuffisant. Disponible : ${fromStock?.quantity || 0}`, "error")
      setTLoading(false); return
    }
    await supabase.from("driver_stock").update({ quantity: Number(fromStock.quantity) - qty }).eq("id", fromStock.id)
    const toStock = driverStocks.find(s => s.driver_id === tToId && s.product_name.toLowerCase() === tProduct.toLowerCase())
    const fromDriver = drivers.find(d => d.id === tFromId)
    const toDriver   = drivers.find(d => d.id === tToId)
    if (toStock) {
      await supabase.from("driver_stock").update({ quantity: Number(toStock.quantity) + qty }).eq("id", toStock.id)
    } else {
      await supabase.from("driver_stock").insert([{
        driver_id: tToId, driver_name: toDriver?.full_name,
        product_name: tProduct, quantity: qty, tenant_id: tenantId,
      }])
    }
    if (tenantId) {
      await supabase.from("stock_mouvements").insert([{
        tenant_id: tenantId, product_name: tProduct,
        type: "transfert_admin", quantity: qty,
        from_driver: fromDriver?.full_name || "?", to_driver: toDriver?.full_name || "?",
      }])
    }
    toast(`✅ ${qty}× ${tProduct} transféré de ${fromDriver?.full_name} à ${toDriver?.full_name}`, "success")
    setTFromId(""); setTToId(""); setTProduct(""); setTQty("1")
    setTLoading(false)
    if (onRefresh) onRefresh()
  }

  // ── Entrepôt : ajouter produit ──
  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId || !wProduct.trim()) return
    setWLoading(true)
    const qty = Number(wQty)
    const existing = localWH.find(w => w.product_name.toLowerCase() === wProduct.trim().toLowerCase())
    if (existing) {
      const newQty = existing.quantity + qty
      await supabase.from("warehouse_stock").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", existing.id)
      setLocalWH(prev => prev.map(w => w.id === existing.id ? { ...w, quantity: newQty } : w))
    } else {
      const { data } = await supabase.from("warehouse_stock").insert([{
        tenant_id: tenantId, product_name: wProduct.trim(), quantity: qty, alert_threshold: 10
      }]).select()
      if (data) setLocalWH(prev => [...prev, ...(data as WarehouseStock[])])
    }
    // Enregistrer mouvement
    await supabase.from("stock_mouvements").insert([{
      tenant_id: tenantId, product_name: wProduct.trim(),
      type: "entree_entrepot", quantity: qty,
      from_driver: "Fournisseur", to_driver: "Entrepôt",
    }])
    toast(`✅ ${qty}× ${wProduct.trim()} ajouté à l'entrepôt`, "success")
    setWProduct(""); setWQty("1"); setWLoading(false)
  }

  // ── Entrepôt : modifier quantité ──
  const saveWEdit = async (id: string) => {
    setWSaving(true)
    await supabase.from("warehouse_stock").update({ quantity: wEditQty, updated_at: new Date().toISOString() }).eq("id", id)
    setLocalWH(prev => prev.map(w => w.id === id ? { ...w, quantity: wEditQty } : w))
    setWEditId(null); setWSaving(false)
    toast("Entrepôt mis à jour ✅", "success")
  }

  // ── Entrepôt : supprimer ──
  const deleteWarehouse = async (id: string) => {
    if (!confirm("Supprimer ce produit de l'entrepôt ?")) return
    await supabase.from("warehouse_stock").delete().eq("id", id)
    setLocalWH(prev => prev.filter(w => w.id !== id))
    toast("Produit supprimé de l'entrepôt", "info")
  }

  // ── Grouper stocks par livreur ──
  const grouped = drivers.reduce((acc: Record<string, { name: string; items: DriverStock[] }>, d) => {
    const items = driverStocks.filter(s => s.driver_id === d.id)
    if (items.length > 0) acc[d.id] = { name: d.full_name, items }
    return acc
  }, {})

  // ── Produits disponibles pour transfert ──
  const produitsFrom = tFromId
    ? [...new Set(driverStocks.filter(s => s.driver_id === tFromId).map(s => s.product_name))]
    : []

  const TABS = [
    { id: "entrepot",   label: "📦 Entrepôt" },
    { id: "demandes",   label: `📬 Demandes${demandes.filter(d => d.status === "en_attente").length > 0 ? ` (${demandes.filter(d => d.status === "en_attente").length})` : ""}` },
    { id: "transferts", label: "🔄 Transferts" },
    { id: "historique", label: "📋 Historique" },
  ]

  const tabBtn = (id: string, label: string) => (
    <button key={id} onClick={() => setTab(id as typeof tab)}
      style={{ padding: "9px 18px", borderRadius: 20, border: `1px solid ${tab === id ? S.gold : S.border}`, background: tab === id ? `${S.gold}15` : "transparent", color: tab === id ? S.gold : S.text2, fontWeight: tab === id ? 700 : 500, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
      {label}
    </button>
  )

  return (
    <div>
      {/* ── Navigation ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {TABS.map(t => tabBtn(t.id, t.label))}
      </div>

      {/* ════════════════════════════════════════
          ONGLET 1 — ENTREPÔT
      ════════════════════════════════════════ */}
      {tab === "entrepot" && (
        <div>

          {/* ── Section 1 : Entrepôt central ── */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: S.text, marginBottom: 4 }}>🏭 Entrepôt central</p>
            <p style={{ fontSize: 13, color: S.text2, marginBottom: 16 }}>Stock maître — ajoutez vos produits ici avant de distribuer aux livreurs</p>

            {/* Formulaire ajout entrepôt */}
            <div style={{ maxWidth: 480, background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <form onSubmit={handleAddWarehouse} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 2, minWidth: 140 }}>
                  <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 5 }}>Produit</label>
                  <input value={wProduct} onChange={e => setWProduct(e.target.value)} required placeholder="Ex: THERAWOLF" style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: 80 }}>
                  <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 5 }}>Quantité</label>
                  <input type="number" min="1" value={wQty} onChange={e => setWQty(e.target.value)} required style={inputStyle} />
                </div>
                <button type="submit" disabled={wLoading}
                  style={{ padding: "12px 20px", background: `linear-gradient(135deg, ${S.gold}, #d97706)`, border: "none", borderRadius: 10, color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {wLoading ? "..." : "➕ Ajouter"}
                </button>
              </form>
            </div>

            {/* Liste produits entrepôt */}
            {localWH.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: S.text2, background: S.card, border: `1px solid ${S.border}`, borderRadius: 14 }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🏭</p>
                <p>Aucun produit dans l'entrepôt</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {localWH.map(w => {
                  const totalLivreurs = driverStocks.filter(s => s.product_name.toLowerCase() === w.product_name.toLowerCase()).reduce((sum, s) => sum + Number(s.quantity), 0)
                  return (
                    <div key={w.id} style={{ background: S.card, border: `1px solid ${Number(w.quantity) <= w.alert_threshold ? S.red + "60" : S.border}`, borderRadius: 14, padding: "14px 16px" }}>
                      {wEditId === w.id ? (
                        <div>
                          <p style={{ color: S.text, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{w.product_name}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <button onClick={() => setWEditQty(q => Math.max(0, q - 1))} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.text, fontSize: 16, cursor: "pointer" }}>−</button>
                            <input type="number" min="0" value={wEditQty} onChange={e => setWEditQty(Number(e.target.value))}
                              style={{ width: 60, textAlign: "center", background: "rgba(255,255,255,0.06)", border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, padding: "5px 4px", fontSize: 15, fontWeight: 800 }} />
                            <button onClick={() => setWEditQty(q => q + 1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.text, fontSize: 16, cursor: "pointer" }}>+</button>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => saveWEdit(w.id)} disabled={wSaving}
                              style={{ flex: 1, padding: "7px 0", background: S.gold, border: "none", borderRadius: 8, color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                              {wSaving ? "..." : "✅ Sauver"}
                            </button>
                            <button onClick={() => setWEditId(null)}
                              style={{ flex: 1, padding: "7px 0", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 8, color: S.text2, fontSize: 12, cursor: "pointer" }}>
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p style={{ color: S.text, fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>{w.product_name}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div>
                              <p style={{ color: S.text2, fontSize: 11, margin: "0 0 2px" }}>Entrepôt</p>
                              <span style={{ color: Number(w.quantity) <= w.alert_threshold ? S.red : S.green, fontSize: 22, fontWeight: 900 }}>{w.quantity}</span>
                              {Number(w.quantity) <= w.alert_threshold && <span style={{ color: S.red, fontSize: 10, marginLeft: 4 }}>⚠️ Bas</span>}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p style={{ color: S.text2, fontSize: 11, margin: "0 0 2px" }}>Livreurs</p>
                              <span style={{ color: S.blue, fontSize: 22, fontWeight: 900 }}>{totalLivreurs}</span>
                            </div>
                          </div>
                          <div style={{ height: 1, background: S.border, margin: "8px 0" }} />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { setWEditId(w.id); setWEditQty(w.quantity) }}
                              style={{ flex: 1, padding: "6px 0", background: "rgba(255,255,255,0.05)", border: `1px solid ${S.border}`, borderRadius: 8, color: S.text2, fontSize: 11, cursor: "pointer" }}>
                              ✏️ Modifier
                            </button>
                            <button onClick={() => deleteWarehouse(w.id)}
                              style={{ flex: 1, padding: "6px 0", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, color: S.red, fontSize: 11, cursor: "pointer" }}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Séparateur ── */}
          <div style={{ height: 1, background: S.border, margin: "8px 0 28px" }} />

          {/* ── Section 2 : Distribuer au livreur ── */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: S.text, marginBottom: 4 }}>📤 Distribuer aux livreurs</p>
            <p style={{ fontSize: 13, color: S.text2, marginBottom: 16 }}>Le stock distribué est déduit de l'entrepôt automatiquement</p>
            <div style={{ maxWidth: 560, background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20 }}>
              <form onSubmit={async (e) => {
                e.preventDefault()
                // Vérifier stock entrepôt disponible
                const wStock = localWH.find(w => w.product_name.toLowerCase() === stockForm.product_name.trim().toLowerCase())
                if (wStock && Number(wStock.quantity) < Number(stockForm.quantity)) {
                  toast(`Stock entrepôt insuffisant. Disponible : ${wStock.quantity}`, "error")
                  return
                }
                // Appel normal
                onStockSubmit(e)
                // Déduire de l'entrepôt
                if (wStock && tenantId) {
                  const newQty = wStock.quantity - Number(stockForm.quantity)
                  await supabase.from("warehouse_stock").update({ quantity: newQty }).eq("id", wStock.id)
                  setLocalWH(prev => prev.map(w => w.id === wStock.id ? { ...w, quantity: newQty } : w))
                }
              }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, color: S.text2, display: "block", marginBottom: 6 }}>Livreur</label>
                  <select name="driver_id" value={stockForm.driver_id} onChange={onStockChange} required style={inputStyle}>
                    <option value="">Choisir un livreur</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, color: S.text2, display: "block", marginBottom: 6 }}>Produit</label>
                    <select name="product_name" value={stockForm.product_name} onChange={onStockChange as any} required style={inputStyle}>
                      <option value="">Choisir un produit</option>
                      {localWH.map(w => (
                        <option key={w.id} value={w.product_name}>{w.product_name} (entrepôt: {w.quantity})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: S.text2, display: "block", marginBottom: 6 }}>Quantité</label>
                    <input name="quantity" type="number" min="1" value={stockForm.quantity} onChange={onStockChange} required style={inputStyle} />
                  </div>
                </div>
                <button type="submit" disabled={stockLoading}
                  style={{ padding: 14, background: `linear-gradient(135deg, ${S.gold}, #d97706)`, border: "none", borderRadius: 12, color: "#000", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  {stockLoading ? "Distribution..." : "📤 Distribuer au livreur"}
                </button>
              </form>
            </div>
          </div>

          {/* Stock actuel */}
          <p style={{ fontSize: 15, fontWeight: 700, color: S.text, marginBottom: 16 }}>Stock par livreur</p>
          {driverStocks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: S.text2 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
              <p>Aucun stock enregistré</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {Object.values(grouped).map(({ name, items }) => (
                <div key={name}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: S.gold, marginBottom: 10 }}>🚴 {name}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {items.map(s => (
                      <div key={s.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "14px 16px" }}>
                        {editingId === String(s.id) ? (
                          <div>
                            <p style={{ color: S.text, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{s.product_name}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <button onClick={() => setEditQty(q => Math.max(0, q - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.text, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
                              <input type="number" min="0" value={editQty} onChange={e => setEditQty(Number(e.target.value))}
                                style={{ width: 60, textAlign: "center", background: "rgba(255,255,255,0.06)", border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, padding: "6px 4px", fontSize: 16, fontWeight: 800 }} />
                              <button onClick={() => setEditQty(q => q + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.text, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => saveEdit(s.id)} disabled={saving}
                                style={{ flex: 1, padding: "8px 0", background: S.gold, border: "none", borderRadius: 8, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                                {saving ? "..." : "✅ Sauver"}
                              </button>
                              <button onClick={cancelEdit}
                                style={{ flex: 1, padding: "8px 0", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 8, color: S.text2, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>{s.product_name}</p>
                              <span style={{ color: Number(s.quantity) <= 3 ? S.red : S.green, fontSize: 22, fontWeight: 900 }}>{s.quantity}</span>
                              {Number(s.quantity) <= 3 && <span style={{ color: S.red, fontSize: 10, marginLeft: 6, fontWeight: 600 }}>Stock bas !</span>}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <button onClick={() => startEdit(s)}
                                style={{ padding: "6px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${S.border}`, borderRadius: 8, color: S.text2, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                                ✏️ Modifier
                              </button>
                              <button onClick={() => deleteStock(s.id)} disabled={deletingId === String(s.id)}
                                style={{ padding: "6px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, color: S.red, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                                {deletingId === String(s.id) ? "..." : "🗑️ Supprimer"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          ONGLET 2 — DEMANDES
      ════════════════════════════════════════ */}
      {tab === "demandes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: S.text }}>Demandes de stock des livreurs</p>
            <button onClick={loadDemandes} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 20, color: S.text2, fontSize: 12, cursor: "pointer" }}>
              🔄 Actualiser
            </button>
          </div>
          {loadingD ? (
            <p style={{ color: S.text2 }}>Chargement...</p>
          ) : demandes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: S.text2 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📬</p>
              <p>Aucune demande en cours</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {demandes.map(d => (
                <div key={d.id} style={{ background: S.card, border: `1px solid ${d.status === "en_attente" ? S.gold + "40" : S.border}`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ color: S.text, fontWeight: 700, fontSize: 14 }}>{d.driver_name}</span>
                      <span style={{
                        padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: d.status === "en_attente" ? `${S.gold}20` : d.status === "approuvee" ? `${S.green}20` : `${S.red}20`,
                        color: d.status === "en_attente" ? S.gold : d.status === "approuvee" ? S.green : S.red
                      }}>
                        {d.status === "en_attente" ? "En attente" : d.status === "approuvee" ? "Approuvée" : "Refusée"}
                      </span>
                    </div>
                    <p style={{ color: S.text2, fontSize: 13, margin: 0 }}>
                      <strong style={{ color: S.text }}>{d.quantity_requested}×</strong> {d.product_name}
                      {d.note && <span style={{ color: S.text3, marginLeft: 8 }}>— {d.note}</span>}
                    </p>
                    <p style={{ color: S.text3, fontSize: 11, marginTop: 4 }}>{fmtDate(d.created_at)}</p>
                  </div>
                  {d.status === "en_attente" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => approuverDemande(d)}
                        style={{ padding: "8px 16px", background: S.green, border: "none", borderRadius: 10, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        ✅ Approuver
                      </button>
                      <button onClick={() => refuserDemande(d)}
                        style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${S.red}`, borderRadius: 10, color: S.red, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                        ❌ Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          ONGLET 3 — TRANSFERTS
      ════════════════════════════════════════ */}
      {tab === "transferts" && (
        <div>
          <div style={{ maxWidth: 560, background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: S.text, marginBottom: 16 }}>Transférer du stock entre livreurs</p>
            <form onSubmit={handleTransfert} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, color: S.text2, display: "block", marginBottom: 6 }}>De (livreur source)</label>
                <select value={tFromId} onChange={e => { setTFromId(e.target.value); setTProduct("") }} required style={inputStyle}>
                  <option value="">Choisir le livreur source</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: S.text2, display: "block", marginBottom: 6 }}>Produit</label>
                <select value={tProduct} onChange={e => setTProduct(e.target.value)} required style={inputStyle} disabled={!tFromId}>
                  <option value="">Choisir un produit</option>
                  {produitsFrom.map(p => {
                    const s = driverStocks.find(x => x.driver_id === tFromId && x.product_name === p)
                    return <option key={p} value={p}>{p} (stock: {s?.quantity || 0})</option>
                  })}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: S.text2, display: "block", marginBottom: 6 }}>Vers (livreur destination)</label>
                <select value={tToId} onChange={e => setTToId(e.target.value)} required style={inputStyle}>
                  <option value="">Choisir le livreur destination</option>
                  {drivers.filter(d => d.id !== tFromId).map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: S.text2, display: "block", marginBottom: 6 }}>Quantité</label>
                <input type="number" min="1" value={tQty} onChange={e => setTQty(e.target.value)} required style={inputStyle} />
              </div>
              <button type="submit" disabled={tLoading}
                style={{ padding: 14, background: `linear-gradient(135deg, ${S.gold}, #d97706)`, border: "none", borderRadius: 12, color: "#000", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                {tLoading ? "Transfert..." : "🔄 Transférer"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          ONGLET 4 — HISTORIQUE
      ════════════════════════════════════════ */}
      {tab === "historique" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: S.text }}>Historique des mouvements</p>
            <button onClick={loadMouvements} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 20, color: S.text2, fontSize: 12, cursor: "pointer" }}>
              🔄 Actualiser
            </button>
          </div>
          {loadingM ? (
            <p style={{ color: S.text2 }}>Chargement...</p>
          ) : mouvements.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: S.text2 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📋</p>
              <p>Aucun mouvement enregistré</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mouvements.map(m => {
                const typeColors: Record<string, { bg: string; color: string; label: string }> = {
                  "transfert_livreur": { bg: S.blueBg,   color: S.blue,   label: "Transfert livreur" },
                  "transfert_admin":   { bg: S.purpleBg, color: S.purple, label: "Transfert admin" },
                  "approbation_admin": { bg: S.greenBg,  color: S.green,  label: "Approbation" },
                  "modification_admin":{ bg: `${S.gold}20`, color: S.gold, label: "Modification" },
                  "ajout_admin":       { bg: `${S.gold}20`, color: S.gold, label: "Ajout admin" },
                }
                const tc = typeColors[m.type] || { bg: "rgba(255,255,255,0.04)", color: S.text2, label: m.type }
                return (
                  <div key={m.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: tc.bg, color: tc.color, flexShrink: 0 }}>
                      {tc.label}
                    </span>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: 0 }}>
                        <strong style={{ color: tc.color }}>{m.quantity}×</strong> {m.product_name}
                      </p>
                      <p style={{ color: S.text2, fontSize: 12, margin: "2px 0 0" }}>
                        {m.from_driver} → {m.to_driver}
                        {m.note && <span style={{ color: S.text3, marginLeft: 8 }}>— {m.note}</span>}
                      </p>
                    </div>
                    <span style={{ color: S.text3, fontSize: 11, flexShrink: 0 }}>{fmtDate(m.created_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
