"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"

const S = {
  gold: "#F59E0B", goldDark: "#D97706",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", info: "#60A5FA", warning: "#FB923C",
}

interface Client {
  phone: string
  customer_name: string
  order_count: number
  total_spent: number
  last_order: string
  is_blacklisted: boolean
  source: string
}

const SOURCE_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  whatsapp:  { icon: "💬", color: "#25D366", label: "WhatsApp" },
  facebook:  { icon: "📘", color: "#1877F2", label: "Facebook" },
  instagram: { icon: "📸", color: "#E4405F", label: "Instagram" },
  tiktok:    { icon: "🎵", color: "#000000", label: "TikTok" },
  google:    { icon: "🔍", color: "#4285F4", label: "Google" },
  youtube:   { icon: "▶️", color: "#FF0000", label: "YouTube" },
  direct:    { icon: "🔗", color: "#9898B0", label: "Direct" },
  boutique:  { icon: "🏪", color: "#F59E0B", label: "Boutique" },
  autre:     { icon: "🌐", color: "#9898B0", label: "Autre" },
}

interface Props { tenantId: string }

export default function ClientsView({ tenantId }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [blacklisting, setBlacklisting] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientHistory, setClientHistory] = useState<Record<string, unknown>[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => { loadClients() }, [tenantId])

  const loadClients = async () => {
    setLoading(true)
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_name, phone, amount, status, created_at, source, is_blacklisted")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (!orders) { setLoading(false); return }

    // Grouper par téléphone
    const clientMap: Record<string, Client> = {}
    orders.forEach(o => {
      const key = o.phone || o.customer_name
      if (!clientMap[key]) {
        clientMap[key] = {
          phone: o.phone || "",
          customer_name: o.customer_name,
          order_count: 0,
          total_spent: 0,
          last_order: o.created_at,
          is_blacklisted: o.is_blacklisted || false,
          source: o.source || "direct",
        }
      }
      clientMap[key].order_count++
      if (o.status === "Livré" || o.status === "Livré+Payé") {
        clientMap[key].total_spent += Number(o.amount || 0)
      }
      if (o.created_at > clientMap[key].last_order) {
        clientMap[key].last_order = o.created_at
      }
    })

    setClients(Object.values(clientMap).sort((a, b) => b.order_count - a.order_count))
    setLoading(false)
  }

  const toggleBlacklist = async (client: Client) => {
    setBlacklisting(client.phone)
    await supabase
      .from("orders")
      .update({ is_blacklisted: !client.is_blacklisted })
      .eq("tenant_id", tenantId)
      .eq("phone", client.phone)
    await loadClients()
    setBlacklisting(null)
  }

  const callClient = (phone: string) => {
    window.open(`tel:${phone}`)
  }

  const whatsappClient = (phone: string, name: string) => {
    const msg = encodeURIComponent(`Bonjour ${name} ! 👋`)
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${msg}`)
  }

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA"

  const loadClientHistory = async (client: Client) => {
    setSelectedClient(client)
    setLoadingHistory(true)
    const { data } = await supabase
      .from("orders")
      .select("id, product, quantity, amount, status, city, created_at, source, delivery_type")
      .eq("tenant_id", tenantId)
      .eq("phone", client.phone)
      .order("created_at", { ascending: false })
    setClientHistory(data || [])
    setLoadingHistory(false)
  }

  const STATUS_COLORS: Record<string, string> = {
    "En attente": "#FB923C",
    "Confirmé": "#60A5FA",
    "Livré": "#4ADE80",
    "Livré+Payé": "#4ADE80",
    "Annulé": "#F87171",
    "Gare": "#C084FC",
  }

  const filtered = clients.filter(c => {
    const matchSearch = c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    const matchFilter =
      filter === "all" ? true :
      filter === "fidele" ? c.order_count >= 2 :
      filter === "blacklist" ? c.is_blacklisted :
      filter === "nouveau" ? c.order_count === 1 : true
    return matchSearch && matchFilter
  })

  const stats = {
    total: clients.length,
    fideles: clients.filter(c => c.order_count >= 2).length,
    blacklisted: clients.filter(c => c.is_blacklisted).length,
    sources: clients.reduce((acc, c) => {
      acc[c.source] = (acc[c.source] || 0) + 1
      return acc
    }, {} as Record<string, number>),
  }

  return (
    <div style={{ padding: "0 0 40px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: "0 0 4px 0" }}>Base clients</h2>
        <p style={{ color: S.text3, fontSize: 13, margin: 0 }}>{clients.length} clients uniques</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total clients", value: stats.total, color: S.info },
          { label: "Clients fidèles", value: stats.fideles, color: S.success },
          { label: "Blacklistés", value: stats.blacklisted, color: S.danger },
        ].map(s => (
          <div key={s.label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ color: s.color, fontSize: 22, fontWeight: 800, margin: "0 0 4px 0" }}>{s.value}</p>
            <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sources */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
        <p style={{ color: S.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 10px 0" }}>Sources des commandes</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          {Object.entries(stats.sources).sort((a, b) => b[1] - a[1]).map(([src, count]) => {
            const s2 = SOURCE_ICONS[src] || SOURCE_ICONS.autre
            return (
              <div key={src} style={{ display: "flex", alignItems: "center", gap: 6, background: S.card2, borderRadius: 20, padding: "4px 10px" }}>
                <span style={{ fontSize: 14 }}>{s2.icon}</span>
                <span style={{ color: S.text2, fontSize: 12 }}>{s2.label}</span>
                <span style={{ color: S.gold, fontSize: 12, fontWeight: 700 }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filtres + Search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher client..."
          style={{ flex: 1, minWidth: 200, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "9px 12px", color: S.text, fontSize: 13, outline: "none" }}
          onFocus={e => e.target.style.borderColor = S.gold}
          onBlur={e => e.target.style.borderColor = S.border} />
        {["all", "fidele", "nouveau", "blacklist"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: filter === f ? S.gold : S.card2,
              color: filter === f ? "#000" : S.text2 }}>
            {f === "all" ? "Tous" : f === "fidele" ? "⭐ Fidèles" : f === "nouveau" ? "🆕 Nouveaux" : "🚫 Blacklist"}
          </button>
        ))}
      </div>

      {/* Liste clients */}
      {loading ? (
        <p style={{ color: S.text3, textAlign: "center", padding: "40px 0" }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <p style={{ color: S.text3, fontSize: 14 }}>Aucun client trouvé.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(client => {
            const src = SOURCE_ICONS[client.source] || SOURCE_ICONS.autre
            const isFidele = client.order_count >= 2
            return (
              <div key={client.phone} style={{
                background: client.is_blacklisted ? "rgba(248,113,113,0.04)" : S.card,
                border: `1px solid ${client.is_blacklisted ? "rgba(248,113,113,0.2)" : S.border}`,
                borderRadius: 14, padding: "12px 14px",
                opacity: client.is_blacklisted ? 0.7 : 1,
              }} onClick={() => loadClientHistory(client)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: isFidele ? "rgba(245,158,11,0.15)" : S.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {client.is_blacklisted ? "🚫" : isFidele ? "⭐" : "👤"}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                      <h4 style={{ color: S.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{client.customer_name}</h4>
                      {isFidele && <span style={{ background: "rgba(245,158,11,0.1)", color: S.gold, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>CLIENT FIDÈLE</span>}
                      {client.is_blacklisted && <span style={{ background: S.dangerBg, color: S.danger, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>BLACKLISTÉ</span>}
                    </div>
                    <p style={{ color: S.text3, fontSize: 12, margin: "3px 0" }}>{client.phone}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" as const }}>
                      <span style={{ color: S.gold, fontSize: 12, fontWeight: 700 }}>{client.order_count} commande{client.order_count > 1 ? "s" : ""}</span>
                      <span style={{ color: S.success, fontSize: 12 }}>{fmt(client.total_spent)}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: S.text3 }}>
                        {src.icon} {src.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {client.phone && (
                      <>
                        <button onClick={() => callClient(client.phone)}
                          style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.text2, fontSize: 16, cursor: "pointer" }}>
                          📞
                        </button>
                        <button onClick={() => whatsappClient(client.phone, client.customer_name)}
                          style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "rgba(37,211,102,0.1)", color: "#25D366", fontSize: 16, cursor: "pointer" }}>
                          💬
                        </button>
                      </>
                    )}
                    <button onClick={() => toggleBlacklist(client)} disabled={blacklisting === client.phone}
                      style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: client.is_blacklisted ? "rgba(74,222,128,0.1)" : S.dangerBg, color: client.is_blacklisted ? S.success : S.danger, fontSize: 16, cursor: "pointer" }}>
                      {client.is_blacklisted ? "✅" : "🚫"}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
