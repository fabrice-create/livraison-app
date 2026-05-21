// components/livreur/DeliveryCard.tsx
"use client";

import type { Order } from "@/types";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { waUrl, callUrl, clientWaMsgLivreur, fmt } from "@/lib/utils";

interface Props {
  order: Order;
  onDeliver: (id: number) => void;
  onSendToGare: (id: number) => void;
  onPhotoProof: (id: number) => void;
}

export function DeliveryCard({ order, onDeliver, onSendToGare, onPhotoProof }: Props) {
  const total = Number(order.amount || 0);
  const isActive = order.status === "Confirmé";
  const isDone   = order.status === "Livré";

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#111118", borderColor: isActive ? "#D97706" : "#1E1E2E" }}>
      {isActive && <div className="h-0.5 w-full" style={{ backgroundColor: "#F59E0B" }} />}

      <div className="flex items-start justify-between p-4 pb-2">
        <div>
          <div className="font-semibold text-sm" style={{ color: "#F8F8FC" }}>{order.customer_name}</div>
          <div className="mt-0.5 text-xs" style={{ color: "#55556A" }}>📍 {order.city} — {order.delivery_type}</div>
          <p className="mt-0.5 text-xs" style={{ color: "#9898B0" }}>{order.address}</p>
        </div>
        <OrderStatusBadge status={order.status} size="sm" />
      </div>

      <div className="mx-4 mb-3 flex items-center justify-between rounded-lg px-3 py-2.5"
        style={{ backgroundColor: isActive ? "#1A1200" : "#0A0A0F", border: `1px solid ${isActive ? "#D97706" : "#1E1E2E"}` }}>
        <div>
          <p className="text-[11px]" style={{ color: "#55556A" }}>À collecter</p>
          <p className="text-lg font-bold" style={{ color: isActive ? "#F59E0B" : "#F8F8FC" }}>{fmt(total)}</p>
        </div>
        <div className="text-right text-xs" style={{ color: "#9898B0" }}>
          {order.quantity ?? 1}× {order.product}
        </div>
      </div>

      <div className="border-t px-4 py-3" style={{ borderColor: "#1E1E2E" }}>
        <div className="flex gap-2 mb-2">
          <a href={callUrl(order.phone)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium border"
            style={{ borderColor: "#1E1E2E", color: "#4ADE80" }}>📞 Appeler</a>
          <a href={waUrl(order.phone, clientWaMsgLivreur(order))} target="_blank" rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium border"
            style={{ borderColor: "#1E1E2E", color: "#25D366" }}>💬 WhatsApp</a>
        </div>

        {isActive && (
          <div className="flex gap-2">
            <button onClick={() => onSendToGare(order.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium"
              style={{ backgroundColor: "#2D1500", color: "#FB923C" }}>🚌 Gare</button>
            <button onClick={() => onPhotoProof(order.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium"
              style={{ backgroundColor: "#1E1E2E", color: "#9898B0" }}>📸 Photo</button>
            <button onClick={() => onDeliver(order.id)}
              className="flex flex-[2] items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold"
              style={{ backgroundColor: "#F59E0B", color: "#000" }}>✓ Livré + Payé</button>
          </div>
        )}

        {isDone && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#4ADE80" }}>
            ✅ Livraison complétée
          </div>
        )}
      </div>
    </div>
  );
}
