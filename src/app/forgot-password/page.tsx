"use client"

import { useState } from "react"
import { supabase } from "@/app/lib/supabase"

const C = {
  bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  white: "#F8F8FC", muted: "#55556A", mutedLight: "#9898B0",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80",
}

function Logo() {
  return (
    <div style={{ textAlign: "center", marginBottom: 40 }}>
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    if (resetError) { setError(resetError.message); setLoading(false); return }
    setSent(true); setLoading(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Logo />
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "36px 32px", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.white, margin: "0 0 8px 0" }}>Email envoyé !</h2>
              <p style={{ color: C.muted, fontSize: 14, margin: "0 0 24px 0", lineHeight: 1.6 }}>Vérifie ta boîte <strong style={{ color: C.white }}>{email}</strong> et clique sur le lien.</p>
              <p style={{ color: C.success, fontSize: 13, marginBottom: 24 }}>✓ Vérifie aussi les spams</p>
              <a href="/login" style={{ display: "block", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, borderRadius: 10, padding: "12px", color: "#000", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                ← Retour à la connexion
              </a>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, margin: "0 0 6px 0" }}>Mot de passe oublié ?</h1>
              <p style={{ color: C.muted, fontSize: 14, margin: "0 0 28px 0" }}>On t'envoie un lien de réinitialisation</p>
              <form onSubmit={handleSubmit}>
                <label style={{ display: "block", color: C.mutedLight, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ton@email.com"
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.white, fontSize: 14, outline: "none", boxSizing: "border-box" as const, marginBottom: 20 }}
                  onFocus={e => e.target.style.borderColor=C.gold} onBlur={e => e.target.style.borderColor=C.border} />
                {error && <div style={{ background: C.dangerBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: C.danger, fontSize: 13 }}>⚠️ {error}</div>}
                <button type="submit" disabled={loading} style={{ width: "100%", background: loading ? C.goldDim : `linear-gradient(135deg,${C.gold},${C.goldDark})`, border: "none", borderRadius: 10, padding: "13px", color: "#000", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", minHeight: 46 }}>
                  {loading ? "Envoi en cours…" : "Envoyer le lien →"}
                </button>
              </form>
            </>
          )}
        </div>
        <p style={{ textAlign: "center", color: C.muted, fontSize: 14, marginTop: 24 }}>
          <a href="/login" style={{ color: C.gold, textDecoration: "none", fontWeight: 600 }}>← Retour à la connexion</a>
        </p>
      </div>
    </div>
  )
}
