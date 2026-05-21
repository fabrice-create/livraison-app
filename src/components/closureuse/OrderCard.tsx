// components/closureuse/OrderCard.tsx
"use client";

import type { Order } from "@/types";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { waUrl, callUrl, clientWaMsg, fmt } from "@/lib/utils";

interface Props {
  order: Order;
  onConfirm: (id: number) => void;
  onAssign: (id: number) => void;
  onCancel: (id: number) => void;
}

export function OrderCard({ order, onConfirm, onAssign, onCancel }: Props) {
  const isEnAttente = order.status === "En attente";
  const isConfirme  = order.status === "Confirmé" && !order.is_assigned;
  const total = Number(order.amount || 0);

  return (
    <div className="rounded-xl border" style={{ backgroundColor: "#111118", borderColor: "#1E1E2E" }}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div>
          <div className="font-semibold text-sm" style={{ color: "#F8F8FC" }}>{order.customer_name}</div>
          <div className="text-xs mt-0.5" style={{ color: "#55556A" }}>
            📍 {order.city} — {order.address}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#55556A" }}>
            #{order.id} · {order.created_at ? new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Produit */}
      <div className="px-4 pb-3">
        <div className="flex justify-between text-xs">
          <span style={{ color: "#9898B0" }}>{order.quantity ?? 1}× {order.product}</span>
          <span style={{ color: "#F8F8FC" }}>{fmt(total)}</span>
        </div>
        {order.driver_name && (
          <div className="mt-1 text-xs" style={{ color: "#60A5FA" }}>🛵 {order.driver_name}</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t px-4 py-3" style={{ borderColor: "#1E1E2E" }}>
        <a href={callUrl(order.phone)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border text-base"
          style={{ borderColor: "#1E1E2E", color: "#4ADE80" }}>📞</a>
        <a href={waUrl(order.phone, clientWaMsg(order))} target="_blank" rel="noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-lg border text-base"
          style={{ borderColor: "#1E1E2E", color: "#25D366" }}>💬</a>

        <div className="flex flex-1 justify-end gap-2">
          {isEnAttente && (
            <>
              <button onClick={() => onCancel(order.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{ backgroundColor: "#2D0F0F", color: "#F87171" }}>Annuler</button>
              <button onClick={() => onConfirm(order.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{ backgroundColor: "#0C1E3E", color: "#60A5FA" }}>✓ Confirmer</button>
            </>
          )}
          {isConfirme && (
            <button onClick={() => onAssign(order.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: "#F59E0B", color: "#000" }}>🛵 Assigner</button>
          )}
        </div>
      </div>
    </div>
  );
}
