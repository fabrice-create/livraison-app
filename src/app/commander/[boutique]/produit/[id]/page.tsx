"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/app/lib/supabase"

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
}

export default function ProduitDetailPage() {
  const params = useParams()
  const router = useRouter()
  const boutique = params?.boutique as string
  const id = params?.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, description, image_url")
        .eq("id", id)
        .single()
      setProduct(data)
      setLoading(false)
    }
    load()
  }, [id])

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA"

  const handleAdd = () => {
    // Stocker dans sessionStorage pour le panier
    const cart = JSON.parse(sessionStorage.getItem(`cart_${boutique}`) || "[]")
    const existing = cart.find((i: {id: number}) => i.id === product?.id)
    if (existing) {
      existing.quantity += quantity
    } else {
      cart.push({ id: product?.id, name: product?.name, price: product?.price, image_url: product?.image_url, quantity })
    }
    sessionStorage.setItem(`cart_${boutique}`, JSON.stringify(cart))
    setAdded(true)
    setTimeout(() => {
      router.push(`/commander/${boutique}`)
    }, 1000)
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
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: C.gold, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
          ← Retour
        </button>
      </div>

      {/* Photo grande */}
      <div style={{ width: "100%", aspectRatio: "1/1", maxHeight: 400, overflow: "hidden", background: C.card }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>📦</div>
        )}
      </div>

      {/* Infos produit */}
      <div style={{ padding: "24px 20px", maxWidth: 600, margin: "0 auto" }}>
        <h1 style={{ color: C.white, fontSize: 22, fontWeight: 800, margin: "0 0 8px 0", letterSpacing: "-0.3px" }}>
          {product.name}
        </h1>
        <p style={{ color: C.gold, fontSize: 24, fontWeight: 800, margin: "0 0 16px 0" }}>
          {fmt(product.price)}
        </p>

        {product.description && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 24 }}>
            <p style={{ color: C.mutedLight, fontSize: 13, fontWeight: 600, margin: "0 0 8px 0", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Description</p>
            <p style={{ color: C.white, fontSize: 15, margin: 0, lineHeight: 1.7 }}>{product.description}</p>
          </div>
        )}

        {/* Quantité */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: C.mutedLight, fontSize: 13, fontWeight: 600, margin: "0 0 12px 0", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Quantité</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: 44, height: 44, borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.white, fontSize: 20, cursor: "pointer", fontWeight: 700 }}>−</button>
            <span style={{ color: C.white, fontSize: 20, fontWeight: 700, minWidth: 40, textAlign: "center" as const }}>{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} style={{ width: 44, height: 44, borderRadius: 10, background: C.gold, border: "none", color: "#000", fontSize: 20, cursor: "pointer", fontWeight: 700 }}>+</button>
          </div>
        </div>

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <span style={{ color: C.mutedLight, fontSize: 14 }}>Total</span>
          <span style={{ color: C.gold, fontSize: 20, fontWeight: 800 }}>{fmt(product.price * quantity)}</span>
        </div>

        {/* Bouton ajouter */}
        <button onClick={handleAdd} disabled={added} style={{
          width: "100%", background: added ? "rgba(74,222,128,0.15)" : `linear-gradient(135deg,${C.gold},${C.goldDark})`,
          border: added ? "1px solid rgba(74,222,128,0.3)" : "none",
          borderRadius: 14, padding: "16px",
          color: added ? C.success : "#000",
          fontSize: 16, fontWeight: 800, cursor: added ? "default" : "pointer", minHeight: 54,
          transition: "all 0.2s",
        }}>
          {added ? "✓ Ajouté au panier !" : `🛒 Ajouter au panier · ${fmt(product.price * quantity)}`}
        </button>
      </div>
    </div>
  )
}
