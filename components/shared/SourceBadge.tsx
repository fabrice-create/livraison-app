// components/shared/SourceBadge.tsx
"use client";

import { OrderSource } from "@/types/order";
import { SOURCE_ICONS } from "@/lib/design-tokens";

interface SourceBadgeProps {
  source: OrderSource;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: "#1E1E2E", color: "#9898B0" }}
    >
      <span>{SOURCE_ICONS[source] ?? "📦"}</span>
      {source}
    </span>
  );
}
