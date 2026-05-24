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
}

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

    // Charger profil admin
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

  const inp = { width: "100%", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 12px", color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const }

  if (loading) return <p style={{ color: S.text3, fontSize: 14, textAlign: "center", padding: "40px 0" }}>Chargement...</p>

  return (
    <div style={{ padding: "0 0 60px 0" }}>
      <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: "0 0 24px 0" }}>Paramètres</h2>

      {success && <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: S.success, fontSize: 13 }}>{success}</div>}
      {error && <div style={{ background: S.dangerBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: S.danger, fontSize: 13 }}>⚠️ {error}</div>}

      {/* Profil personnel */}
      <Section title="👤 Mon profil personnel">
        <Field label="Nom complet" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} inp={inp} placeholder="Ex: Jean Dupont" />
        <Field label="Téléphone" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} inp={inp} type="tel" placeholder="Ex: 22890000000" />
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Email (non modifiable)</label>
          <input value={profile.email} disabled style={{ ...inp, opacity: 0.5, cursor: "not-allowed" }} />
        </div>
        <button onClick={handleSaveProfile} disabled={savingProfile}
          style={{ width: "100%", padding: "11px 0", background: savingProfile ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 10, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {savingProfile ? "Enregistrement..." : "💾 Enregistrer le profil"}
        </button>
      </Section>

      {/* Mot de passe */}
      <Section title="🔐 Changer mon mot de passe">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: S.text2, margin: 0 }}>Modifie ton mot de passe de connexion</p>
          <button onClick={() => setShowPasswords(!showPasswords)}
            style={{ padding: "5px 10px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, color: S.text2, fontSize: 11, cursor: "pointer" }}>
            {showPasswords ? "Masquer" : "Afficher"}
          </button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Nouveau mot de passe</label>
          <input type={showPasswords ? "text" : "password"} value={password.new}
            onChange={e => setPassword(p => ({ ...p, new: e.target.value }))}
            placeholder="Minimum 6 caractères" style={inp} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Confirmer le mot de passe</label>
          <input type={showPasswords ? "text" : "password"} value={password.confirm}
            onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))}
            placeholder="Répète le mot de passe" style={inp} />
        </div>
        <button onClick={handleChangePassword} disabled={savingPassword}
          style={{ width: "100%", padding: "11px 0", background: "#1e1e2e", border: `1px solid ${S.border}`, borderRadius: 10, color: S.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {savingPassword ? "Modification..." : "🔐 Changer le mot de passe"}
        </button>
      </Section>

      {/* Lien commande */}
      <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
        <p style={{ color: S.text2, fontSize: 12, margin: "0 0 6px 0", fontWeight: 600 }}>🔗 TON LIEN DE COMMANDE</p>
        <p style={{ color: S.gold, fontSize: 14, fontWeight: 700, margin: 0, wordBreak: "break-all" as const }}>{lienCommande}</p>
        <button onClick={() => { navigator.clipboard.writeText(lienCommande); setCopied("lien") }}
          style={{ marginTop: 10, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, padding: "6px 12px", color: S.text2, fontSize: 12, cursor: "pointer" }}>
          {copied === "lien" ? "✓ Copié !" : "📋 Copier le lien"}
        </button>
      </div>

      {/* Boutique */}
      <Section title="🏪 Ma boutique">
        <Field label="Nom de la boutique" value={settings.name} onChange={set("name")} inp={inp} />
        <Field label="Téléphone WhatsApp" value={settings.phone} onChange={set("phone")} inp={inp} type="tel" />
      </Section>

      {/* Livraison */}
      <Section title="🚚 Frais de livraison">
        <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: S.info, fontSize: 12, margin: 0 }}>
            0 FCFA = livraison gratuite pour tes clients. Sinon entre le montant fixe.
          </p>
        </div>
        <Field label="Frais de livraison (FCFA)" value={String(settings.delivery_fee)} onChange={set("delivery_fee")} inp={inp} type="number" />
      </Section>

      {/* Commissions */}
      <Section title="💱 Devise">
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: S.gold, fontSize: 12, margin: 0 }}>
            Tous les montants de ton espace seront affichés dans cette devise.
          </p>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 13, marginBottom: 6 }}>Devise utilisée</label>
          <select value={settings.currency} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))} style={inp}>
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code} style={{ background: "#111118" }}>{c.name}</option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="💰 Commissions équipe">
        <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: S.info, fontSize: 12, margin: 0 }}>
            Commission fixe par livraison réussie. Tu peux configurer selon tes accords.
          </p>
        </div>
        <Field label={`Commission closureuse (${settings.currency} par commande)`} value={String(settings.closer_commission)} onChange={set("closer_commission")} inp={inp} type="number" />
        <Field label={`Commission livreur (${settings.currency} par livraison)`} value={String(settings.driver_commission)} onChange={set("driver_commission")} inp={inp} type="number" />
      </Section>

      {/* Pixel Facebook */}
      <Section title="📊 Pixel Facebook + API Conversions">
        <div style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: S.warning, fontSize: 12, margin: 0 }}>
            ⚡ Indispensable pour tes publicités Facebook et Instagram. Le pixel seul ne suffit plus depuis iOS 14 — utilise aussi l'API Conversions pour un tracking fiable.
          </p>
        </div>
        <Field label="Pixel ID Facebook" value={settings.facebook_pixel_id} onChange={set("facebook_pixel_id")} inp={inp} placeholder="Ex: 1234567890123456" />
        <Field label="Token API Conversions Facebook" value={settings.facebook_access_token} onChange={set("facebook_access_token")} inp={inp} placeholder="EAABx..." />
        <div style={{ background: S.card2, borderRadius: 8, padding: "10px 12px", marginTop: 4 }}>
          <p style={{ color: S.text3, fontSize: 11, margin: 0, lineHeight: 1.6 }}>
            Événements trackés automatiquement :<br/>
            • ViewContent — quand quelqu'un visite ta page<br/>
            • AddToCart — quand quelqu'un ajoute au panier<br/>
            • Purchase — quand une commande est confirmée
          </p>
        </div>
      </Section>

      {/* Pixel TikTok */}
      <Section title="🎵 Pixel TikTok">
        <Field label="Pixel ID TikTok" value={settings.tiktok_pixel_id} onChange={set("tiktok_pixel_id")} inp={inp} placeholder="Ex: C4ABCDEFGH..." />
      </Section>

      {/* Liens trackés */}
      <Section title="🔗 Liens trackés par source">
        <div style={{ background: "#16161F", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: "#9898B0", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            Utilise ces liens selon où tu fais ta pub. La source sera enregistrée automatiquement sur chaque commande.
          </p>
        </div>
        {lienCommande && [
          { src: "whatsapp",  icon: "💬", label: "WhatsApp",  color: "#25D366" },
          { src: "facebook",  icon: "📘", label: "Facebook",  color: "#1877F2" },
          { src: "instagram", icon: "📸", label: "Instagram", color: "#E4405F" },
          { src: "tiktok",    icon: "🎵", label: "TikTok",    color: "#000" },
          { src: "google",    icon: "🔍", label: "Google",    color: "#4285F4" },
        ].map(item => {
          const link = `https://${lienCommande}?src=${item.src}`
          const key = `link-${item.src}`
          return (
            <div key={item.src} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, background: "#0A0A0F", border: "1px solid #1E1E2E", borderRadius: 8, padding: "8px 10px", overflow: "hidden" }}>
                <p style={{ color: "#55556A", fontSize: 10, margin: "0 0 2px 0", fontWeight: 600 }}>{item.label}</p>
                <p style={{ color: "#9898B0", fontSize: 11, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{link}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(link); setCopied(key); setTimeout(() => setCopied(""), 2000) }}
                style={{ background: copied === key ? "rgba(74,222,128,0.1)" : "#16161F", border: "1px solid #1E1E2E", borderRadius: 8, padding: "8px 10px", color: copied === key ? "#4ADE80" : "#9898B0", fontSize: 11, cursor: "pointer", flexShrink: 0, fontWeight: 600 }}>
                {copied === key ? "✓" : "📋"}
              </button>
            </div>
          )
        })}
      </Section>


      {/* Design Boutique */}
      <Section title="🎨 Design de ta boutique">
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Slogan / Description courte</label>
          <input value={settings.boutique_description} onChange={set("boutique_description")}
            placeholder="Ex: Livraison rapide à Lomé. Paiement à la livraison."
            style={inp}
            onFocus={e => e.target.style.borderColor = "#F59E0B"}
            onBlur={e => e.target.style.borderColor = "#1E1E2E"} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Couleur principale de ta boutique</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="color" value={settings.brand_color} onChange={e => setSettings(p => ({ ...p, brand_color: e.target.value }))}
              style={{ width: 48, height: 40, borderRadius: 8, border: "none", cursor: "pointer", background: "none" }} />
            <input value={settings.brand_color} onChange={set("brand_color")}
              placeholder="#F59E0B"
              style={{ ...inp, width: 120 }}
              onFocus={e => e.target.style.borderColor = "#F59E0B"}
              onBlur={e => e.target.style.borderColor = "#1E1E2E"} />
            <div style={{ width: 40, height: 40, borderRadius: 8, background: settings.brand_color, border: "1px solid #1E1E2E", flexShrink: 0 }} />
          </div>
          <p style={{ color: S.text3, fontSize: 11, margin: "6px 0 0 0" }}>Cette couleur s&apos;applique aux boutons et éléments de ta boutique publique.</p>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Logo de ta boutique</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div onClick={() => logoFileRef.current?.click()}
              style={{ width: 80, height: 80, borderRadius: 10, border: `2px dashed ${settings.logo_url ? "#F59E0B" : S.border}`, overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: S.bg, flexShrink: 0 }}>
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
              ) : (
                <span style={{ fontSize: 28 }}>🏪</span>
              )}
            </div>
            <div>
              <button onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}
                style={{ background: S.border, border: "none", borderRadius: 8, padding: "8px 14px", color: S.text2, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "block", marginBottom: 6 }}>
                {uploadingLogo ? "⬆️ Upload..." : "📷 Choisir un logo"}
              </button>
              {settings.logo_url && (
                <button onClick={() => setSettings(p => ({ ...p, logo_url: "" }))}
                  style={{ background: "none", border: "none", color: S.danger, fontSize: 11, cursor: "pointer", padding: 0 }}>
                  🗑️ Supprimer le logo
                </button>
              )}
              <p style={{ color: S.text3, fontSize: 11, margin: "4px 0 0 0" }}>PNG, JPG — recommandé 200×200px</p>
            </div>
          </div>
          <input ref={logoFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoUpload} style={{ display: "none" }} />
        </div>
        {/* Bandeau défilant */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
            📢 Bandeau défilant
          </label>
          <input value={settings.banner_text} onChange={set("banner_text")}
            placeholder="Ex: 🚚 Livraison gratuite • 💳 Paiement à la livraison • ✅ 100% naturel"
            style={inp}
            onFocus={e => e.target.style.borderColor = "#F59E0B"}
            onBlur={e => e.target.style.borderColor = "#1E1E2E"} />
          <p style={{ color: S.text3, fontSize: 11, margin: "4px 0 0 0" }}>Sépare les messages avec • pour un défilement fluide</p>
          {/* Toggles affichage */}
          {settings.banner_text && (
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={settings.banner_on_boutique}
                  onChange={e => setSettings(p => ({ ...p, banner_on_boutique: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: S.gold, cursor: "pointer" }} />
                <span style={{ color: S.text2, fontSize: 12 }}>Afficher sur la boutique</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={settings.banner_on_produit}
                  onChange={e => setSettings(p => ({ ...p, banner_on_produit: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: S.gold, cursor: "pointer" }} />
                <span style={{ color: S.text2, fontSize: 12 }}>Afficher sur les pages produit</span>
              </label>
            </div>
          )}
        </div>

        {/* Compte à rebours */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
            ⏰ Compte à rebours (date de fin de promo)
          </label>
          <input type="datetime-local" value={settings.countdown_end} onChange={set("countdown_end")}
            style={{ ...inp, colorScheme: "dark" }}
            onFocus={e => e.target.style.borderColor = "#F59E0B"}
            onBlur={e => e.target.style.borderColor = "#1E1E2E"} />
          <p style={{ color: S.text3, fontSize: 11, margin: "4px 0 0 0" }}>Laisse vide pour désactiver le compte à rebours</p>
        </div>
      </Section>

      {/* SMS Africa's Talking */}
      <Section title="📱 SMS Africa's Talking">
        <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: S.info, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            Connecte ton compte Africa&apos;s Talking pour envoyer des SMS automatiques à tes clients lors de la confirmation et de la livraison.
            Crée ton compte sur <strong>africastalking.com</strong>.
          </p>
        </div>
        <Field label="AT Username" value={settings.at_username} onChange={set("at_username")} inp={inp} placeholder="Ex: sandbox ou ton username" />
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>AT API Key</label>
          <input
            type="password"
            value={settings.at_api_key}
            onChange={set("at_api_key")}
            placeholder="atsk_..."
            style={inp}
            onFocus={e => e.target.style.borderColor = "#F59E0B"}
            onBlur={e => e.target.style.borderColor = "#1E1E2E"}
          />
        </div>
        <Field label="Nom expéditeur SMS (max 11 caractères)" value={settings.at_sender_id} onChange={set("at_sender_id")} inp={inp} placeholder="Ex: Shipivo" />
        <div style={{ background: S.card2, borderRadius: 8, padding: "10px 12px", marginTop: 4 }}>
          <p style={{ color: S.text3, fontSize: 11, margin: 0, lineHeight: 1.6 }}>
            SMS envoyés automatiquement :<br/>
            • ✅ Confirmation — quand la closureuse confirme la commande<br/>
            • 🎯 Livraison — quand le livreur marque &quot;Livré + Payé&quot;
          </p>
        </div>
      </Section>

      {/* Pixels & Analytics */}
      <Section title="📊 Pixels & Analytics">
        <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: S.info, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            Configure tes pixels pour tracker les commandes et optimiser tes publicités.
          </p>
        </div>

        {/* Facebook Pixel */}
        <p style={{ color: S.text2, fontSize: 12, fontWeight: 700, margin: "0 0 8px 0" }}>Facebook / Meta</p>
        <Field label="Facebook Pixel ID" value={settings.facebook_pixel_id} onChange={set("facebook_pixel_id")} inp={inp} placeholder="Ex: 123456789012345" />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Facebook Access Token (API Conversions)</label>
          <input type="password" value={settings.facebook_access_token} onChange={set("facebook_access_token")}
            placeholder="EAAxxxxxxx..." style={inp}
            onFocus={e => e.target.style.borderColor = "#F59E0B"}
            onBlur={e => e.target.style.borderColor = "#1E1E2E"} />
        </div>

        {/* TikTok Pixel */}
        <p style={{ color: S.text2, fontSize: 12, fontWeight: 700, margin: "0 0 8px 0" }}>TikTok</p>
        <Field label="TikTok Pixel ID" value={settings.tiktok_pixel_id} onChange={set("tiktok_pixel_id")} inp={inp} placeholder="Ex: CXXXXXXXXXXXXXXX" />

        {/* Google Analytics */}
        <p style={{ color: S.text2, fontSize: 12, fontWeight: 700, margin: "0 0 8px 0" }}>Google Analytics</p>
        <Field label="GA4 Measurement ID" value={settings.ga_measurement_id} onChange={set("ga_measurement_id")} inp={inp} placeholder="Ex: G-XXXXXXXXXX" />
      </Section>

      {/* Bouton save */}
      <button onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: 8, background: saving ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 12, padding: "14px", color: "#000", fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", minHeight: 48 }}>
        {saving ? "Enregistrement..." : "💾 Enregistrer les paramètres"}
      </button>
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
