"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/app/lib/supabase"
import {
  initPixel, trackAddToCart, trackPurchase, trackInitiateCheckout, serverTrackPurchase
} from "@/lib/facebookPixel"
import { initTiktokPixel, tiktokTrackAddToCart, tiktokTrackPurchase, tiktokTrackInitiateCheckout } from "@/lib/tiktokPixel"
import { initGA, gaTrackAddToCart, gaTrackBeginCheckout, gaTrackPurchase } from "@/lib/googleAnalytics"
import { useClientCurrency } from "@/hooks/useClientCurrency"

// Indicatifs téléphoniques par pays
const COUNTRY_DIALCODES: Record<string, { code: string; flag: string; dial: string }> = {
  TG: { code: "TG", flag: "🇹🇬", dial: "+228" },
  SN: { code: "SN", flag: "🇸🇳", dial: "+221" },
  CI: { code: "CI", flag: "🇨🇮", dial: "+225" },
  ML: { code: "ML", flag: "🇲🇱", dial: "+223" },
  BF: { code: "BF", flag: "🇧🇫", dial: "+226" },
  BJ: { code: "BJ", flag: "🇧🇯", dial: "+229" },
  NE: { code: "NE", flag: "🇳🇪", dial: "+227" },
  GN: { code: "GN", flag: "🇬🇳", dial: "+224" },
  NG: { code: "NG", flag: "🇳🇬", dial: "+234" },
  GH: { code: "GH", flag: "🇬🇭", dial: "+233" },
  CM: { code: "CM", flag: "🇨🇲", dial: "+237" },
  CD: { code: "CD", flag: "🇨🇩", dial: "+243" },
  CG: { code: "CG", flag: "🇨🇬", dial: "+242" },
  MA: { code: "MA", flag: "🇲🇦", dial: "+212" },
  DZ: { code: "DZ", flag: "🇩🇿", dial: "+213" },
  TN: { code: "TN", flag: "🇹🇳", dial: "+216" },
  EG: { code: "EG", flag: "🇪🇬", dial: "+20" },
  KE: { code: "KE", flag: "🇰🇪", dial: "+254" },
  ZA: { code: "ZA", flag: "🇿🇦", dial: "+27" },
  FR: { code: "FR", flag: "🇫🇷", dial: "+33" },
  BE: { code: "BE", flag: "🇧🇪", dial: "+32" },
  CH: { code: "CH", flag: "🇨🇭", dial: "+41" },
  DE: { code: "DE", flag: "🇩🇪", dial: "+49" },
  GB: { code: "GB", flag: "🇬🇧", dial: "+44" },
  US: { code: "US", flag: "🇺🇸", dial: "+1" },
  CA: { code: "CA", flag: "🇨🇦", dial: "+1" },
  OTHER: { code: "OTHER", flag: "🌍", dial: "+" },
}
const DEFAULT_COUNTRY = COUNTRY_DIALCODES["TG"]

const C = {
  bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  white: "#F8F8FC", muted: "#55556A", mutedLight: "#9898B0",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", successBg: "rgba(74,222,128,0.06)",
}

interface Product {
  id: string
  name: string
  price: number
  description?: string
  image_url?: string
  badge?: string
}

interface CartItem {
  id: string
  name: string
  price: number
  image_url?: string
  badge?: string
  quantity: number
}

interface BoutiqueInfo {
  id: string
  name: string
  slug: string
  phone?: string
  delivery_fee: number
  currency: string
  brand_color: string
  logo_url?: string
  boutique_description?: string
  banner_text?: string
  countdown_end?: string
  banner_on_boutique?: boolean
  banner_on_produit?: boolean
  ga_measurement_id?: string
  facebook_pixel_id?: string
  facebook_access_token?: string
  tiktok_pixel_id?: string
}

