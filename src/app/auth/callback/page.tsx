"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/app/lib/supabase"
import { getUserProfile, getRedirectByRole } from "@/lib/auth"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handle = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/login"); return }

      const profile = await getUserProfile(user.id)
      if (profile) {
        router.replace(getRedirectByRole(profile.role))
      } else {
        router.replace("/signup/complete?google=1")
      }
    }
    handle()
  }, [router])

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: "#F59E0B", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="28" height="28" viewBox="0 0 26 26" fill="none">
            <rect x="2" y="2" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
            <rect x="2" y="2" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
            <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
            <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
            <rect x="2" y="19" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
          </svg>
        </div>
        <p style={{ color: "#9898B0", fontFamily: "Inter, sans-serif", fontSize: 14 }}>Connexion en cours...</p>
      </div>
    </div>
  )
}
