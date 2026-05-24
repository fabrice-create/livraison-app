// src/hooks/useClientCurrency.ts
// Détecte le pays du client via IP et retourne sa devise + conversion

import { useState, useEffect } from "react"

const COUNTRY_CURRENCY: Record<string, string> = {
  TG: "FCFA", SN: "FCFA", CI: "FCFA", ML: "FCFA", BF: "FCFA",
  BJ: "FCFA", NE: "FCFA", GW: "FCFA",
  CM: "XAF", CG: "XAF", CF: "XAF", GA: "XAF", TD: "XAF", GQ: "XAF", CD: "CDF",
  NG: "NGN", GH: "GHS", GN: "GNF", SL: "SLL", LR: "LRD",
  GM: "GMD", CV: "CVE", MR: "MRO", ET: "ETB", KE: "KES",
  TZ: "TZS", UG: "UGX", RW: "RWF", BI: "BIF", MG: "MGA",
  MZ: "MZN", ZM: "ZMW", AO: "AOA", MU: "MUR",
  MA: "MAD", DZ: "DZD", TN: "TND", EG: "EGP", SD: "SDG",
  ZA: "ZAR", BW: "BWP", NA: "NAD",
  FR: "EUR", BE: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", PT: "EUR",
  NL: "EUR", AT: "EUR", FI: "EUR", IE: "EUR", LU: "EUR", CH: "CHF",
  GB: "GBP", SE: "SEK", NO: "NOK", DK: "DKK",
  CA: "CAD", US: "USD",
  BR: "BRL", AR: "ARS", CO: "COP",
  AE: "AED", SA: "SAR", IN: "INR", CN: "CNY", JP: "JPY",
  AU: "AUD", NZ: "NZD", TR: "TRY",
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  FCFA: "FCFA", XAF: "XAF", CDF: "FC",
  NGN: "₦", GHS: "₵", GNF: "FG", SLL: "Le", GMD: "D",
  EUR: "€", USD: "$", GBP: "£", CAD: "CA$", CHF: "CHF",
  MAD: "DH", DZD: "DA", TND: "DT", EGP: "E£",
  KES: "KSh", ZAR: "R", ETB: "Br", TZS: "TSh", UGX: "USh",
  RWF: "RF", BIF: "FBu", MGA: "Ar", MZN: "MT", ZMW: "ZK",
  AOA: "Kz", MUR: "Rs", BWP: "P", NAD: "N$",
  AED: "AED", SAR: "SR", INR: "₹", CNY: "¥", JPY: "¥",
  AUD: "A$", NZD: "NZ$", BRL: "R$", ARS: "$", COP: "$",
  SEK: "kr", NOK: "kr", DKK: "kr", TRY: "₺",
}

interface UseCurrencyResult {
  clientCurrency: string
  formatPrice: (price: number, tenantCurrency: string) => string
  ready: boolean
}

export function useClientCurrency(tenantCurrency: string): UseCurrencyResult {
  const [clientCurrency, setClientCurrency] = useState(tenantCurrency)
  const [rateToClient, setRateToClient] = useState(1)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Détecter le pays/devise du client
        const geoRes = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(3000)
        })
        let detectedCurrency = tenantCurrency
        if (geoRes.ok) {
          const geo = await geoRes.json()
          detectedCurrency = COUNTRY_CURRENCY[geo.country_code] || tenantCurrency
        }
        setClientCurrency(detectedCurrency)

        // 2. Si même devise → pas besoin de conversion
        if (detectedCurrency === tenantCurrency) {
          setRateToClient(1)
          setReady(true)
          return
        }

        // 3. Récupérer le taux depuis notre cache
        const rateRes = await fetch(`/api/rates?base=${tenantCurrency}`)
        if (rateRes.ok) {
          const data = await rateRes.json()
          const rate = data.rates?.[detectedCurrency]
          if (rate && rate > 0) setRateToClient(rate)
        }
      } catch {
        // Silencieux — on affiche la devise du tenant par défaut
      }
      setReady(true)
    }
    init()
  }, [tenantCurrency])

  const formatPrice = (price: number, _tenantCurrency: string): string => {
    const converted = Math.round(price * rateToClient)
    const symbol = CURRENCY_SYMBOLS[clientCurrency] || clientCurrency
    const formatted = converted.toLocaleString("fr-FR")
    const symbolAfter = ["FCFA", "XAF", "CDF", "MAD", "DZD", "TND", "GNF", "SLL", "GMD"]
    if (symbolAfter.includes(clientCurrency)) return `${formatted} ${symbol}`
    return `${symbol}${formatted}`
  }

  return { clientCurrency, formatPrice, ready }
}
