"use client"

// ============================================================
// SHIPIVO — Admin : CommissionsView
// ============================================================

import type { Order, Profile } from "@/types"
import { fmt, filterByPeriod, periodLabels, type PeriodFilter } from "@/lib/utils"
import { useMemo, useState } from "react"

type Props = {
  orders: Order[]
  closers: Profile[]
}

export default function CommissionsView({ orders, closers }: Props) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("mois")

  const commissionStats = useMemo(() => {
    const byDriver: Record<string, { name: string; total: number; count: number }> = {}
    filterByPeriod(orders.filter((o) => o.driver_commission && o.driver_commission > 0), periodFilter).forEach((o) => {
      const key = o.assigned_driver_id || "inconnu"
      if (!byDriver[key]) byDriver[key] = { name: o.driver_name || "Inconnu", total: 0, count: 0 }
      byDriver[key].total += Number(o.driver_commission)
      byDriver[key].count += 1
    })

    const byCloser: Record<string, { name: string; total: number; count: number }> = {}
    filterByPeriod(orders.filter((o) => o.closer_id && o.closer_commission && o.closer_commission > 0), periodFilter).forEach((o) => {
      const key = o.closer_id || "inconnu"
      const name = closers.find((c) => c.id === key)?.full_name || o.closer_name || "Closureuse"
      if (!byCloser[key]) byCloser[key] = { name, total: 0, count: 0 }
      byCloser[key].total += Number(o.closer_commission)
      byCloser[key].count += 1
    })

    return {
      byDriver, byCloser,
      totalDriver: Object.values(byDriver).reduce((s, v) => s + v.total, 0),
      totalCloser: Object.values(byCloser).reduce((s, v) => s + v.total, 0),
    }
  }, [orders, closers, periodFilter])

  return (
    <div>
      {/* Filtre période */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "#111118", borderRadius: 12, padding: 4, maxWidth: 360 }}>
        {(Object.entries(periodLabels) as [PeriodFilter, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setPeriodFilter(key)}
            style={{ flex: 1, padding: "11px 6px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: periodFilter === key ? "#f59e0b" : "transparent",
              color:      periodFilter === key ? "#0a0a0f"  : "#6b7280" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Totaux */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28, maxWidth: 600 }}>
        <div style={{ background: "linear-gradient(135deg, #052e16, #065f46)", border: "1px solid #4ade8040", borderRadius: 18, padding: 22 }}>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Total livreurs</p>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{fmt(commissionStats.totalDriver)}</p>
        </div>
        <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)", border: "1px solid #60a5fa30", borderRadius: 18, padding: 22 }}>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Total closeuses</p>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{fmt(commissionStats.totalCloser)}</p>
        </div>
      </div>

      {/* Par livreur */}
      <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 12 }}>🚚 PAR LIVREUR — 2 000 FCFA / LIVRAISON</p>
      {Object.values(commissionStats.byDriver).length === 0 ? (
        <p style={{ color: "#6b7280", marginBottom: 24 }}>Aucune commission sur cette période.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {Object.values(commissionStats.byDriver).map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#111118", borderRadius: 12 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{item.name}</p>
                <p style={{ fontSize: 13, color: "#6b7280" }}>{item.count} livraison(s)</p>
              </div>
              <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 18 }}>{fmt(item.total)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Par closureuse */}
      <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 12 }}>💼 PAR CLOSUREUSE — 500 FCFA / LIVRAISON</p>
      {Object.values(commissionStats.byCloser).length === 0 ? (
        <p style={{ color: "#6b7280" }}>Aucune commission sur cette période.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.values(commissionStats.byCloser).map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#111118", borderRadius: 12 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{item.name}</p>
                <p style={{ fontSize: 13, color: "#6b7280" }}>{item.count} commande(s)</p>
              </div>
              <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 18 }}>{fmt(item.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
