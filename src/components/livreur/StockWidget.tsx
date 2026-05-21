// components/livreur/StockWidget.tsx
"use client";

import { DriverStock } from "@/types/order";
import { colors } from "@/lib/design-tokens";

interface StockWidgetProps {
  stock: DriverStock[];
  onRequestStock: () => void;
}

export function StockWidget({ stock, onRequestStock }: StockWidgetProps) {
  const totalItems = stock.reduce((sum, s) => sum + s.quantity, 0);
  const lowStock = stock.filter((s) => s.quantity <= 2);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>📦</span>
          <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
            Mon stock
          </h3>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: colors.border, color: colors.textMuted }}
          >
            {totalItems} unités
          </span>
        </div>
        <button
          onClick={onRequestStock}
          className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
          style={{ backgroundColor: colors.infoBg, color: colors.info }}
        >
          + Demander
        </button>
      </div>

      {/* Alerte stock bas */}
      {lowStock.length > 0 && (
        <div
          className="mb-3 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: colors.dangerBg, color: colors.danger }}
        >
          ⚠️ Stock bas : {lowStock.map((s) => s.product_name).join(", ")}
        </div>
      )}

      {/* Liste produits */}
      {stock.length === 0 ? (
        <p className="text-center text-sm py-4" style={{ color: colors.textMuted }}>
          Aucun stock actuellement
        </p>
      ) : (
        <div className="space-y-2">
          {stock.map((item) => {
            const isLow = item.quantity <= 2;
            return (
              <div
                key={item.product_id}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ backgroundColor: "#0A0A0F" }}
              >
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  {item.product_name}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: isLow ? colors.dangerBg : colors.successBg,
                    color: isLow ? colors.danger : colors.success,
                  }}
                >
                  {item.quantity}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
