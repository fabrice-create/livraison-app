// components/shared/OrderStatusBadge.tsx
"use client";

import { OrderStatus } from "@/types/order";
import { STATUS_CONFIG } from "@/lib/design-tokens";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
}

export function OrderStatusBadge({ status, size = "md" }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding}`}
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: size === "sm" ? 5 : 6,
          height: size === "sm" ? 5 : 6,
          backgroundColor: config.color,
        }}
      />
      {config.label}
    </span>
  );
}
