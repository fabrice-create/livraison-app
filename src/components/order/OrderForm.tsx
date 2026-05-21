"use client"

// ============================================================
// SHIPIVO — OrderForm (création commande, partagé admin + closureuse)
// ============================================================

import type { OrderFormData } from "@/types"
import { inputStyle } from "@/lib/utils"

type Props = {
  form: OrderFormData
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  loading?: boolean
}

const TEXT_FIELDS = [
  { name: "customer_name", label: "Nom client",     placeholder: "Ex: Kofi Mensah" },
  { name: "phone",         label: "Téléphone",      placeholder: "Ex: 22890000000" },
  { name: "city",          label: "Ville",           placeholder: "Ex: Lomé" },
  { name: "address",       label: "Adresse",         placeholder: "Ex: Akodessewa..." },
  { name: "product",       label: "Produit",         placeholder: "Ex: THERAWOLF" },
] as const

export default function OrderForm({ form, onChange, onSubmit, loading = false }: Props) {
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {TEXT_FIELDS.map((f) => (
          <div key={f.name}>
            <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>{f.label}</label>
            <input
              name={f.name}
              value={form[f.name]}
              onChange={onChange}
              required
              placeholder={f.placeholder}
              style={inputStyle}
            />
          </div>
        ))}

        <div>
          <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Montant (FCFA)</label>
          <input name="amount" type="number" value={form.amount} onChange={onChange} required placeholder="25000" style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Quantité</label>
          <input name="quantity" type="number" min="1" value={form.quantity} onChange={onChange} required style={inputStyle} />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 13, color: "#9ca3af", display: "block", marginBottom: 6 }}>Type de livraison</label>
          <select name="delivery_type" value={form.delivery_type} onChange={onChange} required style={inputStyle}>
            <option value="">Choisir...</option>
            <option value="direct">🚚 Direct</option>
            <option value="gare">🚌 Gare</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: 16,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          border: "none",
          borderRadius: 14,
          color: "#0a0a0f",
          fontWeight: 700,
          fontSize: 16,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Création..." : "✅ Créer la commande"}
      </button>
    </form>
  )
}
