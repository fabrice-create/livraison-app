// components/livreur/LivreurStats.tsx
"use client";

import type { Order } from "@/types";

const S = {
  gold: "#F59E0B", bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  success: "#4ADE80", info: "#60A5FA",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
};

interface Props { orders: Order[]; objective: number; commissionPerDelivery: number; }

export function LivreurStats({ orders, objective, commissionPerDelivery }: Props) {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at || "").toDateString() === today);
  const delivered = todayOrders.filter(o => o.status === "Livré").length;
  const pending   = orders.filter(o => o.status === "Confirmé").length;
  const commission = delivered * commissionPerDelivery;
  const progress = objective > 0 ? Math.min((delivered / objective) * 100, 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
      {/* Barre objectif */}
      <div style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: S.text2 }}>Objectif du jour</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: delivered >= objective ? S.success : S.text }}>
            {delivered} / {objective} livraisons
          </span>
        </div>
        <div style={{ height: 6, backgroundColor: S.border, borderRadius: 3 }}>
          <div style={{
            height: 6, borderRadius: 3,
            width: `${progress}%`,
            backgroundColor: progress >= 100 ? S.success : S.gold,
            transition: "width 0.4s ease",
          }} />
        </div>
        {progress >= 100 && (
          <div style={{ fontSize: 11, color: S.success, marginTop: 6, fontWeight: 600 }}>🎉 Objectif atteint !</div>
        )}
      </div>

      {/* 3 stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "En cours",   value: pending,    icon: "🚚", color: S.info },
          { label: "Livrées",    value: delivered,  icon: "✅", color: S.success },
          { label: "Commission", value: `${commission.toLocaleString("fr-FR")} F`, icon: "💰", color: S.gold },
        ].map(s => (
          <div key={s.label} style={{
            backgroundColor: S.card, border: `1px solid ${S.border}`,
            borderRadius: 12, padding: "10px 8px", textAlign: "center",
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: S.text3, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
