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
  // Afrique de l'Ouest
  { code: "TG", name: "🇹🇬 Togo" }, { code: "SN", name: "🇸🇳 Sénégal" },
  { code: "CI", name: "🇨🇮 Côte d'Ivoire" }, { code: "ML", name: "🇲🇱 Mali" },
  { code: "BF", name: "🇧🇫 Burkina Faso" }, { code: "BJ", name: "🇧🇯 Bénin" },
  { code: "NE", name: "🇳🇪 Niger" }, { code: "GN", name: "🇬🇳 Guinée" },
  { code: "GW", name: "🇬🇼 Guinée-Bissau" }, { code: "SL", name: "🇸🇱 Sierra Leone" },
  { code: "LR", name: "🇱🇷 Libéria" }, { code: "GM", name: "🇬🇲 Gambie" },
  { code: "CV", name: "🇨🇻 Cap-Vert" }, { code: "MR", name: "🇲🇷 Mauritanie" },
  { code: "NG", name: "🇳🇬 Nigeria" }, { code: "GH", name: "🇬🇭 Ghana" },
  // Afrique Centrale
  { code: "CM", name: "🇨🇲 Cameroun" }, { code: "CG", name: "🇨🇬 Congo" },
  { code: "CD", name: "🇨🇩 RD Congo" }, { code: "CF", name: "🇨🇫 Centrafrique" },
  { code: "GA", name: "🇬🇦 Gabon" }, { code: "TD", name: "🇹🇩 Tchad" },
  { code: "GQ", name: "🇬🇶 Guinée Équatoriale" },
  // Afrique de l'Est
  { code: "ET", name: "🇪🇹 Éthiopie" }, { code: "KE", name: "🇰🇪 Kenya" },
  { code: "TZ", name: "🇹🇿 Tanzanie" }, { code: "UG", name: "🇺🇬 Ouganda" },
  { code: "RW", name: "🇷🇼 Rwanda" }, { code: "BI", name: "🇧🇮 Burundi" },
  // Afrique du Nord
  { code: "MA", name: "🇲🇦 Maroc" }, { code: "DZ", name: "🇩🇿 Algérie" },
  { code: "TN", name: "🇹🇳 Tunisie" }, { code: "LY", name: "🇱🇾 Libye" },
  { code: "EG", name: "🇪🇬 Égypte" }, { code: "SD", name: "🇸🇩 Soudan" },
  // Afrique Australe
  { code: "ZA", name: "🇿🇦 Afrique du Sud" }, { code: "AO", name: "🇦🇴 Angola" },
  { code: "MZ", name: "🇲🇿 Mozambique" }, { code: "MG", name: "🇲🇬 Madagascar" },
  { code: "ZM", name: "🇿🇲 Zambie" }, { code: "ZW", name: "🇿🇼 Zimbabwe" },
  { code: "MU", name: "🇲🇺 Maurice" },
  // Europe
  { code: "FR", name: "🇫🇷 France" }, { code: "BE", name: "🇧🇪 Belgique" },
  { code: "CH", name: "🇨🇭 Suisse" }, { code: "LU", name: "🇱🇺 Luxembourg" },
  { code: "DE", name: "🇩🇪 Allemagne" }, { code: "IT", name: "🇮🇹 Italie" },
  { code: "ES", name: "🇪🇸 Espagne" }, { code: "PT", name: "🇵🇹 Portugal" },
  { code: "NL", name: "🇳🇱 Pays-Bas" }, { code: "GB", name: "🇬🇧 Royaume-Uni" },
  { code: "IE", name: "🇮🇪 Irlande" }, { code: "SE", name: "🇸🇪 Suède" },
  { code: "NO", name: "🇳🇴 Norvège" }, { code: "DK", name: "🇩🇰 Danemark" },
  { code: "FI", name: "🇫🇮 Finlande" }, { code: "AT", name: "🇦🇹 Autriche" },
  { code: "PL", name: "🇵🇱 Pologne" },
  // Amérique
  { code: "CA", name: "🇨🇦 Canada" }, { code: "US", name: "🇺🇸 États-Unis" },
  { code: "MX", name: "🇲🇽 Mexique" }, { code: "BR", name: "🇧🇷 Brésil" },
  { code: "CO", name: "🇨🇴 Colombie" }, { code: "AR", name: "🇦🇷 Argentine" },
  // Moyen-Orient
  { code: "AE", name: "🇦🇪 Émirats Arabes Unis" }, { code: "SA", name: "🇸🇦 Arabie Saoudite" },
  { code: "QA", name: "🇶🇦 Qatar" }, { code: "KW", name: "🇰🇼 Koweït" },
  { code: "TR", name: "🇹🇷 Turquie" }, { code: "LB", name: "🇱🇧 Liban" },
  // Asie
  { code: "CN", name: "🇨🇳 Chine" }, { code: "JP", name: "🇯🇵 Japon" },
  { code: "IN", name: "🇮🇳 Inde" }, { code: "SG", name: "🇸🇬 Singapour" },
  // Océanie
  { code: "AU", name: "🇦🇺 Australie" }, { code: "NZ", name: "🇳🇿 Nouvelle-Zélande" },
  // Autre
  { code: "OTHER", name: "🌍 Autre pays" },
]

type Step = 1 | 2 | 3

