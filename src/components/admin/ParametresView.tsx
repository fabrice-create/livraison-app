"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"

const S = {
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", info: "#60A5FA", warning: "#FB923C",
}

interface Props { tenantId: string }

interface TenantSettings {
  name: string
  phone: string
  delivery_fee: number
  facebook_pixel_id: string
  facebook_access_token: string
  tiktok_pixel_id: string
  closer_commission: number
  driver_commission: number
}

const EMPTY: TenantSettings = {
  name: "", phone: "", delivery_fee: 0,
  facebook_pixel_id: "", facebook_access_token: "", tiktok_pixel_id: "",
  closer_commission: 500, driver_commission: 2000,
}

export default function ParametresView({ tenantId }: Props) {
  const [settings, setSettings] = useState<TenantSettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")
  const [lienCommande, setLienCommande] = useState("")

  useEffect(() => { loadSettings() }, [tenantId])

  const loadSettings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("tenants")
      .select("name, phone, delivery_fee, slug, facebook_pixel_id, facebook_access_token, tiktok_pixel_id, closer_commission, driver_commission")
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
      })
      setLienCommande(`shipivo.app/commander/${data.slug}`)
    }
    setLoading(false)
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
    }).eq("id", tenantId)

    if (err) { setError(err.message); setSaving(false); return }
    setSuccess("Paramètres enregistrés ✓")
    setSaving(false)
    setTimeout(() => setSuccess(""), 3000)
  }

  const set = (k: keyof TenantSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings(p => ({ ...p, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }))

  const inp = { width: "100%", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 12px", color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const }

  if (loading) return <p style={{ color: S.text3, fontSize: 14, textAlign: "center", padding: "40px 0" }}>Chargement...</p>

  return (
    <div style={{ padding: "0 0 60px 0" }}>
      <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: "0 0 24px 0" }}>Paramètres</h2>

      {success && <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: S.success, fontSize: 13 }}>{success}</div>}
      {error && <div style={{ background: S.dangerBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: S.danger, fontSize: 13 }}>⚠️ {error}</div>}

      {/* Lien commande */}
      <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
        <p style={{ color: S.text2, fontSize: 12, margin: "0 0 6px 0", fontWeight: 600 }}>🔗 TON LIEN DE COMMANDE</p>
        <p style={{ color: S.gold, fontSize: 14, fontWeight: 700, margin: 0, wordBreak: "break-all" as const }}>{lienCommande}</p>
        <button onClick={() => navigator.clipboard.writeText(`https://${lienCommande}`)}
          style={{ marginTop: 10, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, padding: "6px 12px", color: S.text2, fontSize: 12, cursor: "pointer" }}>
          📋 Copier le lien
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
      <Section title="💰 Commissions équipe">
        <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: S.info, fontSize: 12, margin: 0 }}>
            Commission fixe par livraison réussie. Tu peux configurer selon tes accords.
          </p>
        </div>
        <Field label="Commission closureuse (FCFA par commande)" value={String(settings.closer_commission)} onChange={set("closer_commission")} inp={inp} type="number" />
        <Field label="Commission livreur (FCFA par livraison)" value={String(settings.driver_commission)} onChange={set("driver_commission")} inp={inp} type="number" />
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
