// components/closureuse/OrderList.tsx
"use client";

import { useState, useMemo } from "react";
import type { Order } from "@/types";
import { isEnCours, isHistorique } from "@/lib/utils";
import { OrderCard } from "./OrderCard";

const S = {
  gold: "#F59E0B", card: "#111118", border: "#1E1E2E",
  warning: "#FB923C", warningBg: "#2D1500",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
};

interface Props {
  orders: Order[];
  onConfirm: (id: number) => void;
  onAssign: (id: number) => void;
  onCancel: (id: number) => void;
}

export function OrderList({ orders, onConfirm, onAssign, onCancel }: Props) {
  const [tab, setTab] = useState<"en_cours" | "historique">("en_cours");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return orders
      .filter(o => tab === "en_cours" ? isEnCours(o) : isHistorique(o))
      .filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          o.customer_name.toLowerCase().includes(q) ||
          (o.phone || "").includes(q) ||
          (o.city || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime());
  }, [orders, tab, search]);

  const enCoursCount    = orders.filter(isEnCours).length;
  const historiqueCount = orders.filter(isHistorique).length;
  const enAttenteCount  = orders.filter(o => o.status === "En attente").length;

  return (
    <div>
      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, backgroundColor: S.card,
        border: `1px solid ${S.border}`, borderRadius: 12, padding: 4, marginBottom: 12,
      }}>
        {(["en_cours", "historique"] as const).map(t => {
          const isActive = tab === t;
          const count = t === "en_cours" ? enCoursCount : historiqueCount;
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "8px 0", borderRadius: 9,
              fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
              backgroundColor: isActive ? S.gold : "transparent",
              color: isActive ? "#000" : S.text2,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {t === "en_cours" ? "En cours" : "Historique"}
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                backgroundColor: isActive ? "rgba(0,0,0,0.2)" : S.border,
                color: isActive ? "#000" : S.text3,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Alerte */}
      {tab === "en_cours" && enAttenteCount > 0 && (
        <div style={{
          backgroundColor: S.warningBg, color: S.warning,
          borderRadius: 8, padding: "8px 12px", fontSize: 12,
          marginBottom: 10, fontWeight: 500,
        }}>
          ⚠️ <strong>{enAttenteCount}</strong> commande{enAttenteCount > 1 ? "s" : ""} en attente de confirmation
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="🔍  Chercher client, ville..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 10,
          border: `1px solid ${S.border}`, backgroundColor: S.card,
          color: S.text, fontSize: 13, outline: "none",
          boxSizing: "border-box", marginBottom: 12,
        }}
      />

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={{
          border: `1px solid ${S.border}`, borderRadius: 14,
          padding: "48px 0", textAlign: "center",
          fontSize: 13, color: S.text3,
        }}>
          {search ? "Aucun résultat" : "Aucune commande"}
        </div>
      ) : (
        filtered.map(order => (
          <OrderCard key={order.id} order={order}
            onConfirm={onConfirm} onAssign={onAssign} onCancel={onCancel} />
        ))
      )}
    </div>
  );
}
