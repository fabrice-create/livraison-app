"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "./lib/supabase"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const redirectUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

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

      router.replace("/login")
    }

    void redirectUser()
  }, [router])

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0f172a",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      Redirection...
    </div>
  )
}