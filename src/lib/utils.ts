// ============================================================
// SHIPIVO — Utilitaires partagés
// ============================================================

import type { Order } from "@/types"

// ---------- Devises par pays ----------
export const COUNTRY_CURRENCY: Record<string, string> = {
  TG: "FCFA", SN: "FCFA", CI: "FCFA", ML: "FCFA", BF: "FCFA",
  BJ: "FCFA", NE: "FCFA", CM: "FCFA XAF", GN: "GNF",
  NG: "NGN", GH: "GHS", FR: "EUR", BE: "EUR", CA: "CAD", OTHER: "FCFA",
}

// Devise globale — initialisée depuis le profil admin
let _currency = "FCFA"
export const setCurrency = (c: string) => { _currency = c || "FCFA" }
export const getCurrency = () => _currency

// ---------- Formatage ----------

export const fmt = (v?: number | string | null, currency?: string): string => {
  if (v === null || v === undefined || v === "") return "-"
  return `${Number(v).toLocaleString("fr-FR")} ${currency || _currency}`
}

export const fmtDate = (d?: string | null): string => {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ---------- Rôles ----------

export const normalizeRole = (r?: string | null): string =>
  String(r || "").trim().toLowerCase()

// ---------- Type de livraison ----------

export const normDT = (v?: string | null): string => {
  const c = (v || "").trim().toLowerCase()
  if (c === "direct") return "direct"
  if (c === "gare") return "gare"
  return c
}

export const prettyDT = (v?: string | null): string => {
  const n = normDT(v)
  if (n === "direct") return "Direct"
  if (n === "gare") return "Gare"
  return v || "-"
}

export const isDirect = (v?: string | null): boolean => normDT(v) === "direct"
export const isGare = (v?: string | null): boolean => normDT(v) === "gare"

// ---------- Statut commande ----------

// En cours = En attente + Confirmé
export const isEnCours = (o: Order): boolean => {
  const s = o.status || "En attente"
  return s === "En attente" || s === "Confirmé"
}

export const isHistorique = (o: Order): boolean => !isEnCours(o)

export const isToday = (d?: string | null): boolean => {
  if (!d) return false
  return new Date(d).toDateString() === new Date().toDateString()
}

// ---------- Couleurs statut ----------

export type StatusStyle = { bg: string; color: string }

export const statusStyle = (s?: string | null): StatusStyle => {
  switch (s) {
    case "Livré":            return { bg: "#052e16", color: "#4ade80" }
    case "Confirmé":         return { bg: "#1e3a5f", color: "#60a5fa" }
    case "Annulé":           return { bg: "#450a0a", color: "#f87171" }
    case "Payé":             return { bg: "#052e16", color: "#4ade80" }
    case "Envoyé à la gare": return { bg: "#2e1065", color: "#c084fc" }
    case "Non payé":         return { bg: "#450a0a", color: "#f87171" }
    default:                 return { bg: "#431407", color: "#fb923c" }
  }
}

// ---------- Téléphone / Contact ----------

export const sanitizePhone = (p?: string | null): string =>
  String(p || "").replace(/[^\d]/g, "")

export const callUrl = (phone?: string | null): string => {
  const p = sanitizePhone(phone)
  return p ? `tel:+${p}` : "#"
}

export const waUrl = (phone?: string | null, msg?: string): string => {
  const p = sanitizePhone(phone)
  if (!p) return "#"
  return `https://wa.me/${p}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`
}

export const clientWaMsg = (o: Order): string =>
  `Bonjour ${o.customer_name}, votre commande est en cours !\n\nProduit : ${o.product} × ${o.quantity || 1}\nMontant : ${fmt(o.amount)}\nVille : ${o.city}\nLivraison : ${prettyDT(o.delivery_type)}\n\nMerci de vous tenir disponible.`

export const clientWaMsgLivreur = (o: Order): string =>
  `Bonjour ${o.customer_name}, votre commande est en route !\n\nProduit : ${o.product} × ${o.quantity || 1}\nMontant : ${fmt(o.amount)}\nLivraison : ${prettyDT(o.delivery_type)}\n\nMerci de vous tenir disponible.`

// ---------- Filtre par période ----------

export type PeriodFilter = "today" | "semaine" | "mois"

export const filterByPeriod = (list: Order[], period: PeriodFilter): Order[] => {
  const now = new Date()
  return list.filter((o) => {
    const d = o.delivered_at || o.confirmed_at || o.cancelled_at || o.created_at
    if (!d) return true
    const date = new Date(d)
    if (period === "today")   return date.toDateString() === now.toDateString()
    if (period === "semaine") return (now.getTime() - date.getTime()) / 86400000 <= 7
    if (period === "mois")    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    return true
  })
}

export const periodLabels: Record<PeriodFilter, string> = {
  today:   "Aujourd'hui",
  semaine: "Semaine",
  mois:    "Ce mois",
}

// ---------- Style input partagé ----------

export const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  background: "#111118",
  border: "1px solid #2a2a3e",
  borderRadius: 12,
  color: "white" as const,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box" as const,
}
