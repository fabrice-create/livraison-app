"use client"

// ============================================================
// SHIPIVO — Admin : StockView
// ============================================================

import { useState } from "react"
import { supabase } from "@/app/lib/supabase"
import type { Profile, DriverStock, StockFormData } from "@/types"
import { inputStyle } from "@/lib/utils"

type Props = {
  drivers: Profile[]
  driverStocks: DriverStock[]
  stockForm: StockFormData
  stockLoading: boolean
  onStockChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onStockSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onRefresh?: () => void
}

export default function StockView({
  drivers, driverStocks, stockForm, stockLoading, onStockChange, onStockSubmit, onRefresh,
}: Props) {

  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editQty,    setEditQty]    = useState<number>(0)
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Grouper par livreur
  const grouped = drivers.reduce((acc: Record<string, { name: string; items: DriverStock[] }>, d) => {
    const items = driverStocks.filter(s => s.driver_id === d.id)
    if (items.length > 0) acc[d.id] = { name: d.full_name, items }
    return acc
  }, {})

  const startEdit = (s: DriverStock) => {
    setEditingId(String(s.id))
    setEditQty(Number(s.quantity))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditQty(0)
  }

  const saveEdit = async (id: string | number) => {
    if (editQty < 0) return
    setSaving(true)
    await supabase.from("driver_stocks").update({ quantity: editQty }).eq("id", id)
    setSaving(false)
    setEditingId(null)
    if (onRefresh) onRefresh()
  }

  const deleteStock = async (id: string | number) => {
    if (!confirm("Supprimer ce stock ?")) return
    setDeletingId(String(id))
    await supabase.from("driver_stocks").delete().eq("id", String(id))
    setDeletingId(null)
    if (onRefresh) onRefresh()
  }

  const S = {
    gold:   "#F59E0B",
    card:   "#111118",
    border: "#1E1E2E",
    text:   "#F8F8FC",
    text2:  "#9898B0",
    green:  "#4ADE80",
    red:    "#F87171",
  }

  return (
    <div>
      {/* ── Formulaire ajout ── */}
      <div style={{ maxWidth: 600, marginBottom: 32 }}>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: S.text }}>Ajouter du stock</p>
        <form onSubmit={onStockSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, color: S.text2, display: "block", marginBottom: 6 }}>Livreur</label>
            <select name="driver_id" value={stockForm.driver_id} onChange={onStockChange} required style={inputStyle}>
              <option value="">Choisir un livreur</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, color: S.text2, display: "block", marginBottom: 6 }}>Produit</label>
              <input name="product_name" value={stockForm.product_name} onChange={onStockChange} required placeholder="Ex: THERAWOLF" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: S.text2, display: "block", marginBottom: 6 }}>Quantité</label>
              <input name="quantity" type="number" min="1" value={stockForm.quantity} onChange={onStockChange} required style={inputStyle} />
            </div>
          </div>
          <button type="submit" disabled={stockLoading}
            style={{ padding: 16, background: `linear-gradient(135deg, ${S.gold}, #d97706)`, border: "none", borderRadius: 14, color: "#0a0a0f", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            {stockLoading ? "Ajout..." : "Ajouter"}
          </button>
        </form>
      </div>

      {/* ── Stock actuel ── */}
      <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: S.text }}>Stock actuel</p>

      {driverStocks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: S.text2 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <p>Aucun stock enregistré</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Object.values(grouped).map(({ name, items }) => (
            <div key={name}>
              {/* Nom livreur */}
              <p style={{ fontSize: 14, fontWeight: 700, color: S.gold, marginBottom: 10 }}>
                🚴 {name}
              </p>

              {/* Cartes produits */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {items.map((s) => (
                  <div key={s.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "14px 16px" }}>

                    {editingId === String(s.id) ? (
                      /* ── Mode édition ── */
                      <div>
                        <p style={{ color: S.text, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{s.product_name}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <button onClick={() => setEditQty(q => Math.max(0, q - 1))}
                            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.text, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>
                            −
                          </button>
                          <input type="number" min="0" value={editQty} onChange={e => setEditQty(Number(e.target.value))}
                            style={{ width: 56, textAlign: "center", background: "rgba(255,255,255,0.06)", border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, padding: "6px 4px", fontSize: 16, fontWeight: 800 }} />
                          <button onClick={() => setEditQty(q => q + 1)}
                            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.text, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>
                            +
                          </button>
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
                      /* ── Mode affichage ── */
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>{s.product_name}</p>
                          <span style={{ color: Number(s.quantity) <= 3 ? S.red : S.green, fontSize: 22, fontWeight: 900 }}>
                            {s.quantity}
                          </span>
                          {Number(s.quantity) <= 3 && (
                            <span style={{ color: S.red, fontSize: 10, marginLeft: 6, fontWeight: 600 }}>Stock bas !</span>
                          )}
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
  )
}
