// src/app/api/rates/route.ts
// Récupère et met en cache les taux de change (1x/jour)

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Devises supportées par Shipivo
const SUPPORTED_CURRENCIES = [
  "FCFA", "XAF", "NGN", "GHS", "GNF", "EUR", "USD", "GBP",
  "CAD", "MAD", "DZD", "TND", "EGP", "KES", "ZAR", "XOF",
  "SLL", "GMD", "LRD", "CVE", "MRO", "ETB", "TZS", "UGX",
  "RWF", "BIF", "MGA", "MZN", "ZMW", "BWP", "NAD", "MUR",
  "AED", "SAR", "INR", "CNY", "JPY", "BRL", "ARS", "COP",
  "AUD", "NZD", "CHF", "SEK", "NOK", "DKK", "PLN", "TRY",
  "CDF", "AOA", "SDG"
]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const base = searchParams.get("base") || "FCFA"

    // FCFA = XOF en réalité pour les APIs de change
    const apiBase = base === "FCFA" ? "XOF" : base

    // Vérifier le cache Supabase (valide 24h)
    const { data: cached } = await supabase
      .from("exchange_rates")
      .select("rates, updated_at")
      .eq("base_currency", base)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime()
      const maxAge = 24 * 60 * 60 * 1000 // 24h
      if (age < maxAge) {
        return NextResponse.json({ base, rates: cached.rates, cached: true })
      }
    }

    // Récupérer les taux depuis l'API gratuite
    const res = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${apiBase}`,
      { next: { revalidate: 86400 } }
    )

    if (!res.ok) {
      // Si API échoue, retourner le cache même périmé
      if (cached) return NextResponse.json({ base, rates: cached.rates, cached: true })
      return NextResponse.json({ error: "Taux indisponibles" }, { status: 503 })
    }

    const data = await res.json()
    const rawRates = data.rates || {}

    // Normaliser FCFA (XOF → FCFA)
    const rates: Record<string, number> = {}
    for (const currency of SUPPORTED_CURRENCIES) {
      const apiKey = currency === "FCFA" ? "XOF" : currency
      if (rawRates[apiKey]) {
        rates[currency] = rawRates[apiKey]
      }
    }
    // FCFA = XOF, s'assurer que c'est là
    if (rawRates["XOF"]) rates["FCFA"] = rawRates["XOF"]

    // Sauvegarder dans le cache Supabase
    await supabase.from("exchange_rates").upsert(
      { base_currency: base, rates, updated_at: new Date().toISOString() },
      { onConflict: "base_currency" }
    )

    return NextResponse.json({ base, rates, cached: false })

  } catch (err) {
    console.error("Rates API error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
