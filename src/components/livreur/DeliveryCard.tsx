// components/livreur/DeliveryCard.tsx
"use client";

import type { Order } from "@/types";
import { waUrl, callUrl, clientWaMsgLivreur, fmt } from "@/lib/utils";

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
  onDeliver: (id: number) => void;
  onSendToGare: (id: number) => void;
  onPhotoProof: (id: number) => void;
}

export function DeliveryCard({ order, onDeliver, onSendToGare, onPhotoProof }: Props) {
  const isActive = order.status === "Confirmé";
  const isDone   = order.status === "Livré";

  return (
    <div style={{
      backgroundColor: S.card,
      border: `1px solid ${isActive ? S.goldDark : S.border}`,
      borderRadius: 14, overflow: "hidden", marginBottom: 10,
    }}>
      {/* Barre or en haut si active */}
      {isActive && <div style={{ height: 2, backgroundColor: S.gold }} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px 8px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: S.text }}>{order.customer_name}</div>
          <div style={{ fontSize: 11, color: S.text3, marginTop: 2 }}>
            📍 {order.city} — {order.delivery_type || "direct"}
          </div>
          <div style={{ fontSize: 11, color: S.text2, marginTop: 2 }}>{order.address}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Montant */}
      <div style={{
        margin: "0 12px 10px",
        padding: "10px 12px",
        borderRadius: 10,
        backgroundColor: isActive ? "#1A1200" : "#0A0A0F",
        border: `1px solid ${isActive ? S.goldDark : S.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 10, color: S.text3, marginBottom: 2 }}>À collecter</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: isActive ? S.gold : S.text }}>
            {fmt(order.amount)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: S.text3 }}>{order.quantity ?? 1}× produit</div>
          <div style={{ fontSize: 11, color: S.text2, marginTop: 2 }}>{order.product}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ borderTop: `1px solid ${S.border}`, padding: "10px 12px" }}>
        {/* Contact */}
        <div style={{ display: "flex", gap: 8, marginBottom: isActive ? 8 : 0 }}>
          <a href={callUrl(order.phone)} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: `1px solid ${S.border}`, color: S.success, textDecoration: "none",
            backgroundColor: "transparent",
          }}>📞 Appeler</a>
          <a href={waUrl(order.phone, clientWaMsgLivreur(order))} target="_blank" rel="noreferrer" style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: `1px solid ${S.border}`, color: S.green, textDecoration: "none",
            backgroundColor: "transparent",
          }}>💬 WhatsApp</a>
        </div>

        {/* Actions livraison */}
        {isActive && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onSendToGare(order.id)} style={{
              flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
              backgroundColor: S.warningBg, color: S.warning, border: "none", cursor: "pointer",
            }}>🚌 Gare</button>
            <button onClick={() => onPhotoProof(order.id)} style={{
              flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
              backgroundColor: S.border, color: S.text2, border: "none", cursor: "pointer",
            }}>📸 Photo</button>
            <button onClick={() => onDeliver(order.id)} style={{
              flex: 2, padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
              backgroundColor: S.gold, color: "#000", border: "none", cursor: "pointer",
            }}>✓ Livré + Payé</button>
          </div>
        )}

        {isDone && (
          <div style={{ fontSize: 12, color: S.success, display: "flex", alignItems: "center", gap: 6 }}>
            ✅ Livraison complétée
          </div>
        )}
      </div>
    </div>
  );
}
