// components/shared/OrderStatusBadge.tsx
"use client";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "En attente": { label: "En attente", color: "#FB923C", bg: "#2D1500" },
  "Confirmé":   { label: "Confirmé",   color: "#60A5FA", bg: "#0C1E3E" },
  "Livré":      { label: "Livré + Payé", color: "#4ADE80", bg: "#052E16" },
  "Annulé":     { label: "Annulé",     color: "#F87171", bg: "#2D0F0F" },
  "Gare":       { label: "À la gare",  color: "#F59E0B", bg: "#1A1200" },
};

interface OrderStatusBadgeProps {
  status?: string | null;
  size?: "sm" | "md";
}

export function OrderStatusBadge({ status, size = "md" }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status || "En attente"] ?? STATUS_CONFIG["En attente"];
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding}`}
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: size === "sm" ? 5 : 6, height: size === "sm" ? 5 : 6, backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
