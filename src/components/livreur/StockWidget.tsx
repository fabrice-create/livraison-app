// components/livreur/StockWidget.tsx
"use client";

import type { DriverStock } from "@/types";

const S = {
  gold: "#F59E0B", bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  success: "#4ADE80", successBg: "#052E16",
  info: "#60A5FA", infoBg: "#0C1E3E",
  danger: "#F87171", dangerBg: "#2D0F0F",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
};

interface Props { stock: DriverStock[]; onRequestStock: () => void; }

export function StockWidget({ stock, onRequestStock }: Props) {
  const total   = stock.reduce((sum, s) => sum + Number(s.quantity), 0);
  const lowStock = stock.filter(s => Number(s.quantity) <= 2);

  return (
    <div style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📦</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: S.text }}>Mon stock</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
            backgroundColor: S.border, color: S.text3,
          }}>{total} unités</span>
        </div>
        <button onClick={onRequestStock} style={{
          padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          backgroundColor: S.infoBg, color: S.info, border: "none", cursor: "pointer",
        }}>+ Demander</button>
      </div>

      {/* Alerte stock bas */}
      {lowStock.length > 0 && (
        <div style={{
          backgroundColor: S.dangerBg, color: S.danger,
          borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 10,
        }}>
          ⚠️ Stock bas : {lowStock.map(s => s.product_name).join(", ")}
        </div>
      )}

      {/* Liste */}
      {stock.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: S.text3 }}>
          Aucun stock actuellement
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stock.map(item => {
            const isLow = Number(item.quantity) <= 2;
            return (
              <div key={item.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                backgroundColor: S.bg, borderRadius: 8, padding: "8px 12px",
              }}>
                <span style={{ fontSize: 13, color: S.text2 }}>{item.product_name}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                  backgroundColor: isLow ? S.dangerBg : S.successBg,
                  color: isLow ? S.danger : S.success,
                }}>{item.quantity}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
