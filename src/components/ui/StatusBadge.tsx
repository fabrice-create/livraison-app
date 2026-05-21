"use client"

// ============================================================
// SHIPIVO — StatusBadge
// ============================================================

import { statusStyle } from "@/lib/utils"

type Props = {
  value?: string | null
  fallback?: string
}

export default function StatusBadge({ value, fallback = "En attente" }: Props) {
  const { bg, color } = statusStyle(value)
  return (
    <span style={{
      background: bg,
      color,
      padding: "4px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {value || fallback}
    </span>
  )
}
