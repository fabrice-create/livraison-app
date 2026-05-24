"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/app/lib/supabase"
import { useClientCurrency } from "@/hooks/useClientCurrency"

const C = {
  bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  white: "#F8F8FC", muted: "#55556A", mutedLight: "#9898B0",
  success: "#4ADE80",
}

interface Product {
  id: number
  name: string
  price: number
  description?: string
  image_url?: string
  tenant_id?: string
}

export default function ProduitDetailPage() {
  const params = useParams()
  const router = useRouter()
  const boutique = params?.boutique as string
  const id = params?.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [tenantCurrency, setTenantCurrency] = useState("FCFA")
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const { formatPrice } = useClientCurrency(tenantCurrency)

  useEffect(() => {
    const load = async () => {
      // Charger produit
      const { data } = await supabase
        .from("products")
        .select("id, name, price, description, image_url, tenant_id")
        .eq("id", id)
        .single()
      setProduct(data)
      // Charger devise du tenant
      if (data?.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("currency")
          .eq("id", data.tenant_id)
          .single()
        if (tenant?.currency) setTenantCurrency(tenant.currency)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const fmt = (n: number) => formatPrice(n, tenantCurrency)

  const handleAdd = () => {
    const cart = JSON.parse(sessionStorage.getItem(`cart_${boutique}`) || "[]")
    const existing = cart.find((i: {id: number}) => i.id === product?.id)
    if (existing) {
      existing.quantity += quantity
    } else {
      cart.push({ id: product?.id, name: product?.name, price: product?.price, image_url: product?.image_url, quantity })
    }
    sessionStorage.setItem(`cart_${boutique}`, JSON.stringify(cart))
    setAdded(true)
    setTimeout(() => router.push(`/commander/${boutique}`), 1000)
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: C.muted, fontFamily: "Inter, sans-serif" }}>Chargement...</p>
    </div>
  )

  if (!product) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: C.muted, fontFamily: "Inter, sans-serif" }}>Produit introuvable.</p>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 20px", position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: C.gold, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          ← Retour
        </button>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* Photo carrée 1:1 */}
        <div style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 16,
          overflow: "hidden",
          background: C.card,
          marginBottom: 20,
          border: `1px solid ${C.border}`,
        }}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>
              📦
            </div>
          )}
        </div>

        {/* Nom + Prix */}
        <h1 style={{ color: C.white, fontSize: 22, fontWeight: 800, margin: "0 0 6px 0", letterSpacing: "-0.3px" }}>
          {product.name}
        </h1>
        <p style={{ color: C.gold, fontSize: 26, fontWeight: 800, margin: "0 0 20px 0" }}>
          {fmt(product.price)}
        </p>

        {/* Description */}
        {product.description && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
            <p style={{ color: C.mutedLight, fontSize: 11, fontWeight: 700, margin: "0 0 8px 0", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
              Description
            </p>
            <p style={{ color: C.white, fontSize: 14, margin: 0, lineHeight: 1.7 }}>
              {product.description}
            </p>
          </div>
        )}

        {/* Quantité */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: C.mutedLight, fontSize: 11, fontWeight: 700, margin: "0 0 12px 0", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
            Quantité
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: 44, height: 44, borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.white, fontSize: 20, cursor: "pointer", fontWeight: 700 }}>−</button>
            <span style={{ color: C.white, fontSize: 22, fontWeight: 800, minWidth: 40, textAlign: "center" as const }}>{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} style={{ width: 44, height: 44, borderRadius: 10, background: C.gold, border: "none", color: "#000", fontSize: 20, cursor: "pointer", fontWeight: 700 }}>+</button>
          </div>
        </div>

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <span style={{ color: C.mutedLight, fontSize: 14 }}>Total</span>
          <span style={{ color: C.gold, fontSize: 22, fontWeight: 800 }}>{fmt(product.price * quantity)}</span>
        </div>

        {/* Bouton ajouter au panier */}
        <button onClick={handleAdd} disabled={added} style={{
          width: "100%",
          background: added ? "rgba(74,222,128,0.15)" : `linear-gradient(135deg,${C.gold},${C.goldDark})`,
          border: added ? "1px solid rgba(74,222,128,0.3)" : "none",
          borderRadius: 14, padding: "16px",
          color: added ? C.success : "#000",
          fontSize: 16, fontWeight: 800,
          cursor: added ? "default" : "pointer",
          minHeight: 54,
          transition: "all 0.2s",
        }}>
          {added ? "✓ Ajouté ! Retour au catalogue..." : `🛒 Ajouter au panier · ${fmt(product.price * quantity)}`}
        </button>
      </div>
    </div>
  )
}
