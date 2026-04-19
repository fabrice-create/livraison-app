"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      const role = String(profile?.role || "").trim().toLowerCase()

      if (role === "admin") {
        router.replace("/admin")
        return
      }

      if (role === "closureuse") {
        router.replace("/closureuse")
        return
      }

      if (role === "livreur") {
        router.replace("/livreur")
        return
      }
    }

    void checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Erreur connexion : " + error.message)
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("Connexion réussie mais utilisateur introuvable.")
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      alert(
        "Connexion OK, mais profil introuvable dans la table profiles. Vérifie que le id du profil est le même que celui du compte Authentication."
      )
      setLoading(false)
      return
    }

    const role = String(profile.role || "").trim().toLowerCase()

    if (role === "admin") {
      router.replace("/admin")
      return
    }

    if (role === "closureuse") {
      router.replace("/closureuse")
      return
    }

    if (role === "livreur") {
      router.replace("/livreur")
      return
    }

    alert("Rôle inconnu dans profiles.")
    setLoading(false)
  }

  return (
    <main className="page">
      <div className="card">
        <h1 className="title">Connexion</h1>

        <form onSubmit={handleLogin} className="form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field"
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="field"
          />

          <button type="submit" disabled={loading} className="btn">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          padding: 20px;
          font-family: Arial, sans-serif;
        }

        .card {
          width: 100%;
          max-width: 420px;
          background: #1e293b;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        .title {
          margin: 0 0 20px 0;
          color: white;
          font-size: 30px;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .field {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid #475569;
          background: #0f172a;
          color: white;
          font-size: 16px;
          box-sizing: border-box;
          outline: none;
        }

        .btn {
          padding: 14px 16px;
          border-radius: 12px;
          border: none;
          background: #2563eb;
          color: white;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        }

        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  )
}