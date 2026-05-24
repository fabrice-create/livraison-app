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

interface ProductImage {
  id: number
  image_url: string
  position: number
}

export default function ProduitDetailPage() {
  const params = useParams()
  const router = useRouter()
  const boutique = params?.boutique as string
  const id = params?.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [activeImg, setActiveImg] = useState(0)
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

      if (!data) { setLoading(false); return }
      setProduct(data)

      // Charger toutes les images
      const allImgs: string[] = []
      if (data.image_url) allImgs.push(data.image_url)
      const { data: extraImgs } = await supabase
        .from("product_images")
        .select("image_url, position")
        .eq("product_id", data.id)
        .order("position")
      if (extraImgs) allImgs.push(...extraImgs.map((i: ProductImage) => i.image_url))
      setImages(allImgs)

      // Charger devise du tenant
      if (data.tenant_id) {
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

  const handleAddToCart = () => {
    const cart = JSON.parse(sessionStorage.getItem(`cart_${boutique}`) || "[]")
    const existing = cart.find((i: {id: number}) => i.id === product?.id)
    if (existing) {
      existing.quantity += quantity
    } else {
      cart.push({
        id: product?.id,
        name: product?.name,
        price: product?.price,
        image_url: product?.image_url,
        quantity
      })
    }
    sessionStorage.setItem(`cart_${boutique}`, JSON.stringify(cart))
    setAdded(true)
  }

  const handleOrderNow = () => {
    const cart = JSON.parse(sessionStorage.getItem(`cart_${boutique}`) || "[]")
    const existing = cart.find((i: {id: number}) => i.id === product?.id)
    if (existing) {
      existing.quantity += quantity
    } else {
      cart.push({
        id: product?.id,
        name: product?.name,
        price: product?.price,
        image_url: product?.image_url,
        quantity
      })
    }
    sessionStorage.setItem(`cart_${boutique}`, JSON.stringify(cart))
    router.push(`/commander/${boutique}?step=form`)
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: C.muted, fontFamily: "Inter, sans-serif" }}>Chargement...</p>
    </div>
  )

  if (!product) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: C.muted, fontFamily: "Inter, sans-serif" }}>Produit introuvable</p>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push(`/commander/${boutique}`)}
            style={{ background: "none", border: "none", color: C.gold, fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>
            ←
          </button>
          <h1 style={{ color: C.white, fontSize: 16, fontWeight: 700, margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product.name}
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 120 }}>

        {/* Galerie photos */}
        <div style={{ position: "relative" }}>
          {/* Photo principale */}
          <div style={{ width: "100%", aspectRatio: "1/1", background: C.card, overflow: "hidden" }}>
            {images.length > 0 ? (
              <img
                src={images[activeImg]}
                alt={product.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>
                📦
              </div>
            )}
          </div>

          {/* Indicateur photos */}
          {images.length > 1 && (
            <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.6)", borderRadius: 12, padding: "3px 10px" }}>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{activeImg + 1}/{images.length}</span>
            </div>
          )}
        </div>

        {/* Miniatures */}
        {images.length > 1 && (
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", overflowX: "auto" }}>
            {images.map((img, i) => (
              <div key={i} onClick={() => setActiveImg(i)}
                style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 8, overflow: "hidden", border: `2px solid ${activeImg === i ? C.gold : C.border}`, cursor: "pointer" }}>
                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        )}

        {/* Infos produit */}
        <div style={{ padding: "16px 16px 0" }}>
          <h2 style={{ color: C.white, fontSize: 20, fontWeight: 800, margin: "0 0 6px 0" }}>{product.name}</h2>
          <p style={{ color: C.gold, fontSize: 24, fontWeight: 800, margin: "0 0 16px 0" }}>{fmt(product.price)}</p>

          {product.description && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ color: C.mutedLight, fontSize: 13, fontWeight: 600, margin: "0 0 8px 0" }}>Description</p>
              <p style={{ color: C.white, fontSize: 14, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{product.description}</p>
            </div>
          )}

          {/* Sélecteur quantité */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <span style={{ color: C.mutedLight, fontSize: 14, fontWeight: 500 }}>Quantité</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                style={{ width: 36, height: 36, borderRadius: 8, background: C.border, border: "none", color: C.white, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
              <span style={{ color: C.white, fontSize: 18, fontWeight: 800, minWidth: 24, textAlign: "center" }}>{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)}
                style={{ width: 36, height: 36, borderRadius: 8, background: C.gold, border: "none", color: "#000", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
            </div>
            {quantity > 1 && (
              <span style={{ color: C.muted, fontSize: 13 }}>= {fmt(product.price * quantity)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Boutons fixes en bas */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.bg, borderTop: `1px solid ${C.border}`, padding: "12px 16px", zIndex: 50 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", gap: 10 }}>
          {!added ? (
            <>
              <button onClick={handleAddToCart}
                style={{ flex: 1, background: "transparent", border: `2px solid ${C.gold}`, borderRadius: 12, padding: "14px", color: C.gold, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                🛒 Ajouter
              </button>
              <button onClick={handleOrderNow}
                style={{ flex: 2, background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, border: "none", borderRadius: 12, padding: "14px", color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                ⚡ Commander maintenant
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button onClick={() => router.push(`/commander/${boutique}`)}
                style={{ flex: 1, background: C.border, border: "none", borderRadius: 12, padding: "14px", color: C.white, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                ← Continuer
              </button>
              <button onClick={() => router.push(`/commander/${boutique}?step=form`)}
                style={{ flex: 2, background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, border: "none", borderRadius: 12, padding: "14px", color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                🛒 Voir le panier →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
