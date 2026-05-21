"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"

const S = {
  gold: "#F59E0B", goldDark: "#D97706",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", info: "#60A5FA",
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

interface Order {
  id: string
  product: string
  quantity: number
  amount: number
  status: string
  city: string
  created_at: string
}

const SOURCE_ICONS: Record<string, { icon: string; label: string }> = {
  whatsapp:  { icon: "💬", label: "WhatsApp" },
  facebook:  { icon: "📘", label: "Facebook" },
  instagram: { icon: "📸", label: "Instagram" },
  tiktok:    { icon: "🎵", label: "TikTok" },
  google:    { icon: "🔍", label: "Google" },
  direct:    { icon: "🔗", label: "Direct" },
  boutique:  { icon: "🏪", label: "Boutique" },
  import:    { icon: "📥", label: "Import" },
  autre:     { icon: "🌐", label: "Autre" },
}

const STATUS_COLORS: Record<string, string> = {
  "En attente": "#FB923C",
  "Confirmé": "#60A5FA",
  "Livré": "#4ADE80",
  "Livré+Payé": "#4ADE80",
  "Annulé": "#F87171",
  "Gare": "#C084FC",
}

export default function ClientsView({ tenantId }: { tenantId: string }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [history, setHistory] = useState<Order[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA"

  useEffect(() => { loadClients() }, [tenantId])

  const loadClients = async () => {
    setLoading(true)
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_name, phone, amount, status, created_at, source, is_blacklisted")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (!orders) { setLoading(false); return }

    const map: Record<string, Client> = {}
    orders.forEach(o => {
      const key = o.phone || o.customer_name
      if (!map[key]) {
        map[key] = {
          phone: o.phone || "",
          customer_name: o.customer_name,
          order_count: 0,
          total_spent: 0,
          last_order: o.created_at,
          is_blacklisted: o.is_blacklisted || false,
          source: o.source || "direct",
        }
      }
      map[key].order_count++
      if (["Livré", "Livré+Payé"].includes(o.status)) {
        map[key].total_spent += Number(o.amount || 0)
      }
    })

    setClients(Object.values(map).sort((a, b) => b.order_count - a.order_count))
    setLoading(false)
  }

  const openHistory = async (client: Client) => {
    setSelectedClient(client)
    setLoadingHistory(true)
    const { data } = await supabase
      .from("orders")
      .select("id, product, quantity, amount, status, city, created_at")
      .eq("tenant_id", tenantId)
      .eq("phone", client.phone)
      .order("created_at", { ascending: false })
    setHistory((data || []) as Order[])
    setLoadingHistory(false)
  }

  const closeHistory = () => {
    setSelectedClient(null)
    setHistory([])
  }

  const toggleBlacklist = async (e: React.MouseEvent, client: Client) => {
    e.stopPropagation()
    await supabase
      .from("orders")
      .update({ is_blacklisted: !client.is_blacklisted })
      .eq("tenant_id", tenantId)
      .eq("phone", client.phone)
    loadClients()
  }

  const filtered = clients.filter(c => {
    const matchSearch = c.customer_name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
    const matchFilter = filter === "all" ? true :
      filter === "fidele" ? c.order_count >= 2 :
      filter === "blacklist" ? c.is_blacklisted :
      filter === "nouveau" ? c.order_count === 1 : true
    return matchSearch && matchFilter
  })

  const stats = {
    total: clients.length,
    fideles: clients.filter(c => c.order_count >= 2).length,
    blacklisted: clients.filter(c => c.is_blacklisted).length,
    sources: clients.reduce((acc, c) => { acc[c.source] = (acc[c.source] || 0) + 1; return acc }, {} as Record<string, number>),
  }

  return (
    <div style={{ padding: "0 0 60px 0", fontFamily: "Inter, sans-serif" }}>

      {/* Modal historique */}
      {selectedClient && (
        <>
          <div onClick={closeHistory} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(480px, 95vw)", maxHeight: "80vh",
            background: S.card, border: `1px solid ${S.border}`,
            borderRadius: 20, overflow: "hidden", zIndex: 1001,
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ color: S.text, fontSize: 16, fontWeight: 700, margin: "0 0 4px 0" }}>{selectedClient.customer_name}</h3>
                <p style={{ color: S.text3, fontSize: 12, margin: 0 }}>
                  {selectedClient.phone} · {selectedClient.order_count} commande{selectedClient.order_count > 1 ? "s" : ""} · {fmt(selectedClient.total_spent)}
                </p>
              </div>
              <button onClick={closeHistory} style={{ background: "none", border: "none", color: S.text2, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {loadingHistory ? (
                <p style={{ color: S.text3, textAlign: "center", padding: "40px 0" }}>Chargement...</p>
              ) : history.length === 0 ? (
                <p style={{ color: S.text3, textAlign: "center", padding: "40px 0" }}>Aucune commande.</p>
              ) : history.map(o => (
                <div key={o.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: "0 0 4px 0" }}>{o.product}</p>
                    <p style={{ color: S.text3, fontSize: 12, margin: 0 }}>
                      {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      {o.city ? ` · ${o.city}` : ""}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: S.gold, fontSize: 14, fontWeight: 800, margin: "0 0 4px 0" }}>{fmt(Number(o.amount))}</p>
                    <span style={{ background: `${STATUS_COLORS[o.status] || S.text3}25`, color: STATUS_COLORS[o.status] || S.text3, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: "12px 20px", borderTop: `1px solid ${S.border}`, display: "flex", gap: 10 }}>
              <a href={`tel:${selectedClient.phone}`} style={{ flex: 1, background: S.card2, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px", color: S.text2, fontSize: 13, textDecoration: "none", textAlign: "center", fontWeight: 600 }}>
                📞 Appeler
              </a>
              <a href={`https://wa.me/${selectedClient.phone.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Bonjour ${selectedClient.customer_name} !`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, background: "rgba(37,211,102,0.1)", border: "none", borderRadius: 8, padding: "10px", color: "#25D366", fontSize: 13, textDecoration: "none", textAlign: "center", fontWeight: 700 }}>
                💬 WhatsApp
              </a>
            </div>
          </div>
        </>
      )}

      <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: "0 0 4px 0" }}>Base clients</h2>
      <p style={{ color: S.text3, fontSize: 13, margin: "0 0 20px 0" }}>{clients.length} clients uniques · Clique sur un client pour voir son historique</p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total", value: stats.total, color: S.info },
          { label: "Fidèles", value: stats.fideles, color: S.gold },
          { label: "Blacklistés", value: stats.blacklisted, color: S.danger },
        ].map(s => (
          <div key={s.label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ color: s.color, fontSize: 22, fontWeight: 800, margin: "0 0 2px 0" }}>{s.value}</p>
            <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sources */}
      {Object.keys(stats.sources).length > 0 && (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
          <p style={{ color: S.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 10px 0" }}>Sources</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            {Object.entries(stats.sources).sort((a,b) => b[1]-a[1]).map(([src, count]) => {
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
      )}

      {/* Filtres */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher client..."
          style={{ flex: 1, minWidth: 180, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "9px 12px", color: S.text, fontSize: 13, outline: "none" }}
          onFocus={e => e.target.style.borderColor = S.gold}
          onBlur={e => e.target.style.borderColor = S.border} />
        {[["all","Tous"],["fidele","⭐ Fidèles"],["nouveau","🆕 Nouveaux"],["blacklist","🚫 Blacklist"]].map(([f,l]) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: filter === f ? S.gold : S.card2, color: filter === f ? "#000" : S.text2 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <p style={{ color: S.text3, textAlign: "center", padding: "40px 0" }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <p style={{ color: S.text3 }}>Aucun client trouvé.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(client => {
            const isFidele = client.order_count >= 2
            const src = SOURCE_ICONS[client.source] || SOURCE_ICONS.autre
            return (
              <div key={client.phone}
                onClick={() => openHistory(client)}
                style={{
                  background: client.is_blacklisted ? "rgba(248,113,113,0.04)" : S.card,
                  border: `1px solid ${client.is_blacklisted ? "rgba(248,113,113,0.3)" : S.border}`,
                  borderRadius: 14, padding: "12px 14px",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = S.gold)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = client.is_blacklisted ? "rgba(248,113,113,0.3)" : S.border)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: isFidele ? "rgba(245,158,11,0.15)" : S.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {client.is_blacklisted ? "🚫" : isFidele ? "⭐" : "👤"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
                      <span style={{ color: S.text, fontSize: 14, fontWeight: 700 }}>{client.customer_name}</span>
                      {isFidele && <span style={{ background: "rgba(245,158,11,0.1)", color: S.gold, padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>FIDÈLE</span>}
                      {client.is_blacklisted && <span style={{ background: S.dangerBg, color: S.danger, padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>BLACKLISTÉ</span>}
                    </div>
                    <p style={{ color: S.text3, fontSize: 12, margin: "2px 0" }}>{client.phone}</p>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: S.gold, fontSize: 12, fontWeight: 700 }}>{client.order_count} cmd</span>
                      <span style={{ color: S.success, fontSize: 12 }}>{fmt(client.total_spent)}</span>
                      <span style={{ color: S.text3, fontSize: 12 }}>{src.icon} {src.label}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <a href={`tel:${client.phone}`} onClick={e => e.stopPropagation()}
                      style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.text2, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                      📞
                    </a>
                    <a href={`https://wa.me/${client.phone.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Bonjour ${client.customer_name} !`)}`}
                      target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "rgba(37,211,102,0.1)", color: "#25D366", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                      💬
                    </a>
                    <button onClick={e => toggleBlacklist(e, client)}
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
