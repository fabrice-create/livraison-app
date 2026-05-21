// components/livreur/LivreurStats.tsx
"use client";

import { Order } from "@/types/order";
import { colors } from "@/lib/design-tokens";

interface LivreurStatsProps {
  orders: Order[];
  objective: number;
  commissionPerDelivery: number; // ex: 2000 FCFA
}

export function LivreurStats({ orders, objective, commissionPerDelivery }: LivreurStatsProps) {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() === today
  );

  const delivered = todayOrders.filter(
    (o) => o.status === "livre_paye" || o.status === "gare"
  ).length;
  const pending = todayOrders.filter((o) => o.status === "confirme").length;
  const commission = delivered * commissionPerDelivery;
  const progress = objective > 0 ? Math.min((delivered / objective) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Objectif barre de progression */}
      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
            Objectif du jour
          </span>
          <span className="text-sm font-bold" style={{ color: delivered >= objective ? colors.success : colors.textPrimary }}>
            {delivered} / {objective} livraisons
          </span>
        </div>
        <div className="h-2 w-full rounded-full" style={{ backgroundColor: colors.border }}>
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: progress >= 100 ? colors.success : colors.gold,
            }}
          />
        </div>
        {progress >= 100 && (
          <p className="mt-1.5 text-xs font-medium" style={{ color: colors.success }}>
            🎉 Objectif atteint !
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "En cours", value: pending, icon: "🚚", color: colors.info },
          { label: "Livrées", value: delivered, icon: "✅", color: colors.success },
          {
            label: "Commission",
            value: `${commission.toLocaleString("fr-FR")} F`,
            icon: "💰",
            color: colors.gold,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 rounded-xl border p-3"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <span className="text-base">{s.icon}</span>
            <span className="text-base font-bold" style={{ color: s.color }}>
              {s.value}
            </span>
            <span className="text-[10px] text-center" style={{ color: colors.textMuted }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
