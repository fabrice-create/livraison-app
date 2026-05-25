"use client"
import { useState } from "react"
import { supabase } from "@/app/lib/supabase"
import { getUserProfile, getRedirectByRole } from "@/lib/auth"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // 1. Déconnecter toute session existante
      await supabase.auth.signOut()

      // 2. Connexion
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })

      if (authError || !data.user) {
        setError("Email ou mot de passe incorrect.")
        setLoading(false)
        return
      }

      // 3. Récupérer le profil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, role, is_active, tenant_id, full_name")
        .eq("id", data.user.id)
        .single()

      if (!profileData) {
        setError("Compte non configuré. Contacte le support.")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (!profileData.is_active) {
        setError("Ton compte est désactivé.")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // 4. Redirection selon le rôle
      const role = profileData.role?.toLowerCase().trim()
      let url = "/admin"
      if (role === "livreur") url = "/livreur"
      else if (role === "closureuse") url = "/closureuse"

      window.location.replace(url)

    } catch (err) {
      console.error("Erreur login:", err)
      setError("Une erreur est survenue. Réessayez.")
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, Arial, sans-serif", padding: 16
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: "#F59E0B", display: "inline-flex",
            alignItems: "center", justifyContent: "center", marginBottom: 16
          }}>
            <svg width="40" height="40" viewBox="0 0 26 26" fill="none">
              <rect x="2" y="2" width="22" height="4" rx="2" fill="#0A0A0F"/>
              <rect x="2" y="2" width="5" height="12" rx="2" fill="#0A0A0F"/>
              <rect x="2" y="10" width="22" height="4" rx="2" fill="#0A0A0F"/>
              <rect x="19" y="10" width="5" height="12" rx="2" fill="#0A0A0F"/>
              <rect x="2" y="18" width="22" height="4" rx="2" fill="#0A0A0F"/>
            </svg>
          </div>
          <h1 style={{ color: "#F59E0B", fontSize: 28, fontWeight: 800, margin: 0 }}>Shipivo</h1>
          <p style={{ color: "#55556A", fontSize: 12, margin: "4px 0 0 0", letterSpacing: "0.1em" }}>
            SHIP SMARTER · DELIVER FASTER
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#9898B0", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
              style={{
                width: "100%", padding: "12px 14px",
                background: "#111118", border: "1px solid #1E1E2E",
                borderRadius: 10, color: "#F8F8FC", fontSize: 15,
                outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#9898B0", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
              MOT DE PASSE
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%", padding: "12px 14px",
                background: "#111118", border: "1px solid #1E1E2E",
                borderRadius: 10, color: "#F8F8FC", fontSize: 15,
                outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "#450A0A", border: "1px solid #F8717130",
              borderRadius: 8, padding: "10px 14px",
              color: "#F87171", fontSize: 13, marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading ? "#D97706" : "#F59E0B",
              border: "none", borderRadius: 10,
              color: "#000", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#55556A", fontSize: 12, marginTop: 32 }}>
          Shipivo © 2026
        </p>
      </div>
    </div>
  )
}
