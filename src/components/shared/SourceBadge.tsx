// components/shared/SourceBadge.tsx
"use client";

const SOURCE_ICONS: Record<string, string> = {
  whatsapp: "💬", shopify: "🛒", youcan: "🏪", woocommerce: "🔧",
  tally: "📋", direct: "🔗", wordpress: "🌐", google_forms: "📝", boutique: "🏬",
};

export function SourceBadge({ source }: { source?: string | null }) {
  if (!source) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: "#1E1E2E", color: "#9898B0" }}>
      <span>{SOURCE_ICONS[source] ?? "📦"}</span>
      {source}
    </span>
  );
}