function Logo() {
  return (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: C.gold, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="28" height="28" viewBox="0 0 26 26" fill="none">
            <rect x="2" y="2" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
            <rect x="2" y="2" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
            <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
            <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
            <rect x="2" y="19" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.white, letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "Inter, sans-serif" }}>Shipivo</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.15em", marginTop: 3, fontFamily: "Inter, sans-serif" }}>SHIP SMARTER · DELIVER FASTER</div>
        </div>
      </a>
    </div>
  )
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const selected = COUNTRIES.find(c => c.code === value)
  const filtered = COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{
        width: "100%", background: C.bg, border: `1px solid ${open ? C.gold : C.border}`,
        borderRadius: 10, padding: "12px 14px", color: C.white, fontSize: 14,
        textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{selected?.name || "Choisir un pays"}</span>
        <span style={{ color: C.muted, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: "#111118", border: `1px solid ${C.border}`, borderRadius: 10,
          marginTop: 4, maxHeight: 280, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher un pays..."
              autoFocus
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.white, fontSize: 13, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ overflowY: "auto", maxHeight: 220 }}>
            {filtered.map(c => (
              <button key={c.code} type="button" onClick={() => { onChange(c.code); setOpen(false); setSearch(""); }}
                style={{
                  width: "100%", padding: "10px 14px", background: c.code === value ? "rgba(245,158,11,0.1)" : "transparent",
                  border: "none", color: c.code === value ? C.gold : C.white, fontSize: 13,
                  textAlign: "left", cursor: "pointer", display: "block",
                }}>
                {c.name}
              </button>
            ))}
            {filtered.length === 0 && <p style={{ padding: "16px", color: C.muted, fontSize: 13, textAlign: "center" }}>Aucun résultat</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    fullName: "", businessName: "", phone: "", country: "TG",
  })

  const set = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?signup=1`,
      },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

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
    setError(""); setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(), password: form.password,
        options: { data: { full_name: form.fullName } },
      })
      if (authError) { setError(authError.message.includes("already registered") ? "Email déjà utilisé." : authError.message); setLoading(false); return }
      if (!data.user) { setError("Erreur création compte."); setLoading(false); return }
      
      try {
        await createTenantAndAdmin({ userId: data.user.id, email: form.email.trim(), fullName: form.fullName.trim(), businessName: form.businessName.trim(), phone: form.phone.trim(), country: form.country })
        router.push("/admin?welcome=1")
      } catch (err: unknown) {
        // Si createTenantAndAdmin échoue, on supprime le compte Auth pour permettre de réessayer
        await supabase.auth.signOut()
        setError(err instanceof Error ? err.message : "Erreur création boutique. Réessaie."); 
        setLoading(false)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue"); setLoading(false)
    }
  }

  const slug = form.businessName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")
  const inp = { width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.white, fontSize: 14, outline: "none", boxSizing: "border-box" as const }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px 60px", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <Logo />

        {/* Trial banner */}
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎁</span>
          <div>
            <p style={{ color: C.gold, fontSize: 13, fontWeight: 600, margin: 0 }}>14 jours gratuits · Sans carte bancaire</p>
            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Accès complet dès maintenant</p>
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "32px 28px", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
            {[1,2,3].map((n, i) => (
              <div key={n} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" as "none" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: step > n ? C.gold : "transparent", border: `2px solid ${step >= n ? C.gold : C.border}`, color: step > n ? "#000" : step === n ? C.gold : C.muted }}>
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
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px 0" }}>Informations personnelles</p>

              {/* Google */}
              <button onClick={handleGoogleSignup} disabled={googleLoading} style={{ width: "100%", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "11px 14px", color: "#111", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? "Redirection..." : "Continuer avec Google"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ color: C.muted, fontSize: 12 }}>ou avec email</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>

              {[
                { label: "Prénom et nom", key: "fullName", placeholder: "Fabrice Kokou", type: "text" },
                { label: "Email", key: "email", placeholder: "toi@email.com", type: "email" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{f.label}</label>
                  <input type={f.type} value={(form as Record<string,string>)[f.key]} onChange={e => set(f.key)(e.target.value)} placeholder={f.placeholder}
                    style={inp} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
                </div>
              ))}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Mot de passe</label>
                <div style={{ position: "relative" }}>
                  <input type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password")(e.target.value)} placeholder="8 caractères minimum"
                    style={{ ...inp, paddingRight: 44 }} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
                  <button type="button" onClick={() => setShowPwd(v=>!v)} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:16 }}>
                    {showPwd?"🙈":"👁️"}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 4 }}>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Confirmer le mot de passe</label>
                <input type="password" value={form.confirmPassword} onChange={e => set("confirmPassword")(e.target.value)} placeholder="••••••••"
                  style={inp} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.white, margin: "0 0 4px 0" }}>Ta boutique</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px 0" }}>Comment s'appelle ton business ?</p>
              {[
                { label: "Nom de la boutique", key: "businessName", placeholder: "Ex: THERAWOLF, Chez Ama..." },
                { label: "WhatsApp / Téléphone", key: "phone", placeholder: "+228 90 00 00 00", type: "tel" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{f.label}</label>
                  <input type={f.type||"text"} value={(form as Record<string,string>)[f.key]} onChange={e => set(f.key)(e.target.value)} placeholder={f.placeholder}
                    style={inp} onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Pays</label>
                <CountrySelect value={form.country} onChange={v => set("country")(v)} />
              </div>
              {slug && (
                <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ color: C.muted, fontSize: 12, margin: "0 0 2px 0" }}>Ton URL boutique :</p>
                  <p style={{ color: C.info, fontSize: 13, fontWeight: 600, margin: 0 }}>shipivo.app/commander/{slug}</p>
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
                En créant ton compte tu acceptes les <a href="/terms" style={{ color: C.gold, textDecoration: "none" }}>Conditions d'utilisation</a>. Ton essai de 14 jours commence maintenant.
              </p>
            </>
          )}

          {error && <div style={{ background: C.dangerBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: C.danger, fontSize: 13 }}>⚠️ {error}</div>}

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
