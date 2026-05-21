// components/closureuse/OrderCard.tsx
"use client";

import { Order } from "@/types/order";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { SourceBadge } from "@/components/shared/SourceBadge";
import { colors } from "@/lib/design-tokens";

interface OrderCardProps {
  order: Order;
  onConfirm: (id: string) => void;
  onAssign: (id: string) => void;
  onCancel: (id: string) => void;
  onCallCustomer: (phone: string) => void;
  onWhatsApp: (phone: string, name: string) => void;
}

export function OrderCard({
  order,
  onConfirm,
  onAssign,
  onCancel,
  onCallCustomer,
  onWhatsApp,
}: OrderCardProps) {
  const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const canConfirm = order.status === "en_attente";
  const canAssign = order.status === "confirme" && !order.assigned_driver_id;

  return (
    <div
      className="rounded-xl border transition-colors duration-200"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: colors.textPrimary }}>
              {order.customer_name}
            </span>
            <SourceBadge source={order.source} />
          </div>
          <span className="text-xs" style={{ color: colors.textMuted }}>
            #{order.id.slice(0, 8).toUpperCase()} ·{" "}
            {new Date(order.created_at).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Zone + items */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
          <span>📍 {order.city} — {order.zone}</span>
          <span>·</span>
          <span>
            {totalItems} article{totalItems > 1 ? "s" : ""}
          </span>
        </div>

        {/* Items list */}
        <div className="mt-2 space-y-0.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs">
              <span style={{ color: colors.textSecondary }}>
                {item.quantity}× {item.product_name}
              </span>
              <span style={{ color: colors.textPrimary }}>
                {(item.unit_price * item.quantity).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Totaux */}
      <div
        className="mx-4 mb-3 rounded-lg px-3 py-2"
        style={{ backgroundColor: "#0A0A0F" }}
      >
        <div className="flex justify-between text-xs" style={{ color: colors.textSecondary }}>
          <span>Livraison</span>
          <span>{order.delivery_fee.toLocaleString("fr-FR")} FCFA</span>
        </div>
        <div className="mt-1 flex justify-between font-semibold">
          <span className="text-sm" style={{ color: colors.textPrimary }}>Total</span>
          <span className="text-sm" style={{ color: colors.gold }}>
            {(order.total_amount + order.delivery_fee).toLocaleString("fr-FR")} FCFA
          </span>
        </div>
      </div>

      {/* Livreur assigné */}
      {order.assigned_driver_name && (
        <div className="mx-4 mb-3 flex items-center gap-2 text-xs" style={{ color: colors.info }}>
          <span>🛵</span>
          <span>{order.assigned_driver_name}</span>
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-2 border-t px-4 py-3"
        style={{ borderColor: colors.border }}
      >
        {/* Appel + WhatsApp toujours visibles */}
        <button
          onClick={() => onCallCustomer(order.customer_phone)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors"
          style={{ borderColor: colors.border, color: colors.success }}
          title="Appeler le client"
        >
          📞
        </button>
        <button
          onClick={() => onWhatsApp(order.customer_phone, order.customer_name)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors"
          style={{ borderColor: colors.border, color: "#25D366" }}
          title="WhatsApp"
        >
          💬
        </button>

        <div className="flex flex-1 justify-end gap-2">
          {canConfirm && (
            <>
              <button
                onClick={() => onCancel(order.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ backgroundColor: colors.dangerBg, color: colors.danger }}
              >
                Annuler
              </button>
              <button
                onClick={() => onConfirm(order.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ backgroundColor: colors.infoBg, color: colors.info }}
              >
                ✓ Confirmer
              </button>
            </>
          )}
          {canAssign && (
            <button
              onClick={() => onAssign(order.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: colors.gold, color: "#000" }}
            >
              🛵 Assigner livreur
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
