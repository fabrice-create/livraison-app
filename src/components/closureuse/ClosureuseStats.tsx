// components/closureuse/ClosureuseStats.tsx
"use client";

import type { Order } from "@/types";

const S = {
  gold: "#F59E0B", goldDark: "#D97706",
  card: "#111118", border: "#1E1E2E",
  success: "#4ADE80", info: "#60A5FA",
  text3: "#55556A",
};

interface Props { orders: Order[]; commissionPerOrder: number; }

export function ClosureuseStats({ orders, commissionPerOrder }: Props) {
  const today = new Date().toDateString();
  const todayOrders   = orders.filter(o => new Date(o.created_at || "").toDateString() === today);
  const livredToday   = todayOrders.filter(o => o.status === "Livré").length;
  const confirmedToday = todayOrders.filter(o => o.status === "Confirmé" || o.status === "Livré").length;
  const commission    = livredToday * commissionPerOrder;

  const stats = [
    { label: "Reçues",     value: todayOrders.length,  icon: "📥", color: S.info },
    { label: "Confirmées", value: confirmedToday,        icon: "✅", color: S.success },
    { label: "Livrées",    value: livredToday,           icon: "🏁", color: S.gold },
    { label: "Commission", value: `${commission.toLocaleString("fr-FR")} F`, icon: "💰", color: S.gold, highlight: true },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          backgroundColor: s.highlight ? "#1A1200" : S.card,
          border: `1px solid ${s.highlight ? S.goldDark : S.border}`,
          borderRadius: 12, padding: "12px",
        }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 10, color: S.text3, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
