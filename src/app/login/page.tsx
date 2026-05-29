"use client"
import { useState } from "react"
import { supabase } from "@/app/lib/supabase"
import { createTenantAndAdmin } from "@/lib/auth"

const S = {
  bg: "#0A0A0F",
  card: "#111118",
  border: "#1E1E2E",
  gold: "#F59E0B",
  goldDark: "#D97706",
  text: "#F8F8FC",
  text2: "#9898B0",
  text3: "#55556A",
  red: "#F87171",
  redBg: "#450A0A",
  green: "#4ADE80",
  greenBg: "#052E16",
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login")

  // Login state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [errorLogin, setErrorLogin] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)

  // Register state
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("")
  const [regName, setRegName] = useState("")
  const [regBusiness, setRegBusiness] = useState("")
  const [regPhone, setRegPhone] = useState("")
  const [regCountry, setRegCountry] = useState("TG")
  const [loadingReg, setLoadingReg] = useState(false)
  const [errorReg, setErrorReg] = useState("")
  const [successReg, setSuccessReg] = useState("")
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorLogin("")
    setLoadingLogin(true)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })
      if (authError || !data.user) {
        setErrorLogin("Email ou mot de passe incorrect.")
        setLoadingLogin(false)
        return
      }
      // Vérifier super_admins EN PREMIER
      const { data: superAdmin } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle()

      if (superAdmin) {
        window.location.replace("/super-admin")
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, role, is_active")
        .or(`user_id.eq.${data.user.id},id.eq.${data.user.id}`)
        .maybeSingle()

      if (!profileData) {
        setErrorLogin("Compte non configuré. Contacte le support.")
        setLoadingLogin(false)
        return
      }
      if (!profileData.is_active) {
        setErrorLogin("Ton compte est désactivé.")
        setLoadingLogin(false)
        return
      }
      const role = (profileData.role || "").toLowerCase().trim()
      let url = "/admin"
      if (role === "livreur") url = "/livreur"
      else if (role === "closureuse") url = "/closureuse"
      else if (role === "super_admin") url = "/super-admin"
      window.location.replace(url)
    } catch {
      setErrorLogin("Une erreur est survenue. Réessayez.")
      setLoadingLogin(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotMsg("")
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/login`
    })
    setForgotLoading(false)
    if (error) setForgotMsg("Erreur : " + error.message)
    else setForgotMsg("✅ Email envoyé ! Vérifie ta boîte mail.")
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorReg("")
    setSuccessReg("")
    if (regPassword.length < 8) {
      setErrorReg("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    setLoadingReg(true)
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
      })
      if (authError || !data.user) {
        setErrorReg(authError?.message || "Erreur lors de l'inscription.")
        setLoadingReg(false)
        return
      }
      await createTenantAndAdmin({
        userId: data.user.id,
        email: regEmail.trim().toLowerCase(),
        fullName: regName.trim(),
        businessName: regBusiness.trim(),
        phone: regPhone.trim(),
        country: regCountry,
      })
      setSuccessReg("Compte créé avec succès ! Connectez-vous maintenant.")
      setLoadingReg(false)
      setTimeout(() => setMode("login"), 2000)
    } catch (err: any) {
      setErrorReg(err.message || "Erreur lors de la création du compte.")
      setLoadingReg(false)
    }
  }

  const countries = [
    { code:"TG", name:"🇹🇬 Togo" }, { code:"SN", name:"🇸🇳 Sénégal" }, { code:"CI", name:"🇨🇮 Côte d'Ivoire" },
    { code:"BJ", name:"🇧🇯 Bénin" }, { code:"BF", name:"🇧🇫 Burkina Faso" }, { code:"ML", name:"🇲🇱 Mali" },
    { code:"NE", name:"🇳🇪 Niger" }, { code:"GN", name:"🇬🇳 Guinée" }, { code:"GW", name:"🇬🇼 Guinée-Bissau" },
    { code:"SL", name:"🇸🇱 Sierra Leone" }, { code:"LR", name:"🇱🇷 Liberia" }, { code:"GH", name:"🇬🇭 Ghana" },
    { code:"NG", name:"🇳🇬 Nigeria" }, { code:"CM", name:"🇨🇲 Cameroun" }, { code:"GA", name:"🇬🇦 Gabon" },
    { code:"CG", name:"🇨🇬 Congo-Brazzaville" }, { code:"CD", name:"🇨🇩 RD Congo" }, { code:"TD", name:"🇹🇩 Tchad" },
    { code:"CF", name:"🇨🇫 Centrafrique" }, { code:"GQ", name:"🇬🇶 Guinée Équatoriale" }, { code:"CV", name:"🇨🇻 Cap-Vert" },
    { code:"GM", name:"🇬🇲 Gambie" }, { code:"MR", name:"🇲🇷 Mauritanie" }, { code:"ST", name:"🇸🇹 São Tomé" },
    { code:"MA", name:"🇲🇦 Maroc" }, { code:"DZ", name:"🇩🇿 Algérie" }, { code:"TN", name:"🇹🇳 Tunisie" },
    { code:"LY", name:"🇱🇾 Libye" }, { code:"EG", name:"🇪🇬 Égypte" }, { code:"SD", name:"🇸🇩 Soudan" },
    { code:"SS", name:"🇸🇸 Soudan du Sud" }, { code:"ET", name:"🇪🇹 Éthiopie" }, { code:"KE", name:"🇰🇪 Kenya" },
    { code:"TZ", name:"🇹🇿 Tanzanie" }, { code:"UG", name:"🇺🇬 Ouganda" }, { code:"RW", name:"🇷🇼 Rwanda" },
    { code:"BI", name:"🇧🇮 Burundi" }, { code:"SO", name:"🇸🇴 Somalie" }, { code:"DJ", name:"🇩🇯 Djibouti" },
    { code:"ZA", name:"🇿🇦 Afrique du Sud" }, { code:"AO", name:"🇦🇴 Angola" }, { code:"MZ", name:"🇲🇿 Mozambique" },
    { code:"ZW", name:"🇿🇼 Zimbabwe" }, { code:"ZM", name:"🇿🇲 Zambie" }, { code:"MW", name:"🇲🇼 Malawi" },
    { code:"MG", name:"🇲🇬 Madagascar" }, { code:"NA", name:"🇳🇦 Namibie" }, { code:"BW", name:"🇧🇼 Botswana" },
    { code:"KM", name:"🇰🇲 Comores" }, { code:"MU", name:"🇲🇺 Maurice" }, { code:"SC", name:"🇸🇨 Seychelles" },
    { code:"FR", name:"🇫🇷 France" }, { code:"BE", name:"🇧🇪 Belgique" }, { code:"CH", name:"🇨🇭 Suisse" },
    { code:"CA", name:"🇨🇦 Canada" }, { code:"US", name:"🇺🇸 États-Unis" }, { code:"GB", name:"🇬🇧 Royaume-Uni" },
    { code:"DE", name:"🇩🇪 Allemagne" }, { code:"ES", name:"🇪🇸 Espagne" }, { code:"IT", name:"🇮🇹 Italie" },
    { code:"PT", name:"🇵🇹 Portugal" }, { code:"NL", name:"🇳🇱 Pays-Bas" }, { code:"LU", name:"🇱🇺 Luxembourg" },
    { code:"BR", name:"🇧🇷 Brésil" }, { code:"CN", name:"🇨🇳 Chine" }, { code:"JP", name:"🇯🇵 Japon" },
    { code:"IN", name:"🇮🇳 Inde" }, { code:"AU", name:"🇦🇺 Australie" },
  ]

  // Placeholders dynamiques selon le pays
  const COUNTRY_PH: Record<string, {nom: string; phone: string}> = {
    "TG": { nom:"Ex: Kofi Mensah", phone:"+228 90 00 00 00" },
    "SN": { nom:"Ex: Moussa Diallo", phone:"+221 77 000 00 00" },
    "CI": { nom:"Ex: Kouamé Konan", phone:"+225 07 00 00 00 00" },
    "BJ": { nom:"Ex: Bossou Tchabi", phone:"+229 90 00 00 00" },
    "BF": { nom:"Ex: Boureima Ouédraogo", phone:"+226 70 00 00 00" },
    "ML": { nom:"Ex: Moussa Coulibaly", phone:"+223 70 00 00 00" },
    "NE": { nom:"Ex: Moussa Mahamane", phone:"+227 90 00 00 00" },
    "GN": { nom:"Ex: Mamadou Diallo", phone:"+224 62 00 00 00" },
    "GH": { nom:"Ex: Kwame Asante", phone:"+233 54 000 0000" },
    "NG": { nom:"Ex: Chidi Okafor", phone:"+234 80 000 00000" },
    "CM": { nom:"Ex: Jean-Pierre Nkomo", phone:"+237 65 00 00 00" },
    "MA": { nom:"Ex: Mohammed Alami", phone:"+212 06 00 00 00 00" },
    "FR": { nom:"Ex: Jean Dupont", phone:"+33 06 00 00 00 00" },
    "BE": { nom:"Ex: Pierre Martin", phone:"+32 04 70 00 00 00" },
    "US": { nom:"Ex: John Doe", phone:"+1 (555) 000-0000" },
    "GB": { nom:"Ex: John Smith", phone:"+44 07700 000000" },
  }
  const ph = COUNTRY_PH[regCountry] || { nom:"Prénom et nom", phone:"+XXX 00 00 00 00" }

  return (
    <div style={{
      minHeight: "100vh", background: S.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, Arial, sans-serif", padding: 16
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 18,
            background: S.gold, display: "inline-flex",
            alignItems: "center", justifyContent: "center", marginBottom: 12
          }}>
            <svg width="38" height="38" viewBox="0 0 26 26" fill="none">
              <rect x="2" y="2" width="22" height="4" rx="2" fill="#0A0A0F"/>
              <rect x="2" y="2" width="5" height="12" rx="2" fill="#0A0A0F"/>
              <rect x="2" y="10" width="22" height="4" rx="2" fill="#0A0A0F"/>
              <rect x="19" y="10" width="5" height="12" rx="2" fill="#0A0A0F"/>
              <rect x="2" y="18" width="22" height="4" rx="2" fill="#0A0A0F"/>
            </svg>
          </div>
          <h1 style={{ color: S.gold, fontSize: 26, fontWeight: 800, margin: 0 }}>Shipivo</h1>
          <p style={{ color: S.text3, fontSize: 11, margin: "4px 0 0 0", letterSpacing: "0.1em" }}>
            SHIP SMARTER · DELIVER FASTER
          </p>
        </div>

        {/* Onglets */}
        <div style={{
          display: "flex", background: S.card,
          border: `1px solid ${S.border}`, borderRadius: 12,
          padding: 4, marginBottom: 24, gap: 4
        }}>
          {([["login", "Se connecter"], ["register", "Créer un compte"]] as const).map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setErrorLogin(""); setErrorReg(""); }}
              style={{
                flex: 1, padding: "10px", borderRadius: 9, border: "none",
                background: mode === m ? S.gold : "transparent",
                color: mode === m ? "#000" : S.text2,
                fontWeight: mode === m ? 700 : 500,
                fontSize: 13, cursor: "pointer"
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Formulaire Connexion */}
        {mode === "login" && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: S.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6, letterSpacing: "0.05em" }}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com" required
                style={{ width: "100%", padding: "12px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, color: S.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: S.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6, letterSpacing: "0.05em" }}>MOT DE PASSE</label>
              <div style={{ position:"relative" }}>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ width: "100%", padding: "12px 44px 12px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, color: S.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
                <button type="button" onClick={()=>setShowPassword(p=>!p)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:S.text2, fontSize:16, padding:0 }}>
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            {/* Mot de passe oublié */}
            <div style={{ textAlign:"right", marginTop:-12, marginBottom:16 }}>
              <button type="button" onClick={()=>setShowForgot(p=>!p)}
                style={{ background:"none", border:"none", color:S.gold, fontSize:12, cursor:"pointer", textDecoration:"underline" }}>
                Mot de passe oublié ?
              </button>
            </div>

            {/* Formulaire reset */}
            {showForgot && (
              <form onSubmit={handleForgot} style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:10, padding:"14px", marginBottom:16 }}>
                <p style={{ color:S.text2, fontSize:12, margin:"0 0 10px" }}>Entre ton email pour recevoir un lien de réinitialisation :</p>
                <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)}
                  placeholder="ton@email.com" required
                  style={{ width:"100%", padding:"10px 12px", background:S.bg, border:`1px solid ${S.border}`, borderRadius:8, color:S.text, fontSize:13, outline:"none", boxSizing:"border-box" as const, marginBottom:10 }} />
                {forgotMsg && <p style={{ color:forgotMsg.startsWith("✅")?S.green:S.red, fontSize:12, margin:"0 0 10px" }}>{forgotMsg}</p>}
                <button type="submit" disabled={forgotLoading}
                  style={{ width:"100%", padding:"10px", background:S.gold, border:"none", borderRadius:8, color:"#000", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  {forgotLoading ? "Envoi..." : "Envoyer le lien"}
                </button>
              </form>
            )}

            {errorLogin && (
              <div style={{ background: S.redBg, border: `1px solid ${S.red}30`, borderRadius: 8, padding: "10px 14px", color: S.red, fontSize: 13, marginBottom: 14 }}>
                {errorLogin}
              </div>
            )}
            <button type="submit" disabled={loadingLogin}
              style={{ width: "100%", padding: "14px", background: loadingLogin ? S.goldDark : S.gold, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 700, cursor: loadingLogin ? "not-allowed" : "pointer" }}>
              {loadingLogin ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        )}

        {/* Formulaire Inscription */}
        {mode === "register" && (
          <form onSubmit={handleRegister}>
            {[
              { label: "NOM COMPLET", value: regName, set: setRegName, placeholder: ph.nom, type: "text" },
              { label: "NOM DE LA BOUTIQUE", value: regBusiness, set: setRegBusiness, placeholder: "THERAWOLF Shop", type: "text" },
              { label: "EMAIL", value: regEmail, set: setRegEmail, placeholder: "ton@email.com", type: "email" },
              { label: "TÉLÉPHONE", value: regPhone, set: setRegPhone, placeholder: ph.phone, type: "tel" },
            ].map(({ label, value, set, placeholder, type }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <label style={{ color: S.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5, letterSpacing: "0.05em" }}>{label}</label>
                <input type={type} value={value} onChange={e => set(e.target.value)}
                  placeholder={placeholder} required
                  style={{ width: "100%", padding: "11px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, color: S.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: S.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5, letterSpacing: "0.05em" }}>PAYS</label>
              <select value={regCountry} onChange={e => setRegCountry(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, color: S.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}>
                {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: S.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5, letterSpacing: "0.05em" }}>MOT DE PASSE</label>
              <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
                placeholder="Min. 8 caractères" required minLength={8}
                style={{ width: "100%", padding: "11px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, color: S.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            {errorReg && (
              <div style={{ background: S.redBg, border: `1px solid ${S.red}30`, borderRadius: 8, padding: "10px 14px", color: S.red, fontSize: 13, marginBottom: 12 }}>
                {errorReg}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: S.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5, letterSpacing: "0.08em" }}>CONFIRMER LE MOT DE PASSE *</label>
              <div style={{ position:"relative" }}>
                <input type={showRegPassword ? "text" : "password"} value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)}
                  placeholder="Répéter le mot de passe" required
                  style={{ width: "100%", padding: "11px 44px 11px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, color: S.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
                <button type="button" onClick={()=>setShowRegPassword(p=>!p)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:S.text2, fontSize:12, padding:0, fontWeight:500 }}>
                  {showRegPassword ? (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>) : (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)}
                </button>
              </div>
            </div>
            {successReg && (
              <div style={{ background: S.greenBg, border: `1px solid ${S.green}30`, borderRadius: 8, padding: "10px 14px", color: S.green, fontSize: 13, marginBottom: 12 }}>
                {successReg}
              </div>
            )}
            <button type="submit" disabled={loadingReg}
              style={{ width: "100%", padding: "14px", background: loadingReg ? S.goldDark : S.gold, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 700, cursor: loadingReg ? "not-allowed" : "pointer" }}>
              {loadingReg ? "Création..." : "Créer mon compte"}
            </button>
            <p style={{ color: S.text3, fontSize: 11, textAlign: "center", marginTop: 10 }}>
              14 jours d&apos;essai gratuit · Sans carte bancaire
            </p>
          </form>
        )}

        <p style={{ textAlign: "center", color: S.text3, fontSize: 11, marginTop: 28 }}>
          Shipivo © 2026
        </p>
      </div>
    </div>
  )
}
