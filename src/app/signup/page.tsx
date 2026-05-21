"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/app/lib/supabase"
import { createTenantAndAdmin } from "@/lib/auth"

const C = {
  bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  white: "#F8F8FC", muted: "#55556A", mutedLight: "#9898B0",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  info: "#60A5FA",
}

const COUNTRIES = [
  { code: "TG", name: "Togo" }, { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" }, { code: "ML", name: "Mali" },
  { code: "CM", name: "Cameroun" }, { code: "BF", name: "Burkina Faso" },
  { code: "BJ", name: "Bénin" }, { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" }, { code: "GH", name: "Ghana" },
  { code: "SN", name: "Sénégal" }, { code: "GN", name: "Guinée" },
  { code: "FR", name: "France" }, { code: "BE", name: "Belgique" },
  { code: "CA", name: "Canada" }, { code: "OTHER", name: "Autre pays" },
]

type Step = 1 | 2 | 3

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    fullName: "", businessName: "", phone: "", country: "TG",
  })

  const set = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const validateStep1 = () => {
    if (!form.email.includes("@")) return "Email invalide"
    if (form.password.length < 8) return "Mot de passe : 8 caractères minimum"
    if (form.password !== form.confirmPassword) return "Les mots de passe ne correspondent pas"
    if (!form.fullName.trim()) return "Ton nom est requis"
    return ""
  }

  const goNext = () => {
    setError("")
    if (step === 1) { const e = validateStep1(); if (e) { setError(e); return } }
    if (step === 2 && !form.businessName.trim()) { setError("Nom de la boutique requis"); return }
    setStep(s => (s + 1) as Step)
  }

  const handleSubmit = async () => {
    setError("")
    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.fullName } },
      })
      if (authError) { setError(authError.message.includes("already registered") ? "Email déjà utilisé. Connecte-toi." : authError.message); setLoading(false); return }
      if (!data.user) { setError("Erreur lors de la création du compte."); setLoading(false); return }
      await createTenantAndAdmin({
        userId: data.user.id,
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        businessName: form.businessName.trim(),
        phone: form.phone.trim(),
        country: form.country,
      })
      router.push("/admin?welcome=1")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue")
      setLoading(false)
    }
  }

  const slug = form.businessName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")

  const inputStyle = {
    width: "100%", background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "12px 14px", color: C.white, fontSize: 14,
    outline: "none", boxSizing: "border-box" as const,
  }

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "flex-start", justifyContent: "center",
      padding: "40px 16px 60px", fontFamily: "Inter, -apple-system, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🚀</div>
            <span style={{ fontSize: 22, fontWeight: 800, color: C.white, letterSpacing: "-0.5px" }}>Shipivo</span>
          </a>
        </div>

        {/* Trial banner */}
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎁</span>
          <div>
            <p style={{ color: C.gold, fontSize: 13, fontWeight: 600, margin: 0 }}>14 jours gratuits · Sans carte bancaire</p>
            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Accès complet dès maintenant</p>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "32px 28px", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
            {[1,2,3].map((n, i) => (
              <div key={n} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" as "none" }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  background: step > n ? C.gold : "transparent",
                  border: `2px solid ${step >= n ? C.gold : C.border}`,
                  color: step > n ? "#000" : step === n ? C.gold : C.muted,
                }}>
                  {step > n ? "✓" : n}
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: step > n ? C.gold : C.border, margin: "0 8px" }} />}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.white, margin: "0 0 4px 0" }}>Crée ton compte</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 24px 0" }}>Informations personnelles</p>
              {[
                { label: "Prénom et nom", key: "fullName", placeholder: "Fabrice Kokou" },
                { label: "Email", key: "email", placeholder: "toi@email.com", type: "email" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{f.label}</label>
                  <input type={f.type || "text"} value={(form as Record<string,string>)[f.key]} onChange={e => set(f.key)(e.target.value)} placeholder={f.placeholder}
                    style={inputStyle} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Mot de passe</label>
                <div style={{ position: "relative" }}>
                  <input type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password")(e.target.value)} placeholder="8 caractères minimum"
                    style={{ ...inputStyle, paddingRight: 44 }} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
                  <button type="button" onClick={() => setShowPwd(v=>!v)} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:16 }}>
                    {showPwd?"🙈":"👁️"}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Confirmer le mot de passe</label>
                <input type="password" value={form.confirmPassword} onChange={e => set("confirmPassword")(e.target.value)} placeholder="••••••••"
                  style={inputStyle} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.white, margin: "0 0 4px 0" }}>Ta boutique</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 24px 0" }}>Comment s'appelle ton business ?</p>
              {[
                { label: "Nom de la boutique", key: "businessName", placeholder: "Ex: THERAWOLF, Chez Ama..." },
                { label: "WhatsApp / Téléphone", key: "phone", placeholder: "+228 90 00 00 00", type: "tel" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{f.label}</label>
                  <input type={f.type||"text"} value={(form as Record<string,string>)[f.key]} onChange={e => set(f.key)(e.target.value)} placeholder={f.placeholder}
                    style={inputStyle} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Pays</label>
                <select value={form.country} onChange={e => set("country")(e.target.value)}
                  style={{ ...inputStyle, appearance: "none" as const, cursor: "pointer" }}
                  onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border}>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code} style={{ background: "#111118" }}>{c.name}</option>)}
                </select>
              </div>
              {slug && (
                <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ color: C.muted, fontSize: 12, margin: "0 0 2px 0" }}>Ton URL boutique :</p>
                  <p style={{ color: C.info, fontSize: 13, fontWeight: 600, margin: 0 }}>shipivo.app/boutique/{slug}</p>
                </div>
              )}
            </>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.white, margin: "0 0 4px 0" }}>Tout est bon ? ✅</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px 0" }}>Vérifie avant de lancer</p>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                {[
                  { label: "Nom", value: form.fullName },
                  { label: "Email", value: form.email },
                  { label: "Boutique", value: form.businessName },
                  { label: "Téléphone", value: form.phone },
                  { label: "Pays", value: COUNTRIES.find(c => c.code === form.country)?.name || form.country },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: "flex", padding: "11px 16px", borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ color: C.muted, fontSize: 13, width: 80, flexShrink: 0 }}>{row.label}</span>
                    <span style={{ color: C.white, fontSize: 13, fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <p style={{ color: C.muted, fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
                En créant ton compte tu acceptes les <a href="/terms" style={{ color: C.gold, textDecoration: "none" }}>Conditions d'utilisation</a>.
                Ton essai gratuit de 14 jours commence maintenant.
              </p>
            </>
          )}

          {error && (
            <div style={{ background: C.dangerBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: C.danger, fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            {step > 1 && (
              <button onClick={() => { setError(""); setStep(s => (s-1) as Step) }} disabled={loading}
                style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px", color: C.mutedLight, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 46 }}>
                ← Retour
              </button>
            )}
            <button onClick={step === 3 ? handleSubmit : goNext} disabled={loading}
              style={{ flex: 2, background: loading ? C.goldDim : `linear-gradient(135deg,${C.gold},${C.goldDark})`, border: "none", borderRadius: 10, padding: "12px", color: "#000", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", minHeight: 46 }}>
              {loading ? "Création en cours…" : step === 3 ? "🚀 Lancer mon espace" : "Continuer →"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 24 }}>
          Déjà un compte ?{" "}
          <a href="/login" style={{ color: C.gold, textDecoration: "none", fontWeight: 600 }}>Se connecter →</a>
        </p>
      </div>
    </div>
  )
}
