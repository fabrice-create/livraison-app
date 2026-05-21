// components/livreur/DeliveryCard.tsx
"use client";

import { Order } from "@/types/order";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { colors } from "@/lib/design-tokens";

interface DeliveryCardProps {
  order: Order;
  onDeliver: (id: string) => void;
  onSendToGare: (id: string) => void;
  onCallCustomer: (phone: string) => void;
  onWhatsApp: (phone: string, name: string) => void;
  onPhotoProof: (id: string) => void;
}

export function DeliveryCard({
  order,
  onDeliver,
  onSendToGare,
  onCallCustomer,
  onWhatsApp,
  onPhotoProof,
}: DeliveryCardProps) {
  const total = order.total_amount + order.delivery_fee;
  const isConfirmed = order.status === "confirme";
  const isDone = order.status === "livre_paye" || order.status === "gare";

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: colors.card,
        borderColor: isConfirmed ? colors.goldDark : colors.border,
        boxShadow: isConfirmed ? `0 0 0 1px ${colors.goldDark}22` : "none",
      }}
    >
      {/* Top accent bar for active deliveries */}
      {isConfirmed && (
        <div className="h-0.5 w-full" style={{ backgroundColor: colors.gold }} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color: colors.textPrimary }}>
              {order.customer_name}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: colors.textMuted }}>
            <span>📍</span>
            <span>{order.city} — {order.zone}</span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: colors.textSecondary }}>
            {order.customer_address}
          </p>
        </div>
        <OrderStatusBadge status={order.status} size="sm" />
      </div>

      {/* Montant à collecter */}
      <div className="mx-4 mb-3 flex items-center justify-between rounded-lg px-3 py-2.5"
        style={{ backgroundColor: isConfirmed ? "#1A1200" : "#0A0A0F", border: `1px solid ${isConfirmed ? colors.goldDark : colors.border}` }}
      >
        <div>
          <p className="text-[11px]" style={{ color: colors.textMuted }}>
            À collecter
          </p>
          <p className="text-lg font-bold" style={{ color: isConfirmed ? colors.gold : colors.textPrimary }}>
            {total.toLocaleString("fr-FR")} FCFA
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px]" style={{ color: colors.textMuted }}>
            dont livraison
          </p>
          <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
            {order.delivery_fee.toLocaleString("fr-FR")} F
          </p>
        </div>
      </div>

      {/* Produits */}
      <div className="px-4 pb-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-xs py-0.5">
            <span style={{ color: colors.textSecondary }}>
              {item.quantity}× {item.product_name}
            </span>
            <span style={{ color: colors.textPrimary }}>
              {(item.unit_price * item.quantity).toLocaleString("fr-FR")} F
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div
        className="border-t px-4 py-3"
        style={{ borderColor: colors.border }}
      >
        {/* Contact */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => onCallCustomer(order.customer_phone)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium border transition-colors"
            style={{ borderColor: colors.border, color: colors.success }}
          >
            📞 Appeler
          </button>
          <button
            onClick={() => onWhatsApp(order.customer_phone, order.customer_name)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium border transition-colors"
            style={{ borderColor: colors.border, color: "#25D366" }}
          >
            💬 WhatsApp
          </button>
        </div>

        {/* Actions livraison */}
        {isConfirmed && (
          <div className="flex gap-2">
            <button
              onClick={() => onSendToGare(order.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: colors.warningBg, color: colors.warning }}
            >
              🚌 Gare
            </button>
            <button
              onClick={() => onPhotoProof(order.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: colors.border, color: colors.textSecondary }}
            >
              📸 Photo
            </button>
            <button
              onClick={() => onDeliver(order.id)}
              className="flex flex-[2] items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-colors"
              style={{ backgroundColor: colors.gold, color: "#000" }}
            >
              ✓ Livré + Payé
            </button>
          </div>
        )}

        {/* Preuve photo si livrée */}
        {isDone && order.proof_photo_url && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: colors.success }}>
            <span>📸</span>
            <span>Photo de livraison enregistrée</span>
          </div>
        )}
      </div>
    </div>
  );
}
