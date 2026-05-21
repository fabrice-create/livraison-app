// components/closureuse/ClosureuseStats.tsx
"use client";

import type { Order } from "@/types";

interface Props { orders: Order[]; commissionPerOrder: number; }

export function ClosureuseStats({ orders, commissionPerOrder }: Props) {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at || "").toDateString() === today);
  const livredToday = todayOrders.filter(o => o.status === "Livré");
  const confirmedToday = todayOrders.filter(o => o.status === "Confirmé" || o.status === "Livré");
  const commission = livredToday.length * commissionPerOrder;

  const stats = [
    { label: "Reçues aujourd'hui", value: todayOrders.length, icon: "📥", color: "#60A5FA" },
    { label: "Confirmées",         value: confirmedToday.length, icon: "✅", color: "#4ADE80" },
    { label: "Livrées",            value: livredToday.length, icon: "🏁", color: "#F59E0B" },
    { label: "Ma commission",      value: `${commission.toLocaleString("fr-FR")} F`, icon: "💰", color: "#F59E0B", highlight: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(s => (
        <div key={s.label} className="flex flex-col gap-1 rounded-xl border p-3"
          style={{ backgroundColor: s.highlight ? "#1A1200" : "#111118", borderColor: s.highlight ? "#D97706" : "#1E1E2E" }}>
          <span className="text-base">{s.icon}</span>
          <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
          <div className="text-xs" style={{ color: "#55556A" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
