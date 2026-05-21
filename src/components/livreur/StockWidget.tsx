// components/livreur/StockWidget.tsx
"use client";

import type { DriverStock } from "@/types";

interface Props { stock: DriverStock[]; onRequestStock: () => void; }

export function StockWidget({ stock, onRequestStock }: Props) {
  const totalItems = stock.reduce((sum, s) => sum + Number(s.quantity), 0);
  const lowStock   = stock.filter(s => Number(s.quantity) <= 2);

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: "#111118", borderColor: "#1E1E2E" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>📦</span>
          <h3 className="text-sm font-semibold" style={{ color: "#F8F8FC" }}>Mon stock</h3>
          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: "#1E1E2E", color: "#55556A" }}>{totalItems} unités</span>
        </div>
        <button onClick={onRequestStock}
          className="rounded-lg px-2.5 py-1 text-xs font-medium"
          style={{ backgroundColor: "#0C1E3E", color: "#60A5FA" }}>+ Demander</button>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-3 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: "#2D0F0F", color: "#F87171" }}>
          ⚠️ Stock bas : {lowStock.map(s => s.product_name).join(", ")}
        </div>
      )}

      {stock.length === 0 ? (
        <p className="text-center text-sm py-4" style={{ color: "#55556A" }}>Aucun stock</p>
      ) : (
        <div className="space-y-2">
          {stock.map(item => {
            const isLow = Number(item.quantity) <= 2;
            return (
              <div key={item.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ backgroundColor: "#0A0A0F" }}>
                <span className="text-sm" style={{ color: "#9898B0" }}>{item.product_name}</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: isLow ? "#2D0F0F" : "#052E16", color: isLow ? "#F87171" : "#4ADE80" }}>
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
