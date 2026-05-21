"use client"

// ============================================================
// SHIPIVO — Admin : StockView
// ============================================================

import type { Profile, DriverStock, StockFormData } from "@/types"
import { inputStyle } from "@/lib/utils"

type Props = {
  drivers: Profile[]
  driverStocks: DriverStock[]
  stockForm: StockFormData
  stockLoading: boolean
  onStockChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onStockSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export default function StockView({
  drivers, driverStocks, stockForm, stockLoading, onStockChange, onStockSubmit,
}: Props) {
  // Grouper par livreur
  const grouped = drivers.reduce((acc: Record<string, { name: string; items: DriverStock[] }>, d) => {
    const items = driverStocks.filter(s => s.driver_id === d.id)
    if (items.length > 0) acc[d.id] = { name: d.full_name, items }
    return acc
  }, {})

  return (
    <div>
      {/* Formulaire ajout stock */}
      <div style={{ maxWidth: 600, marginBottom: 32 }}>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>➕ Ajouter du stock</p>
        <form onSubmit={onStockSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Livreur</label>
            <select name="driver_id" value={stockForm.driver_id} onChange={onStockChange} required style={inputStyle}>
              <option value="">Choisir un livreur</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Produit</label>
              <input name="product_name" value={stockForm.product_name} onChange={onStockChange} required placeholder="Ex: THERAWOLF" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Quantité</label>
              <input name="quantity" type="number" min="1" value={stockForm.quantity} onChange={onStockChange} required style={inputStyle} />
            </div>
          </div>
          <button type="submit" disabled={stockLoading}
            style={{ padding: 16, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 14, color: "#0a0a0f", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            {stockLoading ? "Ajout..." : "➕ Ajouter"}
          </button>
        </form>
      </div>

      {/* Stock actuel */}
      <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Stock actuel</p>
      {driverStocks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <p>Aucun stock</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.values(grouped).map(({ name, items }) => (
            <div key={name}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginBottom: 10 }}>🚴 {name}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {items.map((s) => (
                  <div key={s.id} style={{ background: "#111118", border: "1px solid #1E1E2E", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ color: "#F8F8FC", fontSize: 13, fontWeight: 600, margin: "0 0 4px 0" }}>{s.product_name}</p>
                    </div>
                    <span style={{ color: Number(s.quantity) <= 3 ? "#F87171" : "#4ADE80", fontSize: 20, fontWeight: 800 }}>{s.quantity}</span>
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
