"use client"
import OnboardingChecklist from "./OnboardingChecklist"

// ============================================================
// SHIPIVO — Admin : DashboardView — Phase 10 Analytics Pro — v1779641651
// ============================================================

import type { Order, DriverStock } from "@/types"
import { fmt, isEnCours, isToday } from "@/lib/utils"
import { useMemo, useState } from "react"

const S = {
  gold: "#F59E0B", goldDim: "#92610A",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  green: "#4ADE80", greenBg: "#052E16", greenBorder: "#4ADE8030",
  red: "#F87171", redBg: "#450A0A", redBorder: "#F8717130",
  blue: "#60A5FA", blueBg: "#0C1A2E", blueBorder: "#60A5FA30",
  purple: "#C084FC", orange: "#FB923C",
}

type Period = "today" | "7d" | "30d" | "all"

type Props = {
  orders: Order[]
  driverStocks: DriverStock[]
}

function getPeriodLabel(p: Period) {
  return { today: "Aujourd'hui", "7d": "7 jours", "30d": "30 jours", all: "Tout" }[p]
}

function inPeriod(dateStr: string | null | undefined, period: Period): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  if (period === "today") {
    return d.toDateString() === now.toDateString()
  }
  if (period === "7d") {
    return d >= new Date(now.getTime() - 7 * 86400000)
  }
  if (period === "30d") {
    return d >= new Date(now.getTime() - 30 * 86400000)
  }
  return true
}

// Générer les données du graphique sur les 7 derniers jours
function getLast7Days(orders: Order[]) {
  const days: { label: string; total: number; livrees: number; ca: number }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
    const dayStr = d.toDateString()
    const dayOrders = orders.filter(o => o.created_at && new Date(o.created_at).toDateString() === dayStr)
    const livrees = orders.filter(o => o.delivered_at && new Date(o.delivered_at).toDateString() === dayStr)
    const ca = livrees.filter(o => o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0)
    days.push({ label, total: dayOrders.length, livrees: livrees.length, ca })
  }
  return days
}

