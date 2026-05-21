"use client"

// ============================================================
// SHIPIVO — NavTabs
// ============================================================

type NavItem = {
  id: string
  label: string
}

type Props = {
  items: NavItem[]
  active: string
  onChange: (id: string) => void
}

export default function NavTabs({ items, active, onChange }: Props) {
  return (
    <div style={{
      display: "flex",
      overflowX: "auto",
      borderBottom: "1px solid #1e1e2e",
      background: "#111118",
      padding: "0 4px",
    }}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          style={{
            padding: "14px 14px",
            border: "none",
            borderBottom: active === item.id ? "2px solid #f59e0b" : "2px solid transparent",
            background: "transparent",
            color: active === item.id ? "#f59e0b" : "#9ca3af",
            fontWeight: active === item.id ? 700 : 500,
            fontSize: 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
