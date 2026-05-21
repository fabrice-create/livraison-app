// components/closureuse/OrderList.tsx
"use client";

import { useState, useMemo } from "react";
import type { Order } from "@/types";
import { isEnCours, isHistorique } from "@/lib/utils";
import { OrderCard } from "./OrderCard";

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

  const enCoursCount  = orders.filter(isEnCours).length;
  const historiqueCount = orders.filter(isHistorique).length;
  const enAttenteCount  = orders.filter(o => o.status === "En attente").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: "#111118", border: "1px solid #1E1E2E" }}>
        {(["en_cours", "historique"] as const).map(t => {
          const isActive = tab === t;
          const count = t === "en_cours" ? enCoursCount : historiqueCount;
          return (
            <button key={t} onClick={() => setTab(t)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all"
              style={{ backgroundColor: isActive ? "#F59E0B" : "transparent", color: isActive ? "#000" : "#9898B0" }}>
              {t === "en_cours" ? "En cours" : "Historique"}
              <span className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: isActive ? "rgba(0,0,0,0.2)" : "#1E1E2E", color: isActive ? "#000" : "#55556A" }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "en_cours" && enAttenteCount > 0 && (
        <div className="rounded-lg px-3 py-2.5 text-sm"
          style={{ backgroundColor: "#2D1500", color: "#FB923C" }}>
          ⚠️ <strong>{enAttenteCount}</strong> commande{enAttenteCount > 1 ? "s" : ""} en attente
        </div>
      )}

      <input type="text" placeholder="Chercher client, ville..." value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-lg border py-2.5 px-4 text-sm outline-none"
        style={{ backgroundColor: "#111118", borderColor: "#1E1E2E", color: "#F8F8FC" }} />

      {filtered.length === 0 ? (
        <div className="rounded-xl border py-12 text-center text-sm"
          style={{ borderColor: "#1E1E2E", color: "#55556A" }}>
          Aucune commande
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(order => (
            <OrderCard key={order.id} order={order}
              onConfirm={onConfirm} onAssign={onAssign} onCancel={onCancel} />
          ))}
        </div>
      )}
    </div>
  );
}
