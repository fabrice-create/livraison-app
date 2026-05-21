// components/closureuse/OrderList.tsx
"use client";

import { useState, useMemo } from "react";
import { Order, OrderStatus } from "@/types/order";
import { OrderCard } from "./OrderCard";
import { colors } from "@/lib/design-tokens";

interface OrderListProps {
  orders: Order[];
  onConfirm: (id: string) => void;
  onAssign: (id: string) => void;
  onCancel: (id: string) => void;
}

const EN_COURS: OrderStatus[] = ["en_attente", "confirme"];
const HISTORIQUE: OrderStatus[] = ["livre_paye", "gare", "annule"];

function callCustomer(phone: string) {
  window.location.href = `tel:${phone}`;
}

function openWhatsApp(phone: string, name: string) {
  const msg = encodeURIComponent(
    `Bonjour ${name}, je vous contacte pour votre commande Shipivo.`
  );
  window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
}

export function OrderList({ orders, onConfirm, onAssign, onCancel }: OrderListProps) {
  const [tab, setTab] = useState<"en_cours" | "historique">("en_cours");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const statusList = tab === "en_cours" ? EN_COURS : HISTORIQUE;
    return orders
      .filter((o) => statusList.includes(o.status))
      .filter((o) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.includes(q) ||
          o.zone.toLowerCase().includes(q) ||
          o.city.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [orders, tab, search]);

  const enCoursCount = orders.filter((o) => EN_COURS.includes(o.status)).length;
  const enAttenteCount = orders.filter((o) => o.status === "en_attente").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div
        className="flex gap-1 rounded-xl p-1"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
      >
        {(["en_cours", "historique"] as const).map((t) => {
          const isActive = tab === t;
          const label = t === "en_cours" ? "En cours" : "Historique";
          const count = t === "en_cours" ? enCoursCount : orders.filter((o) => HISTORIQUE.includes(o.status)).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all duration-150"
              style={{
                backgroundColor: isActive ? colors.gold : "transparent",
                color: isActive ? "#000" : colors.textSecondary,
              }}
            >
              {label}
              <span
                className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: isActive ? "rgba(0,0,0,0.2)" : colors.border,
                  color: isActive ? "#000" : colors.textMuted,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alerte en attente */}
      {tab === "en_cours" && enAttenteCount > 0 && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
          style={{ backgroundColor: colors.warningBg, color: colors.warning }}
        >
          <span>⚠️</span>
          <span>
            <strong>{enAttenteCount}</strong> commande{enAttenteCount > 1 ? "s" : ""} en
            attente de confirmation
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: colors.textMuted }}
        >
          🔍
        </span>
        <input
          type="text"
          placeholder="Chercher client, ville, zone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border py-2.5 pl-9 pr-4 text-sm outline-none transition-colors"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.textPrimary,
          }}
        />
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl border py-12 text-center text-sm"
          style={{ borderColor: colors.border, color: colors.textMuted }}
        >
          {search ? "Aucun résultat pour cette recherche" : "Aucune commande"}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onConfirm={onConfirm}
              onAssign={onAssign}
              onCancel={onCancel}
              onCallCustomer={callCustomer}
              onWhatsApp={openWhatsApp}
            />
          ))}
        </div>
      )}
    </div>
  );
}
