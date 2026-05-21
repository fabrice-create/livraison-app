"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/app/lib/supabase"
import { getUserProfile, getRedirectByRole } from "@/lib/auth"

const C = {
  bg: "#0A0A0F",
  card: "#111118",
  border: "#1E1E2E",
  gold: "#F59E0B",
  goldDark: "#D97706",
  goldDim: "#92610A",
  white: "#F8F8FC",
  muted: "#55556A",
  mutedLight: "#9898B0",
  danger: "#F87171",
  dangerBg: "rgba(248,113,113,0.08)",
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState("")
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const profile = await getUserProfile(user.id)
        if (profile) {
          router.replace(getRedirectByRole(profile.role))
          return
        }
      }
      setChecking(false)
    }
    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message.includes("Invalid login")
        ? "Email ou mot de passe incorrect."
        : authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError("Connexion échouée. Réessaie.")
      setLoading(false)
      return
    }

    const profile = await getUserProfile(data.user.id)

    if (!profile) {
      setError("Compte non configuré. Contacte le support.")
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (!profile.is_active) {
      setError("Ton compte est désactivé.")
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    router.push(getRedirectByRole(profile.role))
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%", background: C.gold,
              animation: "pulse 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.5);opacity:1}}`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px", fontFamily: "Inter, -apple-system, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 400,
        background: "radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🚀</div>
            <span style={{ fontSize: 24, fontWeight: 800, color: C.white, letterSpacing: "-0.5px" }}>Shipivo</span>
          </div>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Ship smarter. Deliver faster.</p>
        </div>

        {/* Card */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 20, padding: "36px 32px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, margin: "0 0 6px 0" }}>Connexion</h1>
          <p style={{ color: C.muted, fontSize: 14, margin: "0 0 28px 0" }}>Accède à ton espace de gestion</p>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="ton@email.com" autoComplete="email"
                style={{
                  width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: "12px 14px", color: C.white, fontSize: 14,
                  outline: "none", boxSizing: "border-box" as const,
                }}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Mot de passe</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" autoComplete="current-password"
                  style={{
                    width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "12px 44px 12px 14px", color: C.white,
                    fontSize: 14, outline: "none", boxSizing: "border-box" as const,
                  }}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 16,
                }}>
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Forgot */}
            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <a href="/forgot-password" style={{ color: C.gold, fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
                Mot de passe oublié ?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: C.dangerBg, border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 16,
                color: C.danger, fontSize: 13, display: "flex", gap: 8,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%",
              background: loading ? C.goldDim : `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
              border: "none", borderRadius: 10, padding: "13px",
              color: "#000", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", minHeight: 46,
            }}>
              {loading ? "Connexion en cours…" : "Se connecter →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 24 }}>
          Pas encore de compte ?{" "}
          <a href="/signup" style={{ color: C.gold, textDecoration: "none", fontWeight: 600 }}>
            Essai gratuit 14 jours →
          </a>
        </p>
      </div>
    </div>
  )
}
