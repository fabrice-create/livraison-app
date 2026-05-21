"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/app/lib/supabase"

const C = {
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  white: "#F8F8FC", muted: "#55556A", mutedLight: "#9898B0",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", info: "#60A5FA", warning: "#FB923C",
}

interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  country: string
  plan: string
  is_active: boolean
  trial_ends_at?: string
  created_at: string
  order_count?: number
  total_revenue?: number
}

interface GlobalStats {
  total_tenants: number
  active_tenants: number
  trial_tenants: number
  total_orders: number
  total_revenue: number
}

const PLAN_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  trial:      { bg: "rgba(96,165,250,0.1)",   color: "#60A5FA", label: "Trial" },
  starter:    { bg: "rgba(74,222,128,0.1)",   color: "#4ADE80", label: "Starter" },
  pro:        { bg: "rgba(245,158,11,0.1)",   color: "#F59E0B", label: "Pro" },
  business:   { bg: "rgba(192,132,252,0.1)",  color: "#C084FC", label: "Business" },
  enterprise: { bg: "rgba(248,113,113,0.1)",  color: "#F87171", label: "Enterprise" },
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [activeView, setActiveView] = useState<"dashboard" | "clients">("dashboard")

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace("/login"); return }

    const { data: sa } = await supabase
      .from("super_admins")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!sa) { router.replace("/admin"); return }

    loadData()
  }

  const loadData = async () => {
    setLoading(true)

    // Charger tous les tenants
    const { data: tenantsData } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false })

    // Pour chaque tenant, compter les commandes
    const tenantsWithStats = await Promise.all(
      (tenantsData || []).map(async (t) => {
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", t.id)

        const { data: revenue } = await supabase
          .from("orders")
          .select("amount")
          .eq("tenant_id", t.id)
          .eq("status", "Livré")

        const total_revenue = (revenue || []).reduce((s, o) => s + Number(o.amount || 0), 0)

        return { ...t, order_count: count || 0, total_revenue }
      })
    )

    setTenants(tenantsWithStats)

    // Stats globales
    const { count: totalOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })

    setStats({
      total_tenants: tenantsWithStats.length,
      active_tenants: tenantsWithStats.filter(t => t.is_active).length,
      trial_tenants: tenantsWithStats.filter(t => t.plan === "trial").length,
      total_orders: totalOrders || 0,
      total_revenue: tenantsWithStats.reduce((s, t) => s + (t.total_revenue || 0), 0),
    })

    setLoading(false)
  }

  const toggleTenant = async (tenant: Tenant) => {
    await supabase.from("tenants").update({ is_active: !tenant.is_active }).eq("id", tenant.id)
    loadData()
  }

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA"

  const filtered = tenants.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || t.plan === filter ||
      (filter === "active" && t.is_active) ||
      (filter === "inactive" && !t.is_active)
    return matchSearch && matchFilter
  })

  const isTrialExpired = (t: Tenant) => {
    if (!t.trial_ends_at) return false
    return new Date(t.trial_ends_at) < new Date()
  }

  const daysLeft = (t: Tenant) => {
    if (!t.trial_ends_at) return null
    const diff = new Date(t.trial_ends_at).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 20px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <rect x="2" y="2" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="2" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
                <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="19" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
              </svg>
            </div>
            <div>
              <p style={{ color: C.white, fontSize: 16, fontWeight: 800, margin: 0 }}>Shipivo</p>
              <p style={{ color: C.gold, fontSize: 11, margin: 0, fontWeight: 600 }}>⚡ Super Admin</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["dashboard", "clients"].map(v => (
              <button key={v} onClick={() => setActiveView(v as "dashboard" | "clients")}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: activeView === v ? C.gold : "transparent",
                  color: activeView === v ? "#000" : C.mutedLight }}>
                {v === "dashboard" ? "📊 Dashboard" : "👥 Clients"}
              </button>
            ))}
            <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}
              style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.mutedLight, fontSize: 13, cursor: "pointer" }}>
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 60px" }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ color: C.muted }}>Chargement...</p>
          </div>
        ) : (
          <>
            {/* DASHBOARD */}
            {activeView === "dashboard" && stats && (
              <>
                <h2 style={{ color: C.white, fontSize: 20, fontWeight: 700, margin: "0 0 20px 0" }}>Vue globale</h2>

                {/* Stats globales */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
                  {[
                    { label: "E-commerçants", value: stats.total_tenants, icon: "🏪", color: C.info },
                    { label: "Actifs", value: stats.active_tenants, icon: "✅", color: C.success },
                    { label: "En trial", value: stats.trial_tenants, icon: "⏳", color: C.warning },
                    { label: "Total commandes", value: stats.total_orders, icon: "📦", color: C.gold },
                    { label: "CA global livré", value: fmt(stats.total_revenue), icon: "💰", color: C.gold, big: true },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                      <p style={{ color: s.color, fontSize: s.big ? 18 : 28, fontWeight: 800, margin: "0 0 4px 0" }}>
                        {s.value}
                      </p>
                      <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Top 5 clients */}
                <h3 style={{ color: C.white, fontSize: 16, fontWeight: 700, margin: "0 0 14px 0" }}>🏆 Top clients</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...tenants].sort((a, b) => (b.order_count || 0) - (a.order_count || 0)).slice(0, 5).map((t, i) => (
                    <div key={t.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ color: C.gold, fontSize: 16, fontWeight: 800, width: 24 }}>#{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: C.white, fontSize: 14, fontWeight: 700, margin: 0 }}>{t.name}</p>
                        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{t.email}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ color: C.gold, fontSize: 14, fontWeight: 700, margin: 0 }}>{t.order_count} commandes</p>
                        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{fmt(t.total_revenue || 0)}</p>
                      </div>
                      <div style={{ background: PLAN_COLORS[t.plan]?.bg, color: PLAN_COLORS[t.plan]?.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {PLAN_COLORS[t.plan]?.label}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* CLIENTS */}
            {activeView === "clients" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                  <h2 style={{ color: C.white, fontSize: 20, fontWeight: 700, margin: 0 }}>
                    Tous les clients <span style={{ color: C.muted, fontSize: 14, fontWeight: 400 }}>({filtered.length})</span>
                  </h2>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.white, fontSize: 13, outline: "none", width: 200 }}
                      onFocus={e => e.target.style.borderColor = C.gold}
                      onBlur={e => e.target.style.borderColor = C.border} />
                    <select value={filter} onChange={e => setFilter(e.target.value)}
                      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.white, fontSize: 13, outline: "none", cursor: "pointer" }}>
                      <option value="all">Tous</option>
                      <option value="trial">Trial</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="business">Business</option>
                      <option value="active">Actifs</option>
                      <option value="inactive">Désactivés</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filtered.map(t => {
                    const days = daysLeft(t)
                    const expired = isTrialExpired(t)
                    const plan = PLAN_COLORS[t.plan] || PLAN_COLORS.trial

                    return (
                      <div key={t.id} style={{ background: C.card, border: `1px solid ${t.is_active ? C.border : "#2D1500"}`, borderRadius: 14, padding: "14px 16px", opacity: t.is_active ? 1 : 0.7 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>

                          {/* Infos boutique */}
                          <div style={{ flex: 2, minWidth: 200 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <h4 style={{ color: C.white, fontSize: 15, fontWeight: 700, margin: 0 }}>{t.name}</h4>
                              <span style={{ background: plan.bg, color: plan.color, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                                {plan.label}
                              </span>
                              {!t.is_active && <span style={{ background: C.dangerBg, color: C.danger, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Désactivé</span>}
                            </div>
                            <p style={{ color: C.muted, fontSize: 12, margin: "0 0 2px 0" }}>{t.email}</p>
                            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
                              🌍 {t.country} · 🔗 shipivo.app/commander/{t.slug}
                            </p>
                          </div>

                          {/* Stats */}
                          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ textAlign: "center" }}>
                              <p style={{ color: C.gold, fontSize: 18, fontWeight: 800, margin: 0 }}>{t.order_count}</p>
                              <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>commandes</p>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <p style={{ color: C.success, fontSize: 14, fontWeight: 700, margin: 0 }}>{fmt(t.total_revenue || 0)}</p>
                              <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>CA livré</p>
                            </div>
                            {t.plan === "trial" && days !== null && (
                              <div style={{ textAlign: "center" }}>
                                <p style={{ color: expired ? C.danger : C.warning, fontSize: 14, fontWeight: 700, margin: 0 }}>
                                  {expired ? "Expiré" : `J-${days}`}
                                </p>
                                <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>trial</p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button onClick={() => toggleTenant(t)} style={{
                              fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                              background: t.is_active ? C.dangerBg : "rgba(74,222,128,0.1)",
                              color: t.is_active ? C.danger : C.success, fontWeight: 600,
                            }}>
                              {t.is_active ? "⏸ Désactiver" : "▶ Activer"}
                            </button>
                          </div>
                        </div>

                        {/* Date inscription */}
                        <p style={{ color: C.muted, fontSize: 11, margin: "10px 0 0 0" }}>
                          Inscrit le {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    )
                  })}

                  {filtered.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 20px" }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                      <p style={{ color: C.muted }}>Aucun client trouvé.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
