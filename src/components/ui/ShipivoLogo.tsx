"use client"

interface ShipivoLogoProps {
  size?: "sm" | "md" | "lg"
  showSlogan?: boolean
}

const SIZES = {
  sm: { icon: 32, iconRadius: 8, fontSize: 20, sloganSize: 9 },
  md: { icon: 44, iconRadius: 11, fontSize: 28, sloganSize: 10 },
  lg: { icon: 56, iconRadius: 14, fontSize: 36, sloganSize: 11 },
}

export default function ShipivoLogo({ size = "md", showSlogan = false }: ShipivoLogoProps) {
  const s = SIZES[size]
  const gold = "#F59E0B"
  const dark = "#0A0A0F"
  const white = "#F8F8FC"
  const muted = "#55556A"

  const barW = s.icon * 0.58
  const barH = Math.max(3, s.icon * 0.1)
  const barR = barH / 2
  const padX = s.icon * 0.2
  const padY = s.icon * 0.18
  const gap = (s.icon - padY * 2 - barH * 3) / 2

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: s.icon * 0.25 }}>
      {/* Icône S géométrique */}
      <div style={{
        width: s.icon, height: s.icon, borderRadius: s.iconRadius,
        background: gold, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <svg width={s.icon * 0.65} height={s.icon * 0.65} viewBox="0 0 26 26" fill="none">
          {/* S géométrique */}
          <rect x="2" y="2" width="22" height="5" rx="2.5" fill={dark}/>
          <rect x="2" y="2" width="5" height="12" rx="2.5" fill={dark}/>
          <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill={dark}/>
          <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill={dark}/>
          <rect x="2" y="19" width="22" height="5" rx="2.5" fill={dark}/>
        </svg>
      </div>

      {/* Texte */}
      <div>
        <div style={{
          fontSize: s.fontSize,
          fontWeight: 800,
          color: white,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          fontFamily: "Inter, -apple-system, sans-serif",
        }}>
          Shipivo
        </div>
        {showSlogan && (
          <div style={{
            fontSize: s.sloganSize,
            color: muted,
            letterSpacing: "0.15em",
            marginTop: 4,
            fontFamily: "Inter, sans-serif",
            fontWeight: 400,
          }}>
            SHIP SMARTER · DELIVER FASTER
          </div>
        )}
      </div>
    </div>
  )
}