export default function CommanderPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.boutique as string
  const searchParams = useSearchParams()

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")
  const [error, setError] = useState("")
  const [step, setStep] = useState<"catalogue" | "form">("catalogue")
  const [source, setSource] = useState("direct")
  const [zoneInfo, setZoneInfo] = useState<{ id: string; nom: string; frais: number; devise: string } | null>(null)
  const { formatPrice, clientCurrency, ready: currencyReady } = useClientCurrency(boutique?.currency || "FCFA")
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY)
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [countdown, setCountdown] = useState({ h: "00", m: "00", s: "00", active: false })
  const [form, setForm] = useState({
    customer_name: "", phone: "", city: "",
    address: "", delivery_type: "Livraison directe", note: "",
  })

  useEffect(() => {
    loadBoutique()

    // Détecter la source
    const src = searchParams?.get("src") || detectSource()
    setSource(src)

    // Détecter pays du client pour indicatif téléphonique
    const detectCountry = async () => {
      try {
        const geoRes = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) })
        if (geoRes.ok) {
          const geo = await geoRes.json()
          const country = COUNTRY_DIALCODES[geo.country_code]
          if (country) setSelectedCountry(country)
        }
      } catch { /* silencieux */ }
    }
    detectCountry()

    const saved = sessionStorage.getItem(`cart_${slug}`)
    if (saved) setCart(JSON.parse(saved))

    // Si on revient de la page produit avec step=form
    if (searchParams?.get("step") === "form") {
      setStep("form")
    }
  }, [slug])

  useEffect(() => {
    if (slug) sessionStorage.setItem(`cart_${slug}`, JSON.stringify(cart))
  }, [cart, slug])

  // Compte à rebours
  useEffect(() => {
    const endStr = boutique?.countdown_end
    if (!endStr || endStr === "") return
    const end = new Date(endStr).getTime()
    if (isNaN(end)) return
    if (end <= Date.now()) return

    const tick = () => {
      const diff = end - Date.now()
      if (diff <= 0) {
        setCountdown({ h: "00", m: "00", s: "00", active: false })
        return
      }
      const totalSec = Math.floor(diff / 1000)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      setCountdown({
        h: String(h).padStart(2, "0"),
        m: String(m).padStart(2, "0"),
        s: String(s).padStart(2, "0"),
        active: true
      })
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [boutique?.countdown_end])

  const loadBoutique = async () => {
    setLoading(true)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, slug, phone, delivery_fee, currency, brand_color, logo_url, boutique_description, banner_text, countdown_end, banner_on_boutique, banner_on_produit, ga_measurement_id, facebook_pixel_id, facebook_access_token, tiktok_pixel_id")
      .eq("slug", slug).single()

    if (!tenant) { setError("Boutique introuvable."); setLoading(false); return }

    setBoutique({
      id: tenant.id, name: tenant.name, slug: tenant.slug,
      phone: tenant.phone, delivery_fee: tenant.delivery_fee || 0,
      currency: tenant.currency || "FCFA",
      brand_color: tenant.brand_color || "#F59E0B",
      logo_url: tenant.logo_url || "",
      boutique_description: tenant.boutique_description || "",
      banner_text: tenant.banner_text || "",
      countdown_end: tenant.countdown_end || "",
      banner_on_boutique: tenant.banner_on_boutique !== false,
      banner_on_produit: tenant.banner_on_produit === true,
      ga_measurement_id: tenant.ga_measurement_id || "",
      facebook_pixel_id: tenant.facebook_pixel_id,
      facebook_access_token: tenant.facebook_access_token,
      tiktok_pixel_id: tenant.tiktok_pixel_id,
    })

    // Initialiser pixels
    if (tenant.facebook_pixel_id) initPixel(tenant.facebook_pixel_id)
    if (tenant.tiktok_pixel_id) initTiktokPixel(tenant.tiktok_pixel_id)
    if (tenant.ga_measurement_id) initGA(tenant.ga_measurement_id)

    const { data: prods } = await supabase
      .from("products").select("id, name, price, description, image_url")
      .eq("tenant_id", tenant.id).eq("is_active", true).order("name")
    setProducts(prods || [])
    setLoading(false)
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: product.id, name: product.name, price: product.price, image_url: product.image_url, quantity: 1 }]
    })
    // Track AddToCart
    const cur = boutique?.currency || "FCFA"
    if (boutique?.facebook_pixel_id) trackAddToCart(boutique.facebook_pixel_id, product.name, product.price, 1, cur)
    if (boutique?.tiktok_pixel_id) tiktokTrackAddToCart(boutique.tiktok_pixel_id, product.name, product.price, cur)
    if (boutique?.ga_measurement_id) gaTrackAddToCart(boutique.ga_measurement_id, product.name, product.price, 1, cur)
  }

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); return }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
  }

  const getQty = (id: string) => cart.find(i => i.id === id)?.quantity || 0

  const fraisLivraison = zoneInfo ? zoneInfo.frais : (boutique?.delivery_fee || 0)
  const deviseActive = zoneInfo ? zoneInfo.devise : (boutique?.currency || "FCFA")
  const totalProduits = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalFinal = totalProduits + fraisLivraison
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)
  const fmt = (n: number) => formatPrice(n, boutique?.currency || "FCFA")

  function detectSource(): string {
    if (typeof window === "undefined") return "direct"
    const ref = document.referrer.toLowerCase()
    const src = new URLSearchParams(window.location.search).get("src")
    if (src) return src
    if (ref.includes("facebook") || ref.includes("fb.com")) return "facebook"
    if (ref.includes("instagram")) return "instagram"
    if (ref.includes("tiktok")) return "tiktok"
    if (ref.includes("twitter") || ref.includes("x.com")) return "twitter"
    if (ref.includes("whatsapp")) return "whatsapp"
    if (ref.includes("google")) return "google"
    if (ref.includes("youtube")) return "youtube"
    if (ref === "") return "direct"
    return "autre"
  }

  const handleSubmit = async () => {
    if (!form.customer_name.trim()) { setError("Ton nom est requis"); return }
    if (!form.phone.trim()) { setError("Ton numéro est requis"); return }
    // Combiner indicatif + numéro
    const fullPhone = selectedCountry.dial + form.phone.trim().replace(/^0/, "")
    setForm(p => ({ ...p, phone: fullPhone }))
    if (!form.city.trim()) { setError("Ta ville est requise"); return }
    if (cart.length === 0) { setError("Ajoute au moins un produit"); return }
    setError(""); setSubmitting(true)

    try {
      const productNames = cart.map(i => `${i.name} x${i.quantity}`).join(", ")
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
        source: source,
        zone_id: zoneInfo?.id || null,
        zone_nom: zoneInfo?.nom || null,
        note: form.note.trim() || null,
      })

      if (orderError) throw new Error(orderError.message)

      // Générer numéro de commande lisible
      const now = new Date()
      const orderNum = `#${boutique!.slug.toUpperCase().slice(0,3)}-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
      setOrderNumber(orderNum)

      // Track Purchase — pixel client
      const orderRef = `order_${Date.now()}`
      const currency = boutique?.currency || "FCFA"
      if (boutique?.facebook_pixel_id) {
        trackPurchase(boutique.facebook_pixel_id, totalFinal, orderRef, currency)
      }
      if (boutique?.tiktok_pixel_id) {
        tiktokTrackPurchase(boutique.tiktok_pixel_id, totalFinal, currency)
      }
      if (boutique?.ga_measurement_id) {
        gaTrackPurchase(boutique.ga_measurement_id, totalFinal, orderRef, currency)
      }

      // Track Purchase — API Conversions côté serveur (plus fiable iOS 14)
      if (boutique?.facebook_pixel_id && boutique?.facebook_access_token) {
        await serverTrackPurchase(
          boutique.facebook_pixel_id,
          boutique.facebook_access_token,
          totalFinal,
          form.phone.trim()
        )
      }

      sessionStorage.removeItem(`cart_${slug}`)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur")
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
        <p style={{ color: C.white, fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700 }}>Boutique introuvable</p>
      </div>
    </div>
  )

  if (success) return (
    <div style={{ minHeight: "100vh", background: "#080810", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 16px", textAlign: "center" }}>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{boutique?.name}</p>
        {zoneInfo && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:20, padding:"3px 10px", marginTop:6 }}>
            <span style={{ fontSize:12 }}>🌍</span>
            <span style={{ color:"#F59E0B", fontSize:11, fontWeight:600 }}>{zoneInfo.nom}</span>
            {zoneInfo.frais === 0
              ? <span style={{ color:"#4ADE80", fontSize:11 }}>· Livraison gratuite</span>
              : <span style={{ color:"#9898B0", fontSize:11 }}>· Livraison {zoneInfo.frais.toLocaleString("fr-FR")} {zoneInfo.devise}</span>
            }
          </div>
        )}
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "24px 16px" }}>

        {/* Icône succès */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(74,222,128,0.12)", border: "2px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 16px" }}>✅</div>
          <h1 style={{ color: C.white, fontSize: 22, fontWeight: 800, margin: "0 0 6px 0" }}>Commande confirmée !</h1>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Merci <strong style={{ color: C.white }}>{form.customer_name}</strong> !</p>
        </div>

        {/* Numéro de commande */}
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, textAlign: "center" }}>
          <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: 1 }}>Numéro de commande</p>
          <p style={{ color: C.gold, fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: 2 }}>{orderNumber}</p>
          <p style={{ color: C.muted, fontSize: 11, margin: "4px 0 0 0" }}>Garde ce numéro pour suivre ta commande</p>
        </div>

        {/* Récap commande */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ color: C.white, fontSize: 13, fontWeight: 700, margin: "0 0 12px 0" }}>📦 Récapitulatif</p>
          {cart.map(item => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />}
                <div>
                  <p style={{ color: C.white, fontSize: 13, fontWeight: 600, margin: 0 }}>{item.name}</p>
                  <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>× {item.quantity}</p>
                </div>
              </div>
              <span style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}>{fmt(item.price * item.quantity)}</span>
            </div>
          ))}
          {fraisLivraison > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.muted, fontSize: 13 }}>Frais de livraison</span>
              <span style={{ color: C.white, fontSize: 13 }}>{fmt(fraisLivraison)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0 0" }}>
            <span style={{ color: C.white, fontSize: 15, fontWeight: 700 }}>Total</span>
            <span style={{ color: C.gold, fontSize: 18, fontWeight: 800 }}>{fmt(totalFinal)}</span>
          </div>
        </div>

        {/* Infos livraison */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ color: C.white, fontSize: 13, fontWeight: 700, margin: "0 0 10px 0" }}>🚚 Infos livraison</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.muted, fontSize: 13 }}>Nom</span>
              <span style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{form.customer_name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.muted, fontSize: 13 }}>Téléphone</span>
              <span style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{form.phone}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.muted, fontSize: 13 }}>Ville</span>
              <span style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{form.city}</span>
            </div>
            {form.address && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Adresse</span>
                <span style={{ color: C.white, fontSize: 13, fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{form.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Message rassurant */}
        <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, textAlign: "center" }}>
          <p style={{ color: C.success, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            📞 Notre équipe va vous appeler bientôt au <strong>{form.phone}</strong> pour confirmer votre commande.
          </p>
        </div>

        {/* Bouton WhatsApp */}
        {boutique?.phone && (
          <a href={`https://wa.me/${boutique.phone.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Bonjour ! J'ai commandé sur ${boutique.name}.\nCommande: ${orderNumber}\nNom: ${form.customer_name}\nTél: ${form.phone}\nVille: ${form.city}`)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: "block", background: "#25D366", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none", textAlign: "center", marginBottom: 12 }}>
            💬 Contacter la boutique sur WhatsApp
          </a>
        )}

        {/* Retour boutique */}
        <a href={`/commander/${boutique?.slug}`}
          style={{ display: "block", background: C.border, borderRadius: 12, padding: "14px", color: C.white, fontSize: 14, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
          🛍️ Continuer mes achats
        </a>

      </div>
    </div>
  )

  const inp = { width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.white, fontSize: 14, outline: "none", boxSizing: "border-box" as const }

  return (
    <div style={{ minHeight: "100vh", background: "#080810", fontFamily: "Inter, sans-serif" }}>
      {/* Header horizontal premium */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#080810", borderBottom: "1px solid #ffffff0a", backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>

          {/* Logo + Nom */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            {boutique?.logo_url ? (
              <img src={boutique.logo_url} alt={boutique.name}
                style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain", background: "#16161F", padding: 3, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 10, background: boutique?.brand_color || "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, fontWeight: 800, color: "#000" }}>
                {boutique?.name?.charAt(0) || "S"}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ color: "#F8F8FC", fontSize: 16, fontWeight: 800, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {boutique?.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: fraisLivraison === 0 ? "#4ADE80" : "#9898B0", fontSize: 11, fontWeight: 500 }}>
                  {fraisLivraison === 0 ? "✓ Livraison gratuite" : `Livraison ${fmt(fraisLivraison)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Icône panier */}
          <button onClick={() => totalItems > 0 && setStep("form")}
            style={{ position: "relative", background: totalItems > 0 ? (boutique?.brand_color || "#F59E0B") : "#1E1E2E", border: "none", borderRadius: 12, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: totalItems > 0 ? "pointer" : "default", flexShrink: 0 }}>
            <span style={{ fontSize: 20 }}>🛒</span>
            {totalItems > 0 && (
              <div style={{ position: "absolute", top: -4, right: -4, background: "#EF4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, border: "2px solid #080810" }}>
                {totalItems}
              </div>
            )}
          </button>
        </div>

        {/* Slogan sous le header */}
        {boutique?.boutique_description && (
          <div style={{ background: `${boutique.brand_color}15`, borderTop: "1px solid #ffffff06", padding: "7px 16px", textAlign: "center" }}>
            <p style={{ color: "#9898B0", fontSize: 12, margin: 0 }}>{boutique.boutique_description}</p>
          </div>
        )}
      </div>

      {/* Bandeau défilant */}
      {boutique?.banner_text && boutique?.banner_on_boutique && (
        <div style={{ background: `${boutique.brand_color}18`, borderBottom: "1px solid #ffffff08", overflow: "hidden", whiteSpace: "nowrap", padding: "8px 0" }}>
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-track {
              display: inline-flex;
              animation: marquee 18s linear infinite;
              will-change: transform;
            }
            .marquee-track:hover { animation-play-state: paused; }
          `}</style>
          <div className="marquee-track">
            {[...Array(8)].map((_, i) => (
              <span key={i} style={{ color: "#F8F8FC", fontSize: 12, fontWeight: 500, opacity: 0.9, paddingRight: 40 }}>
                {boutique.banner_text} <span style={{ opacity: 0.4, paddingRight: 40 }}>•</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Compte à rebours */}
      {countdown.active && (
        <div style={{ background: "#1A0A00", borderBottom: "2px solid #F59E0B", padding: "10px 16px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{ color: "#F59E0B", fontSize: 13, fontWeight: 700 }}>⏰ Offre expire dans</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {[countdown.h, countdown.m, countdown.s].map((val, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: "#F59E0B", color: "#000", borderRadius: 8, padding: "4px 10px", fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{val}</span>
                {i < 2 && <span style={{ color: "#F59E0B", fontSize: 16, fontWeight: 800 }}>:</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 12px 100px" }}>

        {step === "catalogue" && (
          <>
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 14px 0" }}>
              {products.length} produit{products.length > 1 ? "s" : ""}
            </p>
            {products.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                <p style={{ color: C.muted }}>Aucun produit disponible.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {products.map(product => {
                  const qty = getQty(product.id)
                  const bc = boutique?.brand_color || "#F59E0B"
                  return (
                    <div key={product.id}
                      style={{ borderRadius: 20, overflow: "hidden", position: "relative", background: "#111118", border: `1px solid ${qty > 0 ? bc : "#ffffff0a"}` }}>
                      {/* Photo */}
                      <div onClick={() => router.push(`/commander/${slug}/produit/${product.id}`)}
                        style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", cursor: "pointer", background: "#16161F" }}>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📦</div>
                        )}
                        {/* Overlay léger en bas */}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "25%", background: "linear-gradient(transparent, rgba(0,0,0,0.4))" }} />
                        {/* Badge promo */}
                        {product.badge && (
                          <div style={{ position: "absolute", top: 8, left: 8, background: product.badge === "PROMO" ? "#EF4444" : product.badge === "NOUVEAU" ? "#8B5CF6" : product.badge === "BEST-SELLER" ? "#F59E0B" : "#3B82F6", color: "#fff", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>
                            {product.badge}
                          </div>
                        )}
                        {/* Badge quantité */}
                        {qty > 0 && (
                          <div style={{ position: "absolute", top: 8, right: 8, background: bc, color: "#000", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>
                            {qty}
                          </div>
                        )}
                      </div>
                      {/* Infos + bouton */}
                      <div style={{ padding: "8px 10px 10px" }}>
                        <p onClick={() => router.push(`/commander/${slug}/produit/${product.id}`)}
                          style={{ color: "#F8F8FC", fontSize: 12, fontWeight: 600, margin: "0 0 2px 0", lineHeight: 1.3, cursor: "pointer", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                          {product.name}
                        </p>
                        <p style={{ color: bc, fontSize: 14, fontWeight: 800, margin: "2px 0 8px 0" }}>{fmt(product.price)}</p>
                        {qty === 0 ? (
                          <button onClick={() => addToCart(product)}
                            style={{ width: "100%", background: bc, border: "none", borderRadius: 10, padding: "8px 0", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                            + Ajouter
                          </button>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0A0A0F", borderRadius: 10, padding: "3px 6px" }}>
                              <button onClick={() => updateQty(product.id, qty - 1)} style={{ width: 28, height: 28, borderRadius: 7, background: "#1E1E2E", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>−</button>
                              <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{qty}</span>
                              <button onClick={() => updateQty(product.id, qty + 1)} style={{ width: 28, height: 28, borderRadius: 7, background: bc, border: "none", color: "#000", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>+</button>
                            </div>
                            <button onClick={() => setStep("form")}
                              style={{ width: "100%", background: "transparent", border: `1.5px solid ${bc}`, borderRadius: 10, padding: "5px 0", color: bc, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              🛒 Voir le panier
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {totalItems > 0 && (
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: C.bg, borderTop: `1px solid ${C.border}`, zIndex: 40 }}>
                <div style={{ maxWidth: 700, margin: "0 auto" }}>
                  <button onClick={() => setStep("form")} style={{ width: "100%", background: boutique?.brand_color || C.gold, border: "none", borderRadius: 12, padding: "15px", color: "#000", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
                    Commander · {fmt(totalFinal)} →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {step === "form" && (
          <>
            <button onClick={() => setStep("catalogue")} style={{ background: "none", border: "none", color: C.gold, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "0 0 20px 0" }}>
              ← Modifier le panier
            </button>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <h3 style={{ color: C.white, fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" }}>🛒 Ton panier</h3>
              {cart.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <p style={{ color: C.white, fontSize: 13, fontWeight: 600, margin: 0 }}>{item.name}</p>
                    <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>× {item.quantity}</p>
                  </div>
                  <span style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}>{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
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
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Nom */}
              <div>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Ton prénom et nom <span style={{ color: C.gold }}>*</span></label>
                <input type="text" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Ex: Kofi Mensah"
                  style={inp} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
              </div>

              {/* Téléphone avec indicatif */}
              <div>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Ton numéro WhatsApp <span style={{ color: C.gold }}>*</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  {/* Sélecteur pays */}
                  <div style={{ position: "relative" }}>
                    <button type="button" onClick={() => setShowCountryPicker(p => !p)}
                      style={{ height: 46, padding: "0 10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.white, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 18 }}>{selectedCountry.flag}</span>
                      <span style={{ color: C.mutedLight, fontSize: 13 }}>{selectedCountry.dial}</span>
                      <span style={{ color: C.muted, fontSize: 10 }}>▼</span>
                    </button>
                    {showCountryPicker && (
                      <div style={{ position: "absolute", top: 50, left: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, zIndex: 100, maxHeight: 200, overflowY: "auto", minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                        {Object.values(COUNTRY_DIALCODES).filter(c => c.code !== "OTHER").map(c => (
                          <div key={c.code} onClick={() => { setSelectedCountry(c); setShowCountryPicker(false) }}
                            style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}`,
                              background: selectedCountry.code === c.code ? "rgba(245,158,11,0.1)" : "transparent" }}>
                            <span style={{ fontSize: 18 }}>{c.flag}</span>
                            <span style={{ color: C.white, fontSize: 13 }}>{c.dial}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Numéro */}
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="90 00 00 00"
                    style={{ ...inp, flex: 1 }}
                    onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Ton adresse / quartier <span style={{ color: C.gold }}>*</span></label>
                <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Ex: Adidogomé, près du carrefour"
                  style={inp} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
              </div>
              <div>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Ville <span style={{ color: C.gold }}>*</span></label>
                <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="Ex: Lomé, Abidjan, Dakar..."
                  style={inp}
                  onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
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

      {/* Footer boutique */}
      <div style={{ background: C.card, borderTop: `1px solid ${C.border}`, padding: "20px 16px", textAlign: "center", marginTop: 20 }}>
        <p style={{ color: C.white, fontSize: 14, fontWeight: 700, margin: "0 0 4px 0" }}>{boutique?.name}</p>
        {boutique?.phone && (
          <a href={`https://wa.me/${boutique.phone.replace(/[^0-9]/g, "")}`}
            target="_blank" rel="noopener noreferrer"
            style={{ color: "#25D366", fontSize: 13, textDecoration: "none", display: "inline-block", marginBottom: 12 }}>
            💬 Nous contacter sur WhatsApp
          </a>
        )}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
          <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>
            Propulsé par{" "}
            <a href="https://shipivo.app" target="_blank" rel="noopener noreferrer"
              style={{ color: boutique?.brand_color || C.gold, textDecoration: "none", fontWeight: 600 }}>
              Shipivo
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
