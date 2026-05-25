// src/app/widget/page.tsx
// Page iframe du widget Shipivo — formulaire de commande embarqué

"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/app/lib/supabase"
const C = {
  bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  white: "#F8F8FC", muted: "#55556A", mutedLight: "#9898B0",
}

interface Product {
  id: string
  name: string
  price: number
  description?: string
  image_url?: string
}

interface BoutiqueInfo {
  id: string
  name: string
  slug: string
  phone?: string
  delivery_fee: number
  currency: string
  brand_color: string
}

function WidgetContent() {
  const searchParams = useSearchParams()
  const slug = searchParams?.get("boutique") || ""
  const produitId = searchParams?.get("produit") || ""
  const produitNom = searchParams?.get("produit_nom") || ""
  const produitPrix = searchParams?.get("produit_prix") || ""
  const produitImage = searchParams?.get("produit_image") || ""
  const mode = searchParams?.get("mode") || "form"
  const couleur = searchParams?.get("couleur") || "#F59E0B"
  const bgTransparent = searchParams?.get("bg") === "transparent"
  const btnText = searchParams?.get("btn") || "Commander — Paiement à la livraison"

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    customer_name: "", phone: "", city: "", address: "", note: ""
  })
  const [dialCode, setDialCode] = useState("+228")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      if (!slug) return
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, name, slug, phone, delivery_fee, currency, brand_color")
        .eq("slug", slug).single()
      if (tenant) setBoutique(tenant)

      if (produitId) {
        const { data: prod } = await supabase
          .from("products")
          .select("id, name, price, description, image_url")
          .eq("id", produitId).single()
        if (prod) setProduct(prod)
      } else if (produitNom) {
        // Produit passé directement depuis le site externe (Shopify, WordPress...)
        setProduct({
          id: "external",
          name: produitNom,
          price: Number(produitPrix) || 0,
          image_url: produitImage || undefined,
        })
      }
      setLoading(false)
    }
    load()
  }, [slug, produitId])

  // Détecter pays du client
  useEffect(() => {
    const detect = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) })
        if (res.ok) {
          const geo = await res.json()
          const codes: Record<string, string> = {
            TG: "+228", SN: "+221", CI: "+225", BJ: "+229", NG: "+234",
            GH: "+233", FR: "+33", BE: "+32", DE: "+49", GB: "+44", US: "+1"
          }
          if (codes[geo.country_code]) setDialCode(codes[geo.country_code])
        }
      } catch {}
    }
    detect()
  }, [])

  // Envoyer la hauteur au parent — resize auto
  useEffect(() => {
    const sendHeight = () => {
      if (containerRef.current) {
        // scrollHeight + padding pour éviter la scrollbar
        const h = containerRef.current.scrollHeight + 16
        window.parent.postMessage({ type: "shipivo-resize", height: h }, "*")
      }
    }
    // Envoyer immédiatement puis à chaque changement
    sendHeight()
    const timer = setTimeout(sendHeight, 300)
    const timer2 = setTimeout(sendHeight, 800)
    const obs = new ResizeObserver(() => { sendHeight() })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => {
      obs.disconnect()
      clearTimeout(timer)
      clearTimeout(timer2)
    }
  })

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " " + (boutique?.currency || "FCFA")
  const bc = couleur
  const inp = {
    width: "100%", background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "10px 12px", color: C.white, fontSize: 14,
    outline: "none", boxSizing: "border-box" as const,
  }

  const handleSubmit = async () => {
    if (!form.customer_name.trim()) { setError("Nom requis"); return }
    if (!form.phone.trim()) { setError("Numéro requis"); return }
    if (!form.city.trim()) { setError("Ville requise"); return }
    if (!boutique) return

    setSubmitting(true); setError("")
    const fullPhone = dialCode + form.phone.trim().replace(/^0/, "")
    const productName = product?.name || form.note || "Commande directe"
    const amount = (product?.price || 0) + (boutique.delivery_fee || 0)

    const { error: err } = await supabase.from("orders").insert({
      tenant_id: boutique.id,
      customer_name: form.customer_name.trim(),
      phone: fullPhone,
      city: form.city.trim(),
      address: form.address.trim(),
      product: productName,
      quantity: 1,
      amount,
      status: "En attente",
      source: "widget",
      note: form.note.trim() || null,
    })

    if (err) { setError(err.message); setSubmitting(false); return }

    // Notifier la page parent
    window.parent.postMessage({
      type: "shipivo-success",
      order: { customer: form.customer_name, phone: fullPhone, product: productName }
    }, "*")

    setSuccess(true)
    setSubmitting(false)
  }

  const bgColor = bgTransparent ? "transparent" : C.bg

  if (loading) return (
    <div ref={containerRef} style={{ background: "transparent", padding: 24, textAlign: "center", color: C.muted, fontFamily: "Inter, sans-serif" }}>
      Chargement...
    </div>
  )

  if (success) return (
    <div ref={containerRef} style={{ background: bgColor, borderRadius: bgTransparent ? 0 : 12, padding: 24, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <h3 style={{ color: C.white, margin: "0 0 8px 0", fontSize: 18, fontWeight: 700 }}>Commande envoyée !</h3>
      <p style={{ color: C.muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
        Merci <strong style={{ color: C.white }}>{form.customer_name}</strong> !<br/>
        Notre équipe vous appellera bientôt au <strong style={{ color: C.white }}>{dialCode}{form.phone}</strong>.
      </p>
    </div>
  )

  return (
    <div ref={containerRef} style={{ background: C.bg, borderRadius: 12, padding: 16, fontFamily: "Inter, sans-serif" }}>

      {/* Produit si mode full */}
      {mode === "full" && product && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, padding: 12, background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
          {product.image_url && (
            <img src={product.image_url} alt={product.name}
              style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
          )}
          <div>
            <p style={{ color: C.white, fontWeight: 700, fontSize: 14, margin: "0 0 4px 0" }}>{product.name}</p>
            <p style={{ color: bc, fontWeight: 800, fontSize: 16, margin: 0 }}>{fmt(product.price)}</p>
            {boutique?.delivery_fee ? (
              <p style={{ color: C.muted, fontSize: 12, margin: "2px 0 0 0" }}>+ {fmt(boutique.delivery_fee)} livraison</p>
            ) : (
              <p style={{ color: "#4ADE80", fontSize: 12, margin: "2px 0 0 0" }}>✓ Livraison gratuite</p>
            )}
          </div>
        </div>
      )}

      {/* En-tête boutique */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ color: C.white, fontSize: 14, fontWeight: 700, margin: "0 0 2px 0" }}>
          {boutique?.name}
        </p>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Paiement à la livraison</p>
      </div>

      {/* Formulaire */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Produit libre si pas de produit configuré */}
        {!product && (
          <div>
            <label style={{ display: "block", color: C.mutedLight, fontSize: 12, marginBottom: 5 }}>
              Produit souhaité <span style={{ color: bc }}>*</span>
            </label>
            <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Ex: Crème massage 50ml, couleur rouge..." style={inp}
              onFocus={e => e.target.style.borderColor = bc}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>
        )}

        {/* Nom */}
        <div>
          <label style={{ display: "block", color: C.mutedLight, fontSize: 12, marginBottom: 5 }}>
            Prénom et nom <span style={{ color: bc }}>*</span>
          </label>
          <input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
            placeholder="Ex: Kofi Mensah" style={inp}
            onFocus={e => e.target.style.borderColor = bc}
            onBlur={e => e.target.style.borderColor = C.border} />
        </div>

        {/* Téléphone */}
        <div>
          <label style={{ display: "block", color: C.mutedLight, fontSize: 12, marginBottom: 5 }}>
            Téléphone WhatsApp <span style={{ color: bc }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={dialCode} onChange={e => setDialCode(e.target.value)}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 8px", color: C.white, fontSize: 13, outline: "none", flexShrink: 0 }}>
              {["+228","+221","+225","+229","+234","+233","+237","+212","+33","+32","+44","+1"].map(d => (
                <option key={d} value={d} style={{ background: "#111118" }}>{d}</option>
              ))}
            </select>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="90 00 00 00" type="tel" style={{ ...inp, flex: 1 }}
              onFocus={e => e.target.style.borderColor = bc}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>
        </div>

        {/* Ville */}
        <div>
          <label style={{ display: "block", color: C.mutedLight, fontSize: 12, marginBottom: 5 }}>
            Ville <span style={{ color: bc }}>*</span>
          </label>
          <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
            placeholder="Ex: Lomé, Abidjan, Lagos..." style={inp}
            onFocus={e => e.target.style.borderColor = bc}
            onBlur={e => e.target.style.borderColor = C.border} />
        </div>

        {/* Adresse */}
        <div>
          <label style={{ display: "block", color: C.mutedLight, fontSize: 12, marginBottom: 5 }}>Adresse / Quartier</label>
          <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
            placeholder="Ex: Adidogomé, carrefour Shell" style={inp}
            onFocus={e => e.target.style.borderColor = bc}
            onBlur={e => e.target.style.borderColor = C.border} />
        </div>

        {/* Note */}
        <div>
          <label style={{ display: "block", color: C.mutedLight, fontSize: 12, marginBottom: 5 }}>Note (optionnel)</label>
          <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
            placeholder="Instructions spéciales..." rows={2}
            style={{ ...inp, resize: "none", fontFamily: "Inter, sans-serif" }}
            onFocus={e => e.target.style.borderColor = bc}
            onBlur={e => e.target.style.borderColor = C.border} />
        </div>

        {error && (
          <p style={{ color: "#F87171", fontSize: 13, margin: 0, padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 8 }}>
            ⚠️ {error}
          </p>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          style={{ width: "100%", background: submitting ? "#92610A" : bc, border: "none", borderRadius: 10, padding: "14px", color: "#000", fontSize: 15, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", marginTop: 4 }}>
          {submitting ? "Envoi..." : `✅ ${btnText}`}
        </button>
      </div>
    </div>
  )
}

export default function WidgetPage() {
  return (
    <Suspense fallback={
      <div style={{ background: "#0A0A0F", padding: 24, textAlign: "center", color: "#55556A", fontFamily: "Inter, sans-serif", borderRadius: 12 }}>
        Chargement...
      </div>
    }>
      <WidgetContent />
    </Suspense>
  )
}
