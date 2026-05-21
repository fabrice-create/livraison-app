// components/closureuse/ClosureuseStats.tsx
"use client";

import { Order } from "@/types/order";
import { colors } from "@/lib/design-tokens";

interface ClosureuseStatsProps {
  orders: Order[];
  commissionPerOrder: number; // ex: 500 FCFA
}

export function ClosureuseStats({ orders, commissionPerOrder }: ClosureuseStatsProps) {
  const today = new Date().toDateString();

  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() === today
  );
  const livredToday = todayOrders.filter((o) => o.status === "livre_paye" || o.status === "gare");
  const confirmedToday = todayOrders.filter((o) => o.status === "confirme" || o.status === "livre_paye" || o.status === "gare");
  const commission = livredToday.length * commissionPerOrder;

  const stats = [
    {
      label: "Reçues aujourd'hui",
      value: todayOrders.length,
      icon: "📥",
      color: colors.info,
    },
    {
      label: "Confirmées",
      value: confirmedToday.length,
      icon: "✅",
      color: colors.success,
    },
    {
      label: "Livrées",
      value: livredToday.length,
      icon: "🏁",
      color: colors.gold,
    },
    {
      label: "Ma commission",
      value: `${commission.toLocaleString("fr-FR")} F`,
      icon: "💰",
      color: colors.gold,
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-1 rounded-xl border p-3 transition-colors"
          style={{
            backgroundColor: s.highlight ? "#1A1200" : colors.card,
            borderColor: s.highlight ? colors.goldDark : colors.border,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-base">{s.icon}</span>
            {s.highlight && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: colors.warningBg, color: colors.gold }}
              >
                Du jour
              </span>
            )}
          </div>
          <div className="text-xl font-bold" style={{ color: s.color }}>
            {s.value}
          </div>
          <div className="text-xs" style={{ color: colors.textMuted }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
