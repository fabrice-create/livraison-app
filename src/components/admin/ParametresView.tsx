"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"
import { setCurrency } from "@/lib/utils"

const CURRENCIES = [
  { code: "FCFA", name: "FCFA — Franc CFA (Afrique de l'Ouest)" },
  { code: "XAF",  name: "XAF — Franc CFA (Afrique Centrale)" },
  { code: "USD",  name: "USD — Dollar américain" },
  { code: "EUR",  name: "EUR — Euro" },
  { code: "GBP",  name: "GBP — Livre sterling" },
  { code: "CAD",  name: "CAD — Dollar canadien" },
  { code: "CHF",  name: "CHF — Franc suisse" },
  { code: "NGN",  name: "NGN — Naira nigérian" },
  { code: "GHS",  name: "GHS — Cedi ghanéen" },
  { code: "GNF",  name: "GNF — Franc guinéen" },
  { code: "MAD",  name: "MAD — Dirham marocain" },
  { code: "DZD",  name: "DZD — Dinar algérien" },
  { code: "TND",  name: "TND — Dinar tunisien" },
  { code: "EGP",  name: "EGP — Livre égyptienne" },
  { code: "ZAR",  name: "ZAR — Rand sud-africain" },
  { code: "KES",  name: "KES — Shilling kényan" },
  { code: "ETB",  name: "ETB — Birr éthiopien" },
  { code: "AED",  name: "AED — Dirham des Émirats" },
  { code: "SAR",  name: "SAR — Riyal saoudien" },
  { code: "QAR",  name: "QAR — Riyal qatari" },
  { code: "BRL",  name: "BRL — Real brésilien" },
  { code: "MXN",  name: "MXN — Peso mexicain" },
  { code: "INR",  name: "INR — Roupie indienne" },
  { code: "CNY",  name: "CNY — Yuan chinois" },
  { code: "JPY",  name: "JPY — Yen japonais" },
  { code: "AUD",  name: "AUD — Dollar australien" },
]

const S = {
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", info: "#60A5FA", warning: "#FB923C",
  purple: "#C084FC",
}

const PLANS = [
  { id: "trial",      label: "Trial",      price: 0,      color: S.info,    bg: "rgba(96,165,250,0.1)",  features: ["Accès 14 jours", "Toutes fonctionnalités"] },
  { id: "starter",    label: "Starter",    price: 15000,  color: S.success, bg: "rgba(74,222,128,0.1)",  features: ["Jusqu'à 200 commandes/mois", "Boutique en ligne", "SMS inclus"] },
  { id: "pro",        label: "Pro",        price: 30000,  color: S.gold,    bg: "rgba(245,158,11,0.1)",  features: ["Commandes illimitées", "Pixels + Analytics", "Support prioritaire"] },
  { id: "business",   label: "Business",   price: 60000,  color: S.purple,  bg: "rgba(192,132,252,0.1)", features: ["Multi-boutiques", "API accès", "Manager dédié"] },
  { id: "enterprise", label: "Enterprise", price: 120000, color: S.danger,  bg: "rgba(248,113,113,0.1)", features: ["Sur mesure", "SLA garanti", "Onboarding inclus"] },
]

interface Props { tenantId: string }

interface ProfileSettings {
  full_name: string
  phone: string
  email: string
}

interface TenantSettings {
  name: string
  phone: string
  delivery_fee: number
  facebook_pixel_id: string
  facebook_access_token: string
  tiktok_pixel_id: string
  closer_commission: number
  driver_commission: number
  currency: string
  at_username: string
  at_api_key: string
  at_sender_id: string
  ga_measurement_id: string
  brand_color: string
  logo_url: string
  boutique_description: string
  banner_text: string
  countdown_end: string
  banner_on_boutique: boolean
  banner_on_produit: boolean
}

interface TenantPlan {
  plan: string
  subscription_status: string | null
  plan_expires_at: string | null
  trial_ends_at: string | null
}

interface Subscription {
  id: string
  plan: string
  status: string
  started_at: string
  expires_at: string
  amount: number
  payment_method: string
  created_at: string
}

const EMPTY: TenantSettings = {
  name: "", phone: "", delivery_fee: 0,
  facebook_pixel_id: "", facebook_access_token: "", tiktok_pixel_id: "",
  closer_commission: 500, driver_commission: 2000, currency: "FCFA",
  at_username: "", at_api_key: "", at_sender_id: "Shipivo",
  ga_measurement_id: "",
  brand_color: "#F59E0B", logo_url: "", boutique_description: "",
  banner_text: "", countdown_end: "",
  banner_on_boutique: true, banner_on_produit: false,
}

