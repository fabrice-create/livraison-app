// components/closureuse/OrderCard.tsx
"use client";

import type { Order } from "@/types";
import { waUrl, callUrl, clientWaMsg, fmt } from "@/lib/utils";

const S = {
  gold: "#F59E0B", goldDark: "#D97706",
  bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  success: "#4ADE80", successBg: "#052E16",
  info: "#60A5FA", infoBg: "#0C1E3E",
  danger: "#F87171", dangerBg: "#2D0F0F",
  warning: "#FB923C", warningBg: "#2D1500",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  green: "#25D366",
};

const SOURCE_ICONS: Record<string, string> = {
  whatsapp: "💬", shopify: "🛒", youcan: "🏪", woocommerce: "🔧",
  tally: "📋", direct: "🔗", wordpress: "🌐", google_forms: "📝",
};

function StatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    "En attente": { color: S.warning, bg: S.warningBg, label: "En attente" },
    "Confirmé":   { color: S.info,    bg: S.infoBg,    label: "Confirmé" },
    "Livré":      { color: S.success, bg: S.successBg, label: "Livré + Payé" },
    "Annulé":     { color: S.danger,  bg: S.dangerBg,  label: "Annulé" },
  };
  const c = map[status || "En attente"] ?? map["En attente"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: c.color, backgroundColor: c.bg,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: c.color, display: "inline-block" }} />
      {c.label}
    </span>
  );
}

interface Props {
  order: Order;
  onConfirm: (id: number) => void;
  onAssign: (id: number) => void;
  onCancel: (id: number) => void;
}

export function OrderCard({ order, onConfirm, onAssign, onCancel }: Props) {
  const isEnAttente = order.status === "En attente";
  const isConfirme  = order.status === "Confirmé" && !order.is_assigned;
  const source = (order as any).source || "direct";

  return (
    <div style={{
      backgroundColor: S.card, border: `1px solid ${S.border}`,
      borderRadius: 14, overflow: "hidden", marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px 8px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: S.text }}>{order.customer_name}</span>
            <span style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 6,
              backgroundColor: S.border, color: S.text3,
            }}>{SOURCE_ICONS[source] ?? "📦"} {source}</span>
          </div>
          <div style={{ fontSize: 11, color: S.text3, marginTop: 3 }}>
            📍 {order.city} · #{order.id}
          </div>
          {order.address && (
            <div style={{ fontSize: 11, color: S.text2, marginTop: 2 }}>{order.address}</div>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Produit + montant */}
      <div style={{ margin: "0 12px 10px", backgroundColor: S.bg, borderRadius: 10, padding: "8px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: S.text2 }}>{order.quantity ?? 1}× {order.product}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: S.gold }}>{fmt(order.amount)}</span>
        </div>
        {order.driver_name && (
          <div style={{ fontSize: 11, color: S.info, marginTop: 4 }}>🛵 {order.driver_name}</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ borderTop: `1px solid ${S.border}`, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <a href={callUrl(order.phone)} style={{
          width: 36, height: 36, borderRadius: 9, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 16,
          border: `1px solid ${S.border}`, color: S.success, textDecoration: "none",
        }}>📞</a>
        <a href={waUrl(order.phone, clientWaMsg(order))} target="_blank" rel="noreferrer" style={{
          width: 36, height: 36, borderRadius: 9, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 16,
          border: `1px solid ${S.border}`, color: S.green, textDecoration: "none",
        }}>💬</a>

        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 6 }}>
          {isEnAttente && (
            <>
              <button onClick={() => onCancel(order.id)} style={{
                padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                backgroundColor: S.dangerBg, color: S.danger, border: "none", cursor: "pointer",
              }}>Annuler</button>
              <button onClick={() => onConfirm(order.id)} style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                backgroundColor: S.infoBg, color: S.info, border: "none", cursor: "pointer",
              }}>✓ Confirmer</button>
            </>
          )}
          {isConfirme && (
            <button onClick={() => onAssign(order.id)} style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              backgroundColor: S.gold, color: "#000", border: "none", cursor: "pointer",
            }}>🛵 Assigner livreur</button>
          )}
        </div>
      </div>
    </div>
  );
}
