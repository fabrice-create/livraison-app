"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/app/lib/supabase"

const C = {
  bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  white: "#F8F8FC", muted: "#55556A", mutedLight: "#9898B0",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", successBg: "rgba(74,222,128,0.06)",
}

interface Product {
  id: number
  name: string
  price: number
  description?: string
  image_url?: string
}

interface CartItem {
  product: Product
  quantity: number
}

interface BoutiqueInfo {
  id: string
  name: string
  slug: string
  phone?: string
  delivery_fee: number
}

const VILLES = [
  "Lomé", "Sokodé", "Kara", "Kpalimé", "Atakpamé",
  "Bassar", "Tsévié", "Aného", "Mango", "Dapaong",
  "Notsé", "Vogan", "Badou", "Blitta", "Sotouboua",
  "Autre ville",
]

export default function CommanderPage() {
  const params = useParams()
  const slug = params?.boutique as string

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"catalogue" | "form">("catalogue")
  const [form, setForm] = useState({
    customer_name: "", phone: "", city: "Lomé",
    address: "", delivery_type: "Livraison directe", note: "",
  })

  useEffect(() => { loadBoutique() }, [slug])

  const loadBoutique = async () => {
    setLoading(true)
    try {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, name, slug, phone, delivery_fee")
        .eq("slug", slug)
        .single()

      if (!tenant) { setError("Boutique introuvable."); setLoading(false); return }

      setBoutique({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        phone: tenant.phone,
        delivery_fee: tenant.delivery_fee || 0,
      })

      const { data: prods } = await supabase
        .from("products")
        .select("id, name, price, description, image_url")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("name")

      setProducts(prods || [])
    } catch { setError("Erreur de chargement.") }
    setLoading(false)
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.product.id !== productId)); return }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i))
  }

  const fraisLivraison = boutique?.delivery_fee || 0
  const totalProduits = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const totalFinal = totalProduits + fraisLivraison
  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA"

  const handleSubmit = async () => {
    if (!form.customer_name.trim()) { setError("Ton nom est requis"); return }
    if (!form.phone.trim()) { setError("Ton numéro est requis"); return }
    if (cart.length === 0) { setError("Ajoute au moins un produit"); return }
    setError(""); setSubmitting(true)
    try {
      const productNames = cart.map(i => `${i.product.name} x${i.quantity}`).join(", ")
      const { error: orderError } = await supabase.from("orders").insert({
        tenant_id: boutique!.id,
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        city: form.city,
        address: form.address.trim(),
        product: productNames,
        quantity: cart.reduce((s, i) => s + i.quantity, 0),
        amount: totalFinal,
        delivery_type: form.delivery_type,
        status: "En attente",
        source: "boutique",
        note: form.note.trim() || null,
      })
      if (orderError) throw new Error(orderError.message)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la commande")
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: C.muted, fontFamily: "Inter, sans-serif" }}>Chargement...</p>
    </div>
  )

  if (error && !boutique) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h1 style={{ color: C.white, fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: 700 }}>Boutique introuvable</h1>
        <p style={{ color: C.muted, fontFamily: "Inter, sans-serif" }}>Vérifie le lien et réessaie.</p>
      </div>
    </div>
  )

  if (success) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h1 style={{ color: C.white, fontSize: 24, fontWeight: 800, margin: "0 0 8px 0" }}>Commande envoyée !</h1>
        <p style={{ color: C.muted, fontSize: 15, margin: "0 0 24px 0", lineHeight: 1.6 }}>
          Merci <strong style={{ color: C.white }}>{form.customer_name}</strong> !<br/>
          On te contacte sur le <strong style={{ color: C.white }}>{form.phone}</strong>.
        </p>
        <div style={{ background: C.successBg, border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 24 }}>
          <p style={{ color: C.success, fontSize: 14, fontWeight: 600, margin: 0 }}>✓ Total : {fmt(totalFinal)}</p>
        </div>
        {boutique?.phone && (
          <a href={`https://wa.me/${boutique.phone.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Bonjour ! J'ai commandé sur ${boutique.name}. Nom: ${form.customer_name}, Tél: ${form.phone}`)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", background: "#25D366", borderRadius: 10, padding: "12px 24px", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            💬 Confirmer sur WhatsApp
          </a>
        )}
      </div>
    </div>
  )

  const inp = { width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.white, fontSize: 14, outline: "none", boxSizing: "border-box" as const }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "16px 20px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ color: C.white, fontSize: 18, fontWeight: 800, margin: 0 }}>{boutique?.name}</h1>
            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
              {fraisLivraison === 0 ? "🚚 Livraison gratuite" : `🚚 Livraison : ${fmt(fraisLivraison)}`}
            </p>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setStep("form")} style={{ background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, border: "none", borderRadius: 10, padding: "10px 16px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              🛒 {cart.length} · {fmt(totalProduits)}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 100px" }}>

        {/* CATALOGUE */}
        {step === "catalogue" && (
          <>
            {products.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                <p style={{ color: C.muted }}>Aucun produit disponible.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ color: C.muted, fontSize: 13, margin: "0 0 8px 0" }}>{products.length} produit{products.length > 1 ? "s" : ""} disponible{products.length > 1 ? "s" : ""}</p>
                {products.map(product => {
                  const cartItem = cart.find(i => i.product.id === product.id)
                  return (
                    <div key={product.id} style={{ background: C.card, border: `1px solid ${cartItem ? C.gold : C.border}`, borderRadius: 16, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 72, height: 72, borderRadius: 10, background: C.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>📦</div>
                        )}
                        <div style={{ flex: 1 }}>
                          <h3 style={{ color: C.white, fontSize: 15, fontWeight: 700, margin: "0 0 4px 0" }}>{product.name}</h3>
                          {product.description && <p style={{ color: C.muted, fontSize: 13, margin: "0 0 8px 0", lineHeight: 1.5 }}>{product.description}</p>}
                          <p style={{ color: C.gold, fontSize: 16, fontWeight: 800, margin: 0 }}>{fmt(product.price)}</p>
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        {!cartItem ? (
                          <button onClick={() => addToCart(product)} style={{ width: "100%", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, border: "none", borderRadius: 10, padding: "11px", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                            + Ajouter au panier
                          </button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <button onClick={() => updateQty(product.id, cartItem.quantity - 1)} style={{ width: 36, height: 36, borderRadius: 8, background: C.border, border: "none", color: C.white, fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
                            <span style={{ color: C.white, fontSize: 16, fontWeight: 700, flex: 1, textAlign: "center" }}>{cartItem.quantity}</span>
                            <button onClick={() => updateQty(product.id, cartItem.quantity + 1)} style={{ width: 36, height: 36, borderRadius: 8, background: C.gold, border: "none", color: "#000", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {cart.length > 0 && (
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px", background: C.bg, borderTop: `1px solid ${C.border}`, zIndex: 40 }}>
                <div style={{ maxWidth: 600, margin: "0 auto" }}>
                  <button onClick={() => setStep("form")} style={{ width: "100%", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, border: "none", borderRadius: 12, padding: "15px", color: "#000", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
                    Commander · {fmt(totalFinal)} →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* FORMULAIRE */}
        {step === "form" && (
          <>
            <button onClick={() => setStep("catalogue")} style={{ background: "none", border: "none", color: C.gold, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "0 0 20px 0" }}>
              ← Modifier le panier
            </button>

            {/* Récap panier */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <h3 style={{ color: C.white, fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" }}>🛒 Ton panier</h3>
              {cart.map(item => (
                <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.white, fontSize: 14 }}>{item.product.name} × {item.quantity}</span>
                  <span style={{ color: C.gold, fontSize: 14, fontWeight: 700 }}>{fmt(item.product.price * item.quantity)}</span>
                </div>
              ))}

              {/* Frais livraison — automatique selon config e-commerçant */}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Livraison</span>
                <span style={{ color: fraisLivraison === 0 ? C.success : C.mutedLight, fontSize: 13, fontWeight: 600 }}>
                  {fraisLivraison === 0 ? "🚚 Gratuite" : fmt(fraisLivraison)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0 0" }}>
                <span style={{ color: C.white, fontSize: 15, fontWeight: 700 }}>Total</span>
                <span style={{ color: C.gold, fontSize: 18, fontWeight: 800 }}>{fmt(totalFinal)}</span>
              </div>
            </div>

            {/* Formulaire */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Ton prénom et nom", key: "customer_name", placeholder: "Ex: Kofi Mensah", type: "text" },
                { label: "Ton numéro WhatsApp", key: "phone", placeholder: "Ex: +228 90 00 00 00", type: "tel" },
                { label: "Ton adresse / quartier", key: "address", placeholder: "Ex: Adidogomé, près du carrefour", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{f.label} <span style={{ color: C.gold }}>*</span></label>
                  <input type={f.type} value={(form as Record<string,string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    style={inp} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Ville <span style={{ color: C.gold }}>*</span></label>
                <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  style={{ ...inp, appearance: "none" as const, cursor: "pointer" }}
                  onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border}>
                  {VILLES.map(v => <option key={v} value={v} style={{ background: "#111118" }}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Type de livraison</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["Livraison directe", "Envoi gare"].map(type => (
                    <button key={type} onClick={() => setForm(p => ({ ...p, delivery_type: type }))}
                      style={{ flex: 1, padding: "11px", borderRadius: 10, border: `2px solid ${form.delivery_type === type ? C.gold : C.border}`, background: form.delivery_type === type ? "rgba(245,158,11,0.1)" : "transparent", color: form.delivery_type === type ? C.gold : C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      {type === "Livraison directe" ? "🏠 Livraison" : "🚌 Gare"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Note (optionnel)</label>
                <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Instructions spéciales..." rows={3}
                  style={{ ...inp, resize: "none" as const, fontFamily: "Inter, sans-serif" }}
                  onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
              </div>
            </div>

            {error && <div style={{ background: C.dangerBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 16, color: C.danger, fontSize: 13 }}>⚠️ {error}</div>}

            <button onClick={handleSubmit} disabled={submitting} style={{ width: "100%", marginTop: 20, background: submitting ? C.goldDim : `linear-gradient(135deg,${C.gold},${C.goldDark})`, border: "none", borderRadius: 12, padding: "16px", color: "#000", fontSize: 16, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", minHeight: 52 }}>
              {submitting ? "Envoi en cours..." : `✅ Confirmer · ${fmt(totalFinal)}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
