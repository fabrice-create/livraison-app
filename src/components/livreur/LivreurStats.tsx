// components/livreur/LivreurStats.tsx
"use client";

import type { Order } from "@/types";

interface Props { orders: Order[]; objective: number; commissionPerDelivery: number; }

export function LivreurStats({ orders, objective, commissionPerDelivery }: Props) {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at || "").toDateString() === today);
  const delivered = todayOrders.filter(o => o.status === "Livré").length;
  const pending   = todayOrders.filter(o => o.status === "Confirmé").length;
  const commission = delivered * commissionPerDelivery;
  const progress = objective > 0 ? Math.min((delivered / objective) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border p-4" style={{ backgroundColor: "#111118", borderColor: "#1E1E2E" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: "#9898B0" }}>Objectif du jour</span>
          <span className="text-sm font-bold" style={{ color: delivered >= objective ? "#4ADE80" : "#F8F8FC" }}>
            {delivered} / {objective} livraisons
          </span>
        </div>
        <div className="h-2 w-full rounded-full" style={{ backgroundColor: "#1E1E2E" }}>
          <div className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: progress >= 100 ? "#4ADE80" : "#F59E0B" }} />
        </div>
        {progress >= 100 && <p className="mt-1.5 text-xs font-medium" style={{ color: "#4ADE80" }}>🎉 Objectif atteint !</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "En cours",  value: pending,    icon: "🚚", color: "#60A5FA" },
          { label: "Livrées",   value: delivered,  icon: "✅", color: "#4ADE80" },
          { label: "Commission", value: `${commission.toLocaleString("fr-FR")} F`, icon: "💰", color: "#F59E0B" },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl border p-3"
            style={{ backgroundColor: "#111118", borderColor: "#1E1E2E" }}>
            <span className="text-base">{s.icon}</span>
            <span className="text-base font-bold" style={{ color: s.color }}>{s.value}</span>
            <span className="text-[10px] text-center" style={{ color: "#55556A" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