// ── Onglet Abonnement ───────────────────────────────────────
function AbonnementTab({ tenantId }: { tenantId: string }) {
  const [tenantPlan, setTenantPlan] = useState<TenantPlan | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [payLoading, setPayLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedMonths, setSelectedMonths] = useState(1)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => { loadPlan() }, [tenantId])

  const loadPlan = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("tenants")
      .select("plan, subscription_status, plan_expires_at, trial_ends_at")
      .eq("id", tenantId)
      .single()
    if (data) setTenantPlan(data)

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(10)
    setSubscriptions(subs || [])

    setLoading(false)
  }

  const handlePay = async () => {
    if (!selectedPlan) return
    setPayLoading(true); setError(""); setSuccess("")
    try {
      const plan = PLANS.find(p => p.id === selectedPlan)
      const amount = (plan?.price || 0) * selectedMonths

      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, plan: selectedPlan, months: selectedMonths, amount }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || "Erreur lors de l'initiation du paiement.")
        setPayLoading(false)
        return
      }

      // Ouvrir CinetPay dans un nouvel onglet
      window.open(data.payment_url, "_blank")
      setSuccess("Paiement initié — complète le paiement dans l'onglet ouvert.")
      setSelectedPlan(null)
    } catch {
      setError("Erreur réseau. Réessaie.")
    }
    setPayLoading(false)
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

  const daysLeft = () => {
    if (!tenantPlan) return null
    const expiry = tenantPlan.plan_expires_at || tenantPlan.trial_ends_at
    if (!expiry) return null
    const diff = new Date(expiry).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const days = daysLeft()
  const expired = days !== null && days <= 0
  const currentPlan = PLANS.find(p => p.id === (tenantPlan?.plan || "trial")) || PLANS[0]

  if (loading) return <p style={{ color: S.text3, textAlign: "center", padding: 32 }}>Chargement...</p>

  return (
    <div>
      {/* Statut actuel */}
      <div style={{ background: S.card2, border: `1px solid ${expired ? "#4D1500" : currentPlan.bg.replace("0.1", "0.25")}`, borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ background: currentPlan.bg, color: currentPlan.color, padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                {currentPlan.label}
              </span>
              {expired && <span style={{ background: S.dangerBg, color: S.danger, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⚠️ Expiré</span>}
            </div>
            <p style={{ color: S.text2, fontSize: 13, margin: 0 }}>
              {tenantPlan?.plan_expires_at
                ? `Expire le ${fmtDate(tenantPlan.plan_expires_at)}`
                : tenantPlan?.trial_ends_at
                ? `Trial jusqu'au ${fmtDate(tenantPlan.trial_ends_at)}`
                : "Aucune date d'expiration"}
            </p>
          </div>
          {days !== null && !expired && (
            <div style={{ textAlign: "center", minWidth: 60 }}>
              <p style={{ color: days <= 7 ? S.warning : S.success, fontSize: 26, fontWeight: 800, margin: 0 }}>{days}</p>
              <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>jours restants</p>
            </div>
          )}
        </div>
      </div>

      {error && <div style={{ background: S.dangerBg, border: `1px solid rgba(248,113,113,0.2)`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: S.danger, fontSize: 13 }}>⚠️ {error}</div>}
      {success && <div style={{ background: "rgba(74,222,128,0.08)", border: `1px solid rgba(74,222,128,0.2)`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: S.success, fontSize: 13 }}>✅ {success}</div>}

      {/* Choisir un plan */}
      <p style={{ color: S.text2, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Choisir un plan</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 18 }}>
        {PLANS.filter(p => p.id !== "trial").map(p => (
          <button key={p.id} onClick={() => setSelectedPlan(selectedPlan === p.id ? null : p.id)} style={{
            padding: "14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
            border: `1px solid ${selectedPlan === p.id ? p.color : S.border}`,
            background: selectedPlan === p.id ? p.bg : S.card2,
            transition: "all 0.15s",
          }}>
            <p style={{ color: p.color, fontSize: 14, fontWeight: 700, margin: "0 0 4px 0" }}>{p.label}</p>
            <p style={{ color: S.text, fontSize: 16, fontWeight: 800, margin: "0 0 8px 0" }}>
              {p.price.toLocaleString("fr-FR")} <span style={{ fontSize: 11, fontWeight: 400, color: S.text3 }}>FCFA/mois</span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {p.features.map(f => (
                <p key={f} style={{ color: S.text2, fontSize: 11, margin: 0 }}>• {f}</p>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Durée + Payer */}
      {selectedPlan && (
        <div style={{ background: S.card2, border: `1px solid ${S.border}`, borderRadius: 12, padding: "16px", marginBottom: 16 }}>
          <p style={{ color: S.text2, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Durée de l'abonnement</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[1,3,6,12].map(m => (
              <button key={m} onClick={() => setSelectedMonths(m)} style={{
                flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                border: `1px solid ${selectedMonths === m ? S.gold : S.border}`,
                background: selectedMonths === m ? "rgba(245,158,11,0.1)" : "transparent",
                color: selectedMonths === m ? S.gold : S.text3,
              }}>
                {m === 1 ? "1 mois" : m === 12 ? "1 an" : `${m} mois`}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ color: S.text2, fontSize: 13 }}>Total à payer</span>
            <span style={{ color: S.gold, fontSize: 22, fontWeight: 800 }}>
              {((PLANS.find(p => p.id === selectedPlan)?.price || 0) * selectedMonths).toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <button onClick={handlePay} disabled={payLoading} style={{
            width: "100%", padding: "13px", borderRadius: 10, border: "none",
            background: payLoading ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`,
            color: "#000", fontSize: 14, fontWeight: 700, cursor: payLoading ? "not-allowed" : "pointer",
          }}>
            {payLoading ? "Initialisation..." : "💳 Payer via CinetPay"}
          </button>
          <p style={{ color: S.text3, fontSize: 11, textAlign: "center", marginTop: 8 }}>
            Paiement sécurisé — Mobile Money, Visa, Mastercard
          </p>
        </div>
      )}

      {/* Historique abonnements */}
      {subscriptions.length > 0 && (
        <>
          <p style={{ color: S.text2, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "20px 0 10px 0" }}>Historique des abonnements</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {subscriptions.map(sub => {
              const p = PLANS.find(pl => pl.id === sub.plan) || PLANS[0]
              return (
                <div key={sub.id} style={{ background: S.card2, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ background: p.bg, color: p.color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{p.label}</span>
                  <span style={{ color: S.text, fontSize: 13, fontWeight: 600, flex: 1 }}>
                    {sub.amount === 0 ? "Gratuit" : `${sub.amount.toLocaleString("fr-FR")} FCFA`}
                  </span>
                  <span style={{ color: S.text3, fontSize: 12 }}>
                    {new Date(sub.started_at).toLocaleDateString("fr-FR")} → {new Date(sub.expires_at).toLocaleDateString("fr-FR")}
                  </span>
                  <span style={{ color: S.text3, fontSize: 11, textTransform: "capitalize" }}>{sub.payment_method}</span>
                  <span style={{
                    padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: sub.status === "active" ? "rgba(74,222,128,0.1)" : S.dangerBg,
                    color: sub.status === "active" ? S.success : S.danger,
                  }}>{sub.status}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Contact support */}
      <div style={{ background: "rgba(245,158,11,0.05)", border: `1px solid rgba(245,158,11,0.15)`, borderRadius: 12, padding: "14px 16px", marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>💬</span>
        <div>
          <p style={{ color: S.gold, fontSize: 13, fontWeight: 700, margin: "0 0 2px 0" }}>Paiement par virement ?</p>
          <p style={{ color: S.text3, fontSize: 12, margin: 0 }}>
            Contacte notre équipe sur WhatsApp ou par email pour un paiement manuel (Wave, Orange Money, virement bancaire).
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ParametresView({ tenantId }: Props) {
  const [settings, setSettings] = useState<TenantSettings>(EMPTY)
  const [profile, setProfile] = useState<ProfileSettings>({ full_name: "", phone: "", email: "" })
  const [profileId, setProfileId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoFileRef = useRef<HTMLInputElement>(null)
  const [lienCommande, setLienCommande] = useState("")
  const [tenantSlug, setTenantSlug] = useState("")
  const [password, setPassword] = useState({ current: "", new: "", confirm: "" })
  const [showPasswords, setShowPasswords] = useState(false)
  const [activeSection, setActiveSection] = useState<"parametres" | "abonnement">("parametres")

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const fileName = `logos/${tenantId}/${Date.now()}.jpg`
    const { error: err } = await supabase.storage
      .from("shipivo-images").upload(fileName, file, { contentType: file.type, upsert: true })
    if (err) { setError("Erreur upload logo : " + err.message); setUploadingLogo(false); return }
    const { data } = supabase.storage.from("shipivo-images").getPublicUrl(fileName)
    setSettings(p => ({ ...p, logo_url: data.publicUrl }))
    setUploadingLogo(false)
  }

  useEffect(() => { loadSettings() }, [tenantId])

  const loadSettings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("tenants")
      .select("name, phone, delivery_fee, slug, facebook_pixel_id, facebook_access_token, tiktok_pixel_id, closer_commission, driver_commission, currency, at_username, at_api_key, at_sender_id, brand_color, logo_url, boutique_description, banner_text, countdown_end, banner_on_boutique, banner_on_produit, ga_measurement_id")
      .eq("id", tenantId)
      .single()

    if (data) {
      setSettings({
        name: data.name || "",
        phone: data.phone || "",
        delivery_fee: data.delivery_fee || 0,
        facebook_pixel_id: data.facebook_pixel_id || "",
        facebook_access_token: data.facebook_access_token || "",
        tiktok_pixel_id: data.tiktok_pixel_id || "",
        closer_commission: data.closer_commission || 500,
        driver_commission: data.driver_commission || 2000,
        currency: data.currency || "FCFA",
        at_username: data.at_username || "",
        at_api_key: data.at_api_key || "",
        at_sender_id: data.at_sender_id || "Shipivo",
        ga_measurement_id: data.ga_measurement_id || "",
        brand_color: data.brand_color || "#F59E0B",
        logo_url: data.logo_url || "",
        boutique_description: data.boutique_description || "",
        banner_text: data.banner_text || "",
        countdown_end: data.countdown_end || "",
        banner_on_boutique: data.banner_on_boutique !== false,
        banner_on_produit: data.banner_on_produit === true,
      })
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://shipivo.app"
      setLienCommande(`${baseUrl}/commander/${data.slug}`)
      setTenantSlug(data.slug || "")
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setProfileId(user.id)
      const { data: pd } = await supabase.from("profiles").select("full_name, phone, email").eq("id", user.id).single()
      if (pd) setProfile({ full_name: pd.full_name || "", phone: pd.phone || "", email: pd.email || user.email || "" })
    }

    setLoading(false)
  }

  const handleSaveProfile = async () => {
    if (!profileId) return
    setSavingProfile(true); setError(""); setSuccess("")
    const { error: err } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      phone: profile.phone,
    }).eq("id", profileId)
    if (err) { setError(err.message); setSavingProfile(false); return }
    setSuccess("Profil mis à jour ✓")
    setSavingProfile(false)
    setTimeout(() => setSuccess(""), 3000)
  }

  const handleChangePassword = async () => {
    if (!password.new || !password.confirm) { setError("Remplis tous les champs."); return }
    if (password.new !== password.confirm) { setError("Les mots de passe ne correspondent pas."); return }
    if (password.new.length < 6) { setError("Le mot de passe doit avoir au moins 6 caractères."); return }
    setSavingPassword(true); setError(""); setSuccess("")
    const { error: err } = await supabase.auth.updateUser({ password: password.new })
    if (err) { setError(err.message); setSavingPassword(false); return }
    setSuccess("Mot de passe modifié ✓")
    setPassword({ current: "", new: "", confirm: "" })
    setSavingPassword(false)
    setTimeout(() => setSuccess(""), 3000)
  }

  const handleSave = async () => {
    setError(""); setSaving(true)
    const { error: err } = await supabase.from("tenants").update({
      name: settings.name,
      phone: settings.phone,
      delivery_fee: settings.delivery_fee,
      facebook_pixel_id: settings.facebook_pixel_id || null,
      facebook_access_token: settings.facebook_access_token || null,
      tiktok_pixel_id: settings.tiktok_pixel_id || null,
      closer_commission: settings.closer_commission,
      driver_commission: settings.driver_commission,
      currency: settings.currency,
      at_username: settings.at_username || null,
      at_api_key: settings.at_api_key || null,
      at_sender_id: settings.at_sender_id || "Shipivo",
      ga_measurement_id: settings.ga_measurement_id || null,
      brand_color: settings.brand_color || "#F59E0B",
      logo_url: settings.logo_url || null,
      boutique_description: settings.boutique_description || null,
      banner_text: settings.banner_text || null,
      countdown_end: settings.countdown_end || null,
      banner_on_boutique: settings.banner_on_boutique,
      banner_on_produit: settings.banner_on_produit,
    }).eq("id", tenantId)

    if (err) { setError(err.message); setSaving(false); return }
    setCurrency(settings.currency)
    setSuccess("Paramètres enregistrés ✓")
    setSaving(false)
    setTimeout(() => setSuccess(""), 3000)
  }

  const set = (k: keyof TenantSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setSettings(p => ({ ...p, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }))

  const inp: React.CSSProperties = { width: "100%", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 12px", color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const }

  if (loading) return <p style={{ color: S.text3, fontSize: 14, textAlign: "center", padding: "40px 0" }}>Chargement...</p>

  // Onglets Paramètres / Abonnement
  const TABS = [
    { id: "parametres",  label: "⚙️ Paramètres" },
    { id: "abonnement",  label: "💳 Abonnement" },
  ]

  return (
    <div style={{ padding: "0 0 60px 0" }}>
      <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: "0 0 20px 0" }}>Paramètres</h2>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${S.border}`, paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id as typeof activeSection)} style={{
            padding: "10px 18px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600,
            color: activeSection === tab.id ? S.gold : S.text2,
            borderBottom: `2px solid ${activeSection === tab.id ? S.gold : "transparent"}`,
            marginBottom: -1,
            transition: "all 0.15s",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ONGLET ABONNEMENT ── */}
      {activeSection === "abonnement" && (
        <AbonnementTab tenantId={tenantId} />
      )}

      {/* ── ONGLET PARAMÈTRES ── */}
      {activeSection === "parametres" && (
        <>
          {success && <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: S.success, fontSize: 13 }}>{success}</div>}
          {error && <div style={{ background: S.dangerBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: S.danger, fontSize: 13 }}>⚠️ {error}</div>}

          {/* Profil personnel */}
          <Section title="👤 Mon profil personnel">
            <Field label="Nom complet" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} inp={inp} placeholder="Ex: Jean Dupont" />
            <Field label="Téléphone" value={profile.phone || ""} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} inp={inp} placeholder="+228 90 00 00 00" />
            <button onClick={handleSaveProfile} disabled={savingProfile} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: savingProfile ? S.goldDim : S.gold, color: "#000", fontSize: 13, fontWeight: 700, cursor: savingProfile ? "not-allowed" : "pointer" }}>
              {savingProfile ? "Enregistrement..." : "💾 Sauvegarder profil"}
            </button>
          </Section>

          {/* Mot de passe */}
          <Section title="🔐 Changer mon mot de passe">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <input type="checkbox" id="showpwd" checked={showPasswords} onChange={e => setShowPasswords(e.target.checked)} />
              <label htmlFor="showpwd" style={{ color: S.text2, fontSize: 12, cursor: "pointer" }}>Afficher les mots de passe</label>
            </div>
            <Field label="Nouveau mot de passe" value={password.new} onChange={e => setPassword(p => ({ ...p, new: e.target.value }))} inp={inp} type={showPasswords ? "text" : "password"} placeholder="Min. 6 caractères" />
            <Field label="Confirmer mot de passe" value={password.confirm} onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))} inp={inp} type={showPasswords ? "text" : "password"} placeholder="Répéter le mot de passe" />
            <button onClick={handleChangePassword} disabled={savingPassword} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: savingPassword ? S.goldDim : S.gold, color: "#000", fontSize: 13, fontWeight: 700, cursor: savingPassword ? "not-allowed" : "pointer" }}>
              {savingPassword ? "Modification..." : "🔐 Changer le mot de passe"}
            </button>
          </Section>

          {/* Boutique */}
          <Section title="🏪 Ma boutique">
            <Field label="Nom de la boutique" value={settings.name} onChange={set("name")} inp={inp} placeholder="Ex: THERAWOLF Store" />
            <Field label="Téléphone boutique" value={settings.phone} onChange={set("phone")} inp={inp} placeholder="+228 90 00 00 00" />
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Description boutique</label>
              <textarea value={settings.boutique_description} onChange={e => setSettings(p => ({ ...p, boutique_description: e.target.value }))}
                placeholder="Description affichée sur ta boutique..."
                style={{ ...inp, minHeight: 80, resize: "vertical" as const }} />
            </div>
            {/* Logo */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Logo boutique</label>
              {settings.logo_url && (
                <img src={settings.logo_url} alt="Logo" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, marginBottom: 8, border: `1px solid ${S.border}` }} />
              )}
              <input ref={logoFileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
              <button onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}
                style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.text2, fontSize: 12, cursor: "pointer" }}>
                {uploadingLogo ? "Upload en cours..." : "📷 Changer le logo"}
              </button>
            </div>
          </Section>

          {/* Frais livraison */}
          <Section title="🚚 Frais de livraison">
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Frais de livraison par défaut</label>
              <input type="number" value={settings.delivery_fee} onChange={set("delivery_fee")} style={inp} min="0" />
            </div>
          </Section>

          {/* Devise */}
          <Section title="💱 Devise">
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Devise</label>
              <select value={settings.currency} onChange={set("currency")} style={inp}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
          </Section>

          {/* Commissions */}
          <Section title="💰 Commissions équipe">
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Commission closeur (par commande livrée)</label>
              <input type="number" value={settings.closer_commission} onChange={set("closer_commission")} style={inp} min="0" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Commission livreur (par commande livrée)</label>
              <input type="number" value={settings.driver_commission} onChange={set("driver_commission")} style={inp} min="0" />
            </div>
          </Section>

          {/* Facebook Pixel */}
          <Section title="📊 Pixel Facebook + API Conversions">
            <div style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: S.text2, lineHeight: 1.6 }}>
              Les événements trackés automatiquement :<br/>
              • <b style={{ color: S.info }}>ViewContent</b> — quand quelqu&apos;un visite ta page<br/>
              • <b style={{ color: S.info }}>InitiateCheckout</b> — quand il clique sur Commander<br/>
              • <b style={{ color: S.info }}>Purchase</b> — quand la commande est confirmée
            </div>
            <Field label="Pixel ID Facebook" value={settings.facebook_pixel_id} onChange={set("facebook_pixel_id")} inp={inp} placeholder="123456789012345" />
            <Field label="Access Token API Conversions" value={settings.facebook_access_token} onChange={set("facebook_access_token")} inp={inp} placeholder="EAA..." />
          </Section>

          {/* TikTok Pixel */}
          <Section title="🎵 Pixel TikTok">
            <Field label="Pixel ID TikTok" value={settings.tiktok_pixel_id} onChange={set("tiktok_pixel_id")} inp={inp} placeholder="C..." />
          </Section>

          {/* Lien tracké */}
          <Section title="🔗 Liens trackés par source">
            {["facebook","tiktok","google","whatsapp","instagram","youtube","email"].map(src => {
              const link = `${lienCommande}?source=${src}`
              return (
                <div key={src} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ color: S.text2, fontSize: 12, width: 90, textTransform: "capitalize" }}>{src}</span>
                  <input readOnly value={link} style={{ ...inp, flex: 1, color: S.text3, fontSize: 11, cursor: "text" }} />
                  <button onClick={() => { navigator.clipboard.writeText(link); setCopied(src); setTimeout(() => setCopied(""), 2000) }}
                    style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${copied === src ? S.success : S.border}`, background: "transparent", color: copied === src ? S.success : S.text3, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {copied === src ? "✓ Copié" : "Copier"}
                  </button>
                </div>
              )
            })}
          </Section>

          {/* Design */}
          <Section title="🎨 Design de ta boutique">
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Couleur principale</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="color" value={settings.brand_color} onChange={e => setSettings(p => ({ ...p, brand_color: e.target.value }))}
                  style={{ width: 48, height: 40, borderRadius: 8, border: `1px solid ${S.border}`, padding: 2, background: "transparent", cursor: "pointer" }} />
                <span style={{ color: S.text2, fontSize: 13 }}>{settings.brand_color}</span>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Texte du bandeau défilant</label>
              <input value={settings.banner_text} onChange={set("banner_text")} placeholder="Ex: 🔥 Promo -20% ce weekend..." style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Compte à rebours (date de fin)</label>
              <input type="datetime-local" value={settings.countdown_end ? settings.countdown_end.slice(0, 16) : ""} onChange={e => setSettings(p => ({ ...p, countdown_end: e.target.value ? new Date(e.target.value).toISOString() : "" }))} style={inp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {[
                { key: "banner_on_boutique" as const, label: "Afficher bandeau sur la boutique" },
                { key: "banner_on_produit" as const,  label: "Afficher bandeau sur les pages produit" },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={settings[key] as boolean} onChange={e => setSettings(p => ({ ...p, [key]: e.target.checked }))} />
                  <span style={{ color: S.text2, fontSize: 13 }}>{label}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* SMS */}
          <Section title="📱 SMS Africa's Talking">
            <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: S.text2 }}>
              Les SMS sont envoyés automatiquement lors des changements de statut commandes.
            </div>
            <Field label="Username Africa's Talking" value={settings.at_username} onChange={set("at_username")} inp={inp} placeholder="sandbox" />
            <Field label="API Key" value={settings.at_api_key} onChange={set("at_api_key")} inp={inp} placeholder="atsk_..." />
            <Field label="Sender ID" value={settings.at_sender_id} onChange={set("at_sender_id")} inp={inp} placeholder="Shipivo" />
          </Section>

          {/* GA4 */}
          <Section title="📊 Google Analytics 4">
            <Field label="Measurement ID" value={settings.ga_measurement_id} onChange={set("ga_measurement_id")} inp={inp} placeholder="G-XXXXXXXXXX" />
          </Section>

          {/* Widget */}
          <Section title="🔌 Intégration sur d'autres sites">
            <p style={{ color: S.text2, fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
              Intègre le formulaire de commande Shipivo sur n&apos;importe quel site — WordPress, Elementor, Shopify, Wix, Webflow ou tout autre plateforme.
            </p>

            {/* Méthode recommandée — style Tally */}
            <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <p style={{ color: S.gold, fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8 }}>⭐ Code universel — Elementor, Shopify, Wix, Webflow</p>
              <p style={{ color: S.text2, fontSize: 13, margin: "0 0 12px", lineHeight: 1.6 }}>
                Colle ce code dans un bloc <strong style={{color:S.text}}>HTML</strong> Elementor. Le formulaire s&apos;affiche directement.
              </p>
              <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "12px", fontFamily: "monospace", fontSize: 11, color: S.info, marginBottom: 10, lineHeight: 1.9, overflowX: "auto" as const }}>
                <div>{`<iframe`}</div>
                <div style={{paddingLeft:16}}>{`data-shipivo-src="https://shipivo.app/widget?boutique=${tenantSlug}"`}</div>
                <div style={{paddingLeft:16}}>{`loading="lazy" width="100%" height="520"`}</div>
                <div style={{paddingLeft:16}}>{`frameborder="0" style="border-radius:12px;border:none;">`}</div>
                <div>{`</iframe>`}</div>
                <div style={{marginTop:6}}>{`<script>`}</div>
                <div style={{paddingLeft:16}}>{`var d=document,w="https://shipivo.app/widget-embed.js",`}</div>
                <div style={{paddingLeft:16}}>{`v=function(){window.Shipivo&&window.Shipivo.loadEmbeds()};`}</div>
                <div style={{paddingLeft:16}}>{`if(window.Shipivo)v();`}</div>
                <div style={{paddingLeft:16}}>{`else{var s=d.createElement("script");s.src=w;s.onload=v;d.body.appendChild(s);}`}</div>
                <div>{`</script>`}</div>
              </div>
              <button onClick={() => {
                const code = `<iframe data-shipivo-src="https://shipivo.app/widget?boutique=${tenantSlug}" loading="lazy" width="100%" height="520" frameborder="0" style="border-radius:12px;border:none;"></iframe><script>var d=document,w="https://shipivo.app/widget-embed.js",v=function(){window.Shipivo&&window.Shipivo.loadEmbeds()};if(window.Shipivo)v();else{var s=d.createElement("script");s.src=w;s.onload=v;d.body.appendChild(s);}<\/script>`
                navigator.clipboard.writeText(code)
                setCopied("widget-tally")
                setTimeout(() => setCopied(""), 2000)
              }} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${copied === "widget-tally" ? S.success : S.border}`, background: "transparent", color: copied === "widget-tally" ? S.success : S.text3, fontSize: 12, cursor: "pointer" }}>
                {copied === "widget-tally" ? "✓ Code copié !" : "📋 Copier le code"}
              </button>
            </div>

            {/* Avec produit spécifique */}
            <div style={{ background: S.card2, border: `1px solid ${S.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <p style={{ color: S.text2, fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8 }}>📦 Avec un produit spécifique</p>
              <p style={{ color: S.text2, fontSize: 13, margin: "0 0 12px" }}>Remplace <strong style={{color:S.text}}>NOM_PRODUIT</strong> et <strong style={{color:S.text}}>15000</strong> par ton produit et son prix :</p>
              <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "12px", fontFamily: "monospace", fontSize: 11, color: S.info, marginBottom: 10, lineHeight: 1.9, overflowX: "auto" as const }}>
                <div>{`<iframe`}</div>
                <div style={{paddingLeft:16, color:"#FCD34D"}}>{`data-shipivo-src="https://shipivo.app/widget?boutique=${tenantSlug}&produit_nom=NOM_PRODUIT&produit_prix=15000&mode=full"`}</div>
                <div style={{paddingLeft:16}}>{`loading="lazy" width="100%" height="620"`}</div>
                <div style={{paddingLeft:16}}>{`frameborder="0" style="border-radius:12px;border:none;">`}</div>
                <div>{`</iframe>`}</div>
                <div style={{marginTop:6}}>{`<script>`}</div>
                <div style={{paddingLeft:16}}>{`var d=document,w="https://shipivo.app/widget-embed.js",`}</div>
                <div style={{paddingLeft:16}}>{`v=function(){window.Shipivo&&window.Shipivo.loadEmbeds()};`}</div>
                <div style={{paddingLeft:16}}>{`if(window.Shipivo)v();`}</div>
                <div style={{paddingLeft:16}}>{`else{var s=d.createElement("script");s.src=w;s.onload=v;d.body.appendChild(s);}`}</div>
                <div>{`</script>`}</div>
              </div>
              <button onClick={() => {
                const code = `<iframe data-shipivo-src="https://shipivo.app/widget?boutique=${tenantSlug}&produit_nom=NOM_PRODUIT&produit_prix=15000&mode=full" loading="lazy" width="100%" height="620" frameborder="0" style="border-radius:12px;border:none;"></iframe><script>var d=document,w="https://shipivo.app/widget-embed.js",v=function(){window.Shipivo&&window.Shipivo.loadEmbeds()};if(window.Shipivo)v();else{var s=d.createElement("script");s.src=w;s.onload=v;d.body.appendChild(s);}<\/script>`
                navigator.clipboard.writeText(code)
                setCopied("widget-produit")
                setTimeout(() => setCopied(""), 2000)
              }} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${copied === "widget-produit" ? S.success : S.border}`, background: "transparent", color: copied === "widget-produit" ? S.success : S.text3, fontSize: 12, cursor: "pointer" }}>
                {copied === "widget-produit" ? "✓ Code copié !" : "📋 Copier le code"}
              </button>
            </div>

            {/* Guide Elementor */}
            <div style={{ background: S.card2, border: `1px solid ${S.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ color: S.text2, fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12 }}>🔵 Guide Elementor (WordPress)</p>
              {[
                "1. Dans Elementor, cherche le widget HTML (ou Custom HTML)",
                "2. Glisse-le à l'endroit où tu veux le formulaire",
                "3. Colle le code ci-dessus dans le champ HTML",
                "4. Clique sur Mettre à jour / Publier",
                "5. Le formulaire apparaît directement sur ta page",
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: S.gold, fontSize: 13, flexShrink: 0 }}>→</span>
                  <span style={{ color: S.text2, fontSize: 13 }}>{step}</span>
                </div>
              ))}
            </div>

            {/* Guide Shopify */}
            <div style={{ background: S.card2, border: `1px solid ${S.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ color: S.text2, fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12 }}>🟢 Guide Shopify</p>
              {[
                "1. Va dans Boutique en ligne → Thèmes → Personnaliser",
                "2. Clique sur Ajouter une section → Code personnalisé",
                "3. Colle le code et enregistre",
                "Ou : Thèmes → Modifier le code → colle dans le fichier de ta page produit",
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: S.success, fontSize: 13, flexShrink: 0 }}>→</span>
                  <span style={{ color: S.text2, fontSize: 13 }}>{step}</span>
                </div>
              ))}
            </div>

            {/* Guide Wix / Webflow */}
            <div style={{ background: S.card2, border: `1px solid ${S.border}`, borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ color: S.text2, fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12 }}>🌐 Wix / Webflow / Autres</p>
              {[
                "Wix : Ajouter → Plus → Intégrer du code HTML → colle le code",
                "Webflow : Ajoute un élément Embed → colle le code",
                "Autres : Tout éditeur avec un bloc HTML ou Embed accepte ce code",
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ color: S.info, fontSize: 13, flexShrink: 0 }}>→</span>
                  <span style={{ color: S.text2, fontSize: 13 }}>{step}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Bouton save */}
          <button onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: 8, background: saving ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 12, padding: "14px", color: "#000", fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", minHeight: 48 }}>
            {saving ? "Enregistrement..." : "💾 Enregistrer les paramètres"}
          </button>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #1E1E2E", borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#55556A", margin: "0 0 14px 0" }}>{title}</p>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, inp, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inp: React.CSSProperties; type?: string; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", color: "#9898B0", fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={inp}
        onFocus={e => e.target.style.borderColor = "#F59E0B"}
        onBlur={e => e.target.style.borderColor = "#1E1E2E"} />
    </div>
  )
}
