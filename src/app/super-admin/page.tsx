"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/app/lib/supabase"
import { getUserProfile } from "@/lib/auth"

const S = {
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", successBg: "rgba(74,222,128,0.06)",
  info: "#60A5FA", warning: "#FB923C",
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
  member_count?: number
}

const PLAN_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  trial:      { bg: "rgba(96,165,250,0.1)",   color: S.info,    label: "Trial" },
  starter:    { bg: "rgba(74,222,128,0.1)",   color: S.success, label: "Starter" },
  pro:        { bg: "rgba(245,158,11,0.1)",   color: S.gold,    label: "Pro" },
  business:   { bg: "rgba(192,132,252,0.1)", color: "#C084FC", label: "Business" },
  enterprise: { bg: "rgba(248,113,113,0.1)", color: S.danger,  label: "Enterprise" },
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "trial" | "active" | "inactive">("all")
  const [stats, setStats] = useState({ total: 0, trial: 0, active: 0, revenue: 0 })
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace("/login"); return }
    const profile = await getUserProfile(user.id)
    if (profile?.role !== "super_admin") { router.replace("/admin"); return }
    loadData()
  }

  const loadData = async () => {
    setLoading(true)

    // Charger tous les tenants
    const { data: tenantsData } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false })

    if (!tenantsData) { setLoading(false); return }

    // Pour chaque tenant, charger stats
    const enriched = await Promise.all(tenantsData.map(async (t) => {
      const [ordersRes, membersRes] = await Promise.all([
        supabase.from("orders").select("amount").eq("tenant_id", t.id),
        supabase.from("profiles").select("id").eq("tenant_id", t.id),
      ])
      const orders = ordersRes.data || []
      const revenue = orders.reduce((s, o) => s + Number(o.amount || 0), 0)
      return {
        ...t,
        order_count: orders.length,
        total_revenue: revenue,
        member_count: (membersRes.data || []).length,
      }
    }))

    setTenants(enriched)
    setStats({
      total: enriched.length,
      trial: enriched.filter(t => t.plan === "trial").length,
      active: enriched.filter(t => t.is_active && t.plan !== "trial").length,
      revenue: enriched.reduce((s, t) => s + (t.total_revenue || 0), 0),
    })
    setLoading(false)
  }

  const toggleActive = async (tenant: Tenant) => {
    await supabase.from("tenants").update({ is_active: !tenant.is_active }).eq("id", tenant.id)
    loadData()
  }

  const changePlan = async (tenantId: string, plan: string) => {
    await supabase.from("tenants").update({ plan }).eq("id", tenantId)
    loadData()
    setSelectedTenant(null)
  }

  const filtered = tenants.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" ? true :
      filter === "trial" ? t.plan === "trial" :
      filter === "active" ? t.is_active && t.plan !== "trial" :
      !t.is_active
    return matchSearch && matchFilter
  })

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA"
  const daysLeft = (date?: string) => {
    if (!date) return 0
    const diff = new Date(date).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ background: S.card, borderBottom: `1px solid ${S.border}`, padding: "14px 20px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: S.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <rect x="2" y="2" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="2" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
                <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="19" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
              </svg>
            </div>
            <div>
              <div style={{ color: S.text, fontSize: 16, fontWeight: 800 }}>Shipivo</div>
              <div style={{ color: S.gold, fontSize: 11, fontWeight: 600 }}>Super Admin</div>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}
            style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 12px", color: S.text2, fontSize: 12, cursor: "pointer" }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {/* Stats globales */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "E-commerçants", value: stats.total, icon: "🏪", color: S.info },
            { label: "En trial", value: stats.trial, icon: "⏳", color: S.warning },
            { label: "Abonnés actifs", value: stats.active, icon: "✅", color: S.success },
            { label: "CA total plateforme", value: fmt(stats.revenue), icon: "💰", color: S.gold },
          ].map(s => (
            <div key={s.label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{s.value}</div>
              <div style={{ color: S.text3, fontSize: 12 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtres et recherche */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" as const }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            style={{ flex: 1, minWidth: 200, background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 14px", color: S.text, fontSize: 13, outline: "none" }}
            onFocus={e => e.target.style.borderColor = S.gold}
            onBlur={e => e.target.style.borderColor = S.border}
          />
          <div style={{ display: "flex", gap: 6 }}>
            {(["all", "trial", "active", "inactive"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "10px 14px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: filter === f ? S.gold : S.card,
                color: filter === f ? "#000" : S.text2,
              }}>
                {f === "all" ? "Tous" : f === "trial" ? "Trial" : f === "active" ? "Actifs" : "Désactivés"}
              </button>
            ))}
          </div>
        </div>

        {/* Liste tenants */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: S.text3 }}>Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
            <p style={{ color: S.text3 }}>Aucun e-commerçant trouvé</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(tenant => {
              const plan = PLAN_COLORS[tenant.plan] || PLAN_COLORS.trial
              const days = daysLeft(tenant.trial_ends_at)
              return (
                <div key={tenant.id} style={{
                  background: S.card, border: `1px solid ${tenant.is_active ? S.border : "#2D1500"}`,
                  borderRadius: 16, padding: 16, opacity: tenant.is_active ? 1 : 0.7,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" as const }}>

                    {/* Infos principales */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <h3 style={{ color: S.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{tenant.name}</h3>
                        <span style={{ background: plan.bg, color: plan.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                          {plan.label}
                        </span>
                        {!tenant.is_active && (
                          <span style={{ background: S.dangerBg, color: S.danger, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                            DÉSACTIVÉ
                          </span>
                        )}
                      </div>
                      <p style={{ color: S.text3, fontSize: 12, margin: "0 0 4px 0" }}>📧 {tenant.email}</p>
                      {tenant.phone && <p style={{ color: S.text3, fontSize: 12, margin: "0 0 4px 0" }}>📱 {tenant.phone}</p>}
                      <p style={{ color: S.text3, fontSize: 12, margin: 0 }}>
                        🌍 {tenant.country} · 🔗 shipivo.app/commander/{tenant.slug}
                      </p>
                      {tenant.plan === "trial" && tenant.trial_ends_at && (
                        <p style={{ color: days <= 3 ? S.danger : S.warning, fontSize: 12, margin: "6px 0 0 0", fontWeight: 600 }}>
                          ⏳ Trial : {days} jour{days > 1 ? "s" : ""} restant{days > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                      {[
                        { label: "Commandes", value: tenant.order_count || 0 },
                        { label: "Membres", value: tenant.member_count || 0 },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: "center" as const }}>
                          <div style={{ color: S.text, fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                          <div style={{ color: S.text3, fontSize: 11 }}>{s.label}</div>
                        </div>
                      ))}
                      <div style={{ textAlign: "center" as const }}>
                        <div style={{ color: S.gold, fontSize: 16, fontWeight: 800 }}>
                          {(tenant.total_revenue || 0) > 0 ? fmt(tenant.total_revenue || 0) : "—"}
                        </div>
                        <div style={{ color: S.text3, fontSize: 11 }}>CA total</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                      <button onClick={() => setSelectedTenant(tenant)}
                        style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.text2, cursor: "pointer" }}>
                        ✏️ Plan
                      </button>
                      <button onClick={() => toggleActive(tenant)}
                        style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: "none", background: tenant.is_active ? S.dangerBg : S.successBg, color: tenant.is_active ? S.danger : S.success, cursor: "pointer" }}>
                        {tenant.is_active ? "⏸ Désactiver" : "▶ Activer"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal changement plan */}
      {selectedTenant && (
        <>
          <div onClick={() => setSelectedTenant(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 998 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: S.card, border: `1px solid ${S.border}`, borderRadius: 20,
            padding: 24, width: 340, zIndex: 999,
          }}>
            <h3 style={{ color: S.text, fontSize: 16, fontWeight: 700, margin: "0 0 6px 0" }}>
              Changer le plan
            </h3>
            <p style={{ color: S.text3, fontSize: 13, margin: "0 0 20px 0" }}>{selectedTenant.name}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(PLAN_COLORS).map(([plan, style]) => (
                <button key={plan} onClick={() => changePlan(selectedTenant.id, plan)} style={{
                  padding: "12px 16px", borderRadius: 10, border: `2px solid ${selectedTenant.plan === plan ? style.color : S.border}`,
                  background: selectedTenant.plan === plan ? style.bg : "transparent",
                  color: style.color, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" as const,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span>{style.label}</span>
                  {selectedTenant.plan === plan && <span>✓ Actuel</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setSelectedTenant(null)} style={{ width: "100%", marginTop: 16, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px", color: S.text2, fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  )
}