export default function DashboardView({ orders, driverStocks, tenantId }: Props & { tenantId?: string }) {
  const [period, setPeriod] = useState<Period>("7d")
  const [chartMetric, setChartMetric] = useState<"total" | "livrees" | "ca">("total")

  const periodOrders = useMemo(() =>
    orders.filter(o => inPeriod(o.created_at, period)),
    [orders, period]
  )

  const todayStats = useMemo(() => ({
    created: orders.filter(o => isToday(o.created_at)).length,
    delivered: orders.filter(o => isToday(o.delivered_at)).length,
    amount: orders.filter(o => isToday(o.delivered_at) && o.cash_collected)
      .reduce((s, o) => s + Number(o.amount || 0), 0),
  }), [orders])

  const stats = useMemo(() => {
    const total = periodOrders.length
    const confirmed = periodOrders.filter(o => ["Confirmé", "Assigné", "En livraison", "Livré"].includes(o.status ?? "")).length
    const delivered = periodOrders.filter(o => (o.status ?? "") === "Livré").length
    const cancelled = periodOrders.filter(o => (o.status ?? "") === "Annulé").length
    const pending = periodOrders.filter(isEnCours).length
    const ca = periodOrders.filter(o => o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0)
    const pending_amount = periodOrders.filter(o => !o.cash_collected && isEnCours(o)).reduce((s, o) => s + Number(o.amount || 0), 0)
    const confirmRate = total > 0 ? Math.round((confirmed / total) * 100) : 0
    const deliveryRate = confirmed > 0 ? Math.round((delivered / confirmed) * 100) : 0
    return { total, confirmed, delivered, cancelled, pending, ca, pending_amount, confirmRate, deliveryRate }
  }, [periodOrders])

  // Top produits
  const topProducts = useMemo(() => {
    const map: Record<string, { count: number; ca: number }> = {}
    periodOrders.forEach(o => {
      const name = o.product || "Inconnu"
      if (!map[name]) map[name] = { count: 0, ca: 0 }
      map[name].count++
      if (o.cash_collected) map[name].ca += Number(o.amount || 0)
    })
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 5)
  }, [periodOrders])

  // Top sources
  const topSources = useMemo(() => {
    const map: Record<string, number> = {}
    periodOrders.forEach(o => {
      const src = o.source || "direct"
      map[src] = (map[src] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [periodOrders])

  // Performance closureuses
  const closeuseStats = useMemo(() => {
    const map: Record<string, { confirmed: number; cancelled: number; total: number }> = {}
    periodOrders.forEach(o => {
      const name = (o.closer_name as string | undefined) || "Non assigné"
      if (!map[name]) map[name] = { confirmed: 0, cancelled: 0, total: 0 }
      map[name].total++
      if (["Confirmé", "Livré", "Assigné", "En livraison"].includes(o.status ?? "")) map[name].confirmed++
      if ((o.status ?? "") === "Annulé") map[name].cancelled++
    })
    return Object.entries(map)
      .filter(([name]) => name !== "Non assigné")
      .sort((a, b) => b[1].confirmed - a[1].confirmed)
  }, [periodOrders])

  // Performance livreurs
  const livreurStats = useMemo(() => {
    const map: Record<string, { delivered: number; total: number; ca: number }> = {}
    periodOrders.forEach(o => {
      if (!o.driver_name) return
      if (!map[o.driver_name]) map[o.driver_name] = { delivered: 0, total: 0, ca: 0 }
      map[o.driver_name].total++
      if ((o.status ?? "") === "Livré") {
        map[o.driver_name].delivered++
        if (o.cash_collected) map[o.driver_name].ca += Number(o.amount || 0)
      }
    })
    return Object.entries(map).sort((a, b) => b[1].delivered - a[1].delivered)
  }, [periodOrders])

  // Stats par zone
  const zoneStats = useMemo(() => {
    const zones: Record<string, {
      nom: string; total: number; confirmed: number;
      delivered: number; cancelled: number; pending: number;
      ca: number; pending_amount: number;
    }> = {}
    periodOrders.forEach(o => {
      const z = o.zone_nom || "Sans zone"
      if (!zones[z]) zones[z] = { nom: z, total:0, confirmed:0, delivered:0, cancelled:0, pending:0, ca:0, pending_amount:0 }
      zones[z].total++
      const s = o.status ?? ""
      if (["Confirmé","Assigné","En livraison","Livré"].includes(s)) zones[z].confirmed++
      if (s === "Livré") {
        zones[z].delivered++
        if (o.cash_collected) zones[z].ca += Number(o.amount || 0)
      }
      if (s === "Annulé") zones[z].cancelled++
      if (!["Livré","Annulé"].includes(s)) {
        zones[z].pending++
        if (!o.cash_collected) zones[z].pending_amount += Number(o.amount || 0)
      }
    })
    return Object.values(zones).sort((a, b) => b.total - a.total)
  }, [periodOrders])

  // Graphique 7 jours
  const chartData = useMemo(() => getLast7Days(orders), [orders])
  const chartMax = useMemo(() => {
    const vals = chartData.map(d => chartMetric === "ca" ? d.ca : chartMetric === "livrees" ? d.livrees : d.total)
    return Math.max(...vals, 1)
  }, [chartData, chartMetric])

  const sourceEmoji: Record<string, string> = {
    facebook: "📘", tiktok: "🎵", whatsapp: "💬", instagram: "📸",
    direct: "🌐", widget: "🔌", organic: "🌱"
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: S.text }}>

      {/* Onboarding checklist */}
      {tenantId && <OnboardingChecklist tenantId={tenantId} />}

      {/* Sélecteur période */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {(["today", "7d", "30d", "all"] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${period === p ? S.gold : S.border}`, background: period === p ? "rgba(245,158,11,0.12)" : S.card, color: period === p ? S.gold : S.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {getPeriodLabel(p)}
          </button>
        ))}
      </div>

      {/* Stats aujourd'hui rapides */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <MiniStat label="📝 Aujourd'hui" value={todayStats.created} sub="commandes" />
        <MiniStat label="🎯 Livrées" value={todayStats.delivered} sub="aujourd'hui" color={S.green} />
        <MiniStat label="💵 Encaissé" value={fmt(todayStats.amount)} sub="aujourd'hui" color={S.gold} small />
      </div>

      {/* KPIs principaux période */}
      <SectionTitle title={`📊 Performance — ${getPeriodLabel(period)}`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 8 }}>
        <KPICard label="Commandes reçues" value={stats.total} icon="📥" color={S.blue} bg={S.blueBg} border={S.blueBorder} />
        <KPICard label="Confirmées" value={stats.confirmed} icon="✅" color={S.green} bg={S.greenBg} border={S.greenBorder} />
        <KPICard label="Livrées" value={stats.delivered} icon="🎯" color={S.gold} bg="#1A1200" border="#F59E0B30" />
        <KPICard label="Annulées" value={stats.cancelled} icon="❌" color={S.red} bg={S.redBg} border={S.redBorder} />
      </div>

      {/* Taux conversion */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <RateCard label="Taux de confirmation" rate={stats.confirmRate} color={S.blue} />
        <RateCard label="Taux de livraison" rate={stats.deliveryRate} color={S.green} />
      </div>

      {/* Montants */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #052E16, #065F46)", border: `1px solid ${S.greenBorder}`, borderRadius: 14, padding: 16 }}>
          <p style={{ color: S.text2, fontSize: 12, margin: "0 0 6px 0" }}>💵 Chiffre d'affaires</p>
          <p style={{ color: S.green, fontSize: 22, fontWeight: 800, margin: 0 }}>{fmt(stats.ca)}</p>
        </div>
        <div style={{ background: "linear-gradient(135deg, #450A0A, #7F1D1D)", border: `1px solid ${S.redBorder}`, borderRadius: 14, padding: 16 }}>
          <p style={{ color: S.text2, fontSize: 12, margin: "0 0 6px 0" }}>⏳ En attente paiement</p>
          <p style={{ color: S.red, fontSize: 22, fontWeight: 800, margin: 0 }}>{fmt(stats.pending_amount)}</p>
        </div>
      </div>

      {/* Graphique 7 jours */}
      <SectionTitle title="📈 Évolution 7 jours" />
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
        {/* Sélecteur métrique */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {([["total", "Commandes"], ["livrees", "Livrées"], ["ca", "CA"]] as const).map(([m, label]) => (
            <button key={m} onClick={() => setChartMetric(m)}
              style={{ padding: "4px 10px", borderRadius: 12, border: `1px solid ${chartMetric === m ? S.gold : S.border}`, background: chartMetric === m ? "rgba(245,158,11,0.1)" : "transparent", color: chartMetric === m ? S.gold : S.text3, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
        {/* Barres */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
          {chartData.map((d, i) => {
            const val = chartMetric === "ca" ? d.ca : chartMetric === "livrees" ? d.livrees : d.total
            const h = Math.round((val / chartMax) * 100)
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ color: S.text3, fontSize: 9, fontWeight: 600 }}>
                  {chartMetric === "ca" ? (val > 0 ? fmt(val).replace(/\s/g, "").slice(0, 6) : "0") : val}
                </span>
                <div style={{ width: "100%", height: `${Math.max(h, 4)}%`, background: h > 0 ? `linear-gradient(to top, ${S.gold}, ${S.gold}88)` : S.border, borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.3s" }} />
                <span style={{ color: S.text3, fontSize: 9, textAlign: "center", lineHeight: 1.2 }}>{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top produits */}
      {topProducts.length > 0 && (
        <>
          <SectionTitle title="🏆 Top produits" />
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, marginBottom: 20 }}>
            {topProducts.map(([name, data], i) => {
              const maxCount = topProducts[0][1].count
              const pct = Math.round((data.count / maxCount) * 100)
              return (
                <div key={name} style={{ marginBottom: i < topProducts.length - 1 ? 12 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: S.text, fontSize: 13, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  "} {name}
                    </span>
                    <span style={{ color: S.gold, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{data.count} ventes</span>
                  </div>
                  <div style={{ background: S.border, borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${S.gold}, ${S.orange})`, borderRadius: 4, height: "100%" }} />
                  </div>
                  {data.ca > 0 && <p style={{ color: S.text3, fontSize: 11, margin: "3px 0 0 0" }}>CA: {fmt(data.ca)}</p>}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Sources */}
      {topSources.length > 0 && (
        <>
          <SectionTitle title="📡 Sources de commandes" />
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {topSources.map(([src, count]) => {
                const pct = Math.round((count / stats.total) * 100)
                return (
                  <div key={src} style={{ background: S.card2, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{sourceEmoji[src.toLowerCase()] || "🌐"}</span>
                    <div>
                      <p style={{ color: S.text, fontSize: 12, fontWeight: 600, margin: 0, textTransform: "capitalize" }}>{src}</p>
                      <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>{count} ({pct}%)</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Performance closureuses */}
      {closeuseStats.length > 0 && (
        <>
          <SectionTitle title="📞 Performance closureuses" />
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            {closeuseStats.map(([name, data], i) => {
              const rate = data.total > 0 ? Math.round((data.confirmed / data.total) * 100) : 0
              return (
                <div key={name} style={{ padding: "12px 14px", borderBottom: i < closeuseStats.length - 1 ? `1px solid ${S.border}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: S.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    👩
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: "0 0 2px 0" }}>{name}</p>
                    <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>{data.confirmed} confirmées · {data.cancelled} annulées</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: rate >= 70 ? S.green : rate >= 50 ? S.gold : S.red, fontSize: 18, fontWeight: 800, margin: 0 }}>{rate}%</p>
                    <p style={{ color: S.text3, fontSize: 10, margin: 0 }}>taux</p>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Performance livreurs */}
      {livreurStats.length > 0 && (
        <>
          <SectionTitle title="🚚 Performance livreurs" />
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            {livreurStats.map(([name, data], i) => {
              const rate = data.total > 0 ? Math.round((data.delivered / data.total) * 100) : 0
              return (
                <div key={name} style={{ padding: "12px 14px", borderBottom: i < livreurStats.length - 1 ? `1px solid ${S.border}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: S.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    🛵
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: "0 0 2px 0" }}>{name}</p>
                    <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>{data.delivered}/{data.total} livraisons · {fmt(data.ca)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: rate >= 80 ? S.green : rate >= 60 ? S.gold : S.red, fontSize: 18, fontWeight: 800, margin: 0 }}>{rate}%</p>
                    <p style={{ color: S.text3, fontSize: 10, margin: 0 }}>taux</p>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Stock par livreur */}
      {Object.keys(driverStocks.reduce((acc: Record<string, number>, i) => {
        acc[i.driver_name] = (acc[i.driver_name] || 0) + Number(i.quantity || 0); return acc
      }, {})).length > 0 && (
        <>
          <SectionTitle title="📦 Stock par livreur" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, marginBottom: 20 }}>
            {Object.entries(driverStocks.reduce((acc: Record<string, number>, i) => {
              acc[i.driver_name] = (acc[i.driver_name] || 0) + Number(i.quantity || 0); return acc
            }, {})).map(([driver, qty]) => (
              <div key={driver} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <p style={{ fontSize: 11, color: S.text2, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{driver}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: S.gold, margin: 0 }}>{qty}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── STATS PAR ZONE ── */}
      {zoneStats.length >= 1 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ color: S.text2, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            🌍 PERFORMANCE PAR ZONE — {getPeriodLabel(period)}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {zoneStats.map(z => {
              const confirmRate = z.total > 0 ? Math.round((z.confirmed / z.total) * 100) : 0
              const deliveryRate = z.confirmed > 0 ? Math.round((z.delivered / z.confirmed) * 100) : 0
              return (
                <div key={z.nom} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16 }}>
                  {/* En-tête zone */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <p style={{ color: S.text, fontSize: 15, fontWeight: 800, margin: 0 }}>{z.nom}</p>
                    <span style={{ color: S.gold, fontSize: 13, fontWeight: 700 }}>{z.total} commandes</span>
                  </div>
                  {/* KPIs */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ color: S.text2, fontSize: 10, margin: "0 0 4px" }}>Reçues</p>
                      <p style={{ color: S.blue, fontSize: 18, fontWeight: 800, margin: 0 }}>{z.total}</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ color: S.text2, fontSize: 10, margin: "0 0 4px" }}>Livrées</p>
                      <p style={{ color: S.green, fontSize: 18, fontWeight: 800, margin: 0 }}>{z.delivered}</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ color: S.text2, fontSize: 10, margin: "0 0 4px" }}>Annulées</p>
                      <p style={{ color: S.red, fontSize: 18, fontWeight: 800, margin: 0 }}>{z.cancelled}</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ color: S.text2, fontSize: 10, margin: "0 0 4px" }}>En cours</p>
                      <p style={{ color: S.orange, fontSize: 18, fontWeight: 800, margin: 0 }}>{z.pending}</p>
                    </div>
                  </div>
                  {/* Taux + CA */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <div style={{ background: S.card2, borderRadius: 8, padding: "8px 12px" }}>
                      <p style={{ color: S.text2, fontSize: 10, margin: "0 0 4px" }}>Taux confirmation</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ color: S.blue, fontSize: 16, fontWeight: 800, margin: 0 }}>{confirmRate}%</p>
                        <div style={{ flex: 1, background: S.border, borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${confirmRate}%`, background: S.blue, borderRadius: 4, height: "100%" }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ background: S.card2, borderRadius: 8, padding: "8px 12px" }}>
                      <p style={{ color: S.text2, fontSize: 10, margin: "0 0 4px" }}>Taux livraison</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ color: S.green, fontSize: 16, fontWeight: 800, margin: 0 }}>{deliveryRate}%</p>
                        <div style={{ flex: 1, background: S.border, borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${deliveryRate}%`, background: S.green, borderRadius: 4, height: "100%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* CA */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ background: "linear-gradient(135deg,#052E16,#065F46)", border: `1px solid ${S.greenBorder}`, borderRadius: 8, padding: "8px 12px" }}>
                      <p style={{ color: S.text2, fontSize: 10, margin: "0 0 4px" }}>💵 CA encaissé</p>
                      <p style={{ color: S.green, fontSize: 14, fontWeight: 800, margin: 0 }}>{fmt(z.ca)}</p>
                    </div>
                    <div style={{ background: "linear-gradient(135deg,#450A0A,#7F1D1D)", border: `1px solid ${S.redBorder}`, borderRadius: 8, padding: "8px 12px" }}>
                      <p style={{ color: S.text2, fontSize: 10, margin: "0 0 4px" }}>⏳ En attente</p>
                      <p style={{ color: S.red, fontSize: 14, fontWeight: 800, margin: 0 }}>{fmt(z.pending_amount)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

function KPICard({ label, value, icon, color, bg, border }: { label: string; value: number; icon: string; color: string; bg: string; border: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div>
        <p style={{ color: "#9898B0", fontSize: 11, margin: "0 0 2px 0" }}>{label}</p>
        <p style={{ color, fontSize: 22, fontWeight: 800, margin: 0 }}>{value}</p>
      </div>
    </div>
  )
}

function RateCard({ label, rate, color }: { label: string; rate: number; color: string }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #1E1E2E", borderRadius: 12, padding: 14 }}>
      <p style={{ color: "#9898B0", fontSize: 11, margin: "0 0 8px 0" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <p style={{ color, fontSize: 24, fontWeight: 800, margin: 0 }}>{rate}%</p>
        <div style={{ flex: 1, background: "#1E1E2E", borderRadius: 4, height: 8 }}>
          <div style={{ width: `${rate}%`, background: color, borderRadius: 4, height: "100%", transition: "width 0.5s" }} />
        </div>
      </div>
    </div>
  )
}

// ---- Sous-composants ----

function SectionTitle({ title }: { title: string }) {
  return <p style={{ fontSize: 12, color: "#6B7280", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10, marginTop: 4 }}>{title}</p>
}

function MiniStat({ label, value, sub, color = "white", small = false }: { label: string; value: string | number; sub: string; color?: string; small?: boolean }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #1E1E2E", borderRadius: 12, padding: 12, textAlign: "center" }}>
      <p style={{ fontSize: 11, color: "#9898B0", margin: "0 0 4px 0" }}>{label}</p>
      <p style={{ fontSize: small ? 16 : 26, fontWeight: 800, color, margin: "0 0 2px 0" }}>{value}</p>
      <p style={{ fontSize: 10, color: "#55556A", margin: 0 }}>{sub}</p>
    </div>
  )
}
