"use client"

// ============================================================
// SHIPIVO — EditOrderModal
// ============================================================

import type { OrderFormData } from "@/types"
import { inputStyle } from "@/lib/utils"

type Props = {
  form: OrderFormData
  onChange: (form: OrderFormData) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

const FIELDS = [
  { name: "customer_name", label: "Nom client" },
  { name: "phone",         label: "Téléphone" },
  { name: "city",          label: "Ville" },
  { name: "address",       label: "Adresse" },
  { name: "product",       label: "Produit" },
] as const

export default function EditOrderModal({ form, onChange, onSubmit, onClose }: Props) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.9)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 16, overflowY: "auto",
    }}>
      <div style={{
        background: "#111118",
        border: "1px solid #2a2a3e",
        borderRadius: 20,
        padding: 24,
        width: "100%",
        maxWidth: 500,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 18, fontWeight: 700 }}>✏️ Modifier la commande</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 4 }}>{f.label}</label>
              <input
                name={f.name}
                value={form[f.name]}
                onChange={(e) => onChange({ ...form, [f.name]: e.target.value })}
                required
                style={inputStyle}
              />
            </div>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 4 }}>Quantité</label>
              <input
                type="number" min="1" value={form.quantity}
                onChange={(e) => onChange({ ...form, quantity: e.target.value })}
                required style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 4 }}>Montant (FCFA)</label>
              <input
                type="number" value={form.amount}
                onChange={(e) => onChange({ ...form, amount: e.target.value })}
                required style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 4 }}>Type de livraison</label>
            <select
              value={form.delivery_type}
              onChange={(e) => onChange({ ...form, delivery_type: e.target.value })}
              required style={inputStyle}
            >
              <option value="">Choisir...</option>
              <option value="direct">🚚 Direct</option>
              <option value="gare">🚌 Gare</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <button
              type="button" onClick={onClose}
              style={{ padding: 14, background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 12, color: "#9ca3af", cursor: "pointer", fontSize: 14 }}
            >
              Annuler
            </button>
            <button
              type="submit"
              style={{ padding: 14, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 12, color: "#0a0a0f", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
