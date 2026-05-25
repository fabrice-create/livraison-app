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
  purple: "#C084FC",
}

const PLANS = [
  { id: "trial",      label: "Trial",      price: 0,      color: C.info,    bg: "rgba(96,165,250,0.1)"  },
  { id: "starter",    label: "Starter",    price: 15000,  color: C.success, bg: "rgba(74,222,128,0.1)"  },
  { id: "pro",        label: "Pro",        price: 30000,  color: C.gold,    bg: "rgba(245,158,11,0.1)"  },
  { id: "business",   label: "Business",   price: 60000,  color: C.purple,  bg: "rgba(192,132,252,0.1)" },
  { id: "enterprise", label: "Enterprise", price: 120000, color: C.danger,  bg: "rgba(248,113,113,0.1)" },
]

interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  country: string
  plan: string
  is_active: boolean
  subscription_status?: string
  trial_ends_at?: string
  plan_expires_at?: string
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
  mrr: number
}

interface Subscription {
  id: string
  tenant_id: string
  plan: string
  status: string
  started_at: string
  expires_at: string
  amount: number
  currency: string
  payment_method: string
  payment_ref?: string
  note?: string
  created_at: string
  tenants?: { name: string }
}

interface Payment {
  id: string
  tenant_id: string
  amount: number
  currency: string
  method: string
  status: string
  reference?: string
  paid_at?: string
  created_at: string
  tenants?: { name: string }
}

// Modal changement de plan
function ChangePlanModal({
  tenant, onClose, onSaved,
}: {
  tenant: Tenant
  onClose: () => void
  onSaved: () => void
}) {
  const [plan, setPlan] = useState(tenant.plan)
  const [months, setMonths] = useState(1)
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const p = PLANS.find(p => p.id === plan)
    setAmount((p?.price || 0) * months)
  }, [plan, months])

  const handleSave = async () => {
    setSaving(true); setError("")
    try {
      const startedAt = new Date()
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + months)

      const { data: { user } } = await supabase.auth.getUser()

      // Créer subscription
      const { error: subErr } = await supabase.from("subscriptions").insert({
        tenant_id: tenant.id,
        plan,
        status: "active",
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        amount,
        currency: "FCFA",
        payment_method: "manual",
        note: note || null,
        created_by: user?.id || null,
      })
      if (subErr) throw new Error(subErr.message)

      // Créer payment (manuel = success direct)
      if (amount > 0) {
        await supabase.from("payments").insert({
          tenant_id: tenant.id,
          amount,
          currency: "FCFA",
          method: "manual",
          status: "success",
          paid_at: new Date().toISOString(),
          note: note || null,
          reference: `MANUAL-${tenant.id.slice(0,8)}-${Date.now()}`,
        })
      }

      // Mettre à jour tenant
      const { error: tErr } = await supabase.from("tenants").update({
        plan,
        subscription_status: "active",
        plan_expires_at: expiresAt.toISOString(),
      }).eq("id", tenant.id)
      if (tErr) throw new Error(tErr.message)

      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue")
    }
    setSaving(false)
  }

  const inp: React.CSSProperties = {
    width: "100%", background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "10px 12px", color: C.white, fontSize: 13,
    outline: "none", boxSizing: "border-box",
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ color: C.white, fontSize: 16, fontWeight: 700, margin: 0 }}>Changer le plan</h3>
            <p style={{ color: C.mutedLight, fontSize: 12, margin: "4px 0 0 0" }}>{tenant.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {error && (
          <div style={{ background: C.dangerBg, border: `1px solid rgba(248,113,113,0.2)`, borderRadius: 8, padding: "10px 12px", marginBottom: 16, color: C.danger, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Sélection plan */}
        <p style={{ color: C.mutedLight, fontSize: 12, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Plan</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {PLANS.map(p => (
            <button key={p.id} onClick={() => setPlan(p.id)} style={{
              padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left",
              border: `1px solid ${plan === p.id ? p.color : C.border}`,
              background: plan === p.id ? p.bg : "transparent",
              transition: "all 0.15s",
            }}>
              <p style={{ color: p.color, fontSize: 13, fontWeight: 700, margin: "0 0 2px 0" }}>{p.label}</p>
              <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>
                {p.price === 0 ? "Gratuit" : `${p.price.toLocaleString("fr-FR")} FCFA/mois`}
              </p>
            </button>
          ))}
        </div>

        {/* Durée */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ color: C.mutedLight, fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Durée</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[1,3,6,12].map(m => (
              <button key={m} onClick={() => setMonths(m)} style={{
                flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                border: `1px solid ${months === m ? C.gold : C.border}`,
                background: months === m ? "rgba(245,158,11,0.1)" : "transparent",
                color: months === m ? C.gold : C.mutedLight,
              }}>
                {m === 1 ? "1 mois" : m === 12 ? "1 an" : `${m} mois`}
              </button>
            ))}
          </div>
        </div>

        {/* Montant */}
        <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: C.mutedLight, fontSize: 13 }}>Montant total</span>
            <span style={{ color: C.gold, fontSize: 20, fontWeight: 800 }}>
              {amount === 0 ? "Gratuit" : `${amount.toLocaleString("fr-FR")} FCFA`}
            </span>
          </div>
          <p style={{ color: C.muted, fontSize: 11, margin: "6px 0 0 0" }}>
            Expire le {(() => { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) })()}
          </p>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: C.mutedLight, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Note interne (optionnel)</p>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: paiement reçu par Wave le 25/05" style={inp} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.mutedLight, fontSize: 14, cursor: "pointer" }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: "12px", borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer",
            background: saving ? C.goldDim : `linear-gradient(135deg,${C.gold},${C.goldDark})`,
            color: "#000", fontSize: 14, fontWeight: 700,
          }}>
            {saving ? "Enregistrement..." : "✅ Confirmer le plan"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [activeView, setActiveView] = useState<"dashboard" | "clients" | "monetisation">("dashboard")
  const [changePlanTenant, setChangePlanTenant] = useState<Tenant | null>(null)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace("/login"); return }
    const { data: sa } = await supabase.from("super_admins").select("id").eq("user_id", user.id).single()
    if (!sa) { router.replace("/admin"); return }
    loadData()
  }

  const loadData = async () => {
    setLoading(true)

    const { data: tenantsData } = await supabase.from("tenants").select("*").order("created_at", { ascending: false })

    const tenantsWithStats = await Promise.all(
      (tenantsData || []).map(async (t) => {
        const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("tenant_id", t.id)
        const { data: revenue } = await supabase.from("orders").select("amount").eq("tenant_id", t.id).eq("status", "Livré")
        const total_revenue = (revenue || []).reduce((s, o) => s + Number(o.amount || 0), 0)
        return { ...t, order_count: count || 0, total_revenue }
      })
    )

    setTenants(tenantsWithStats)

    // Subscriptions récentes
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("*, tenants(name)")
      .order("created_at", { ascending: false })
      .limit(50)
    setSubscriptions(subs || [])

    // Payments récents
    const { data: pays } = await supabase
      .from("payments")
      .select("*, tenants(name)")
      .order("created_at", { ascending: false })
      .limit(50)
    setPayments(pays || [])

    const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true })

    // MRR = somme des plans actifs
    const mrr = tenantsWithStats
      .filter(t => t.plan !== "trial" && t.subscription_status === "active")
      .reduce((sum, t) => {
        const p = PLANS.find(pl => pl.id === t.plan)
        return sum + (p?.price || 0)
      }, 0)

    setStats({
      total_tenants: tenantsWithStats.length,
      active_tenants: tenantsWithStats.filter(t => t.is_active).length,
      trial_tenants: tenantsWithStats.filter(t => t.plan === "trial").length,
      total_orders: totalOrders || 0,
      total_revenue: tenantsWithStats.reduce((s, t) => s + (t.total_revenue || 0), 0),
      mrr,
    })

    setLoading(false)
  }

  const toggleTenant = async (tenant: Tenant) => {
    await supabase.from("tenants").update({ is_active: !tenant.is_active }).eq("id", tenant.id)
    loadData()
  }

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA"
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })

  const isExpired = (t: Tenant) => {
    const expiry = t.plan_expires_at || t.trial_ends_at
    if (!expiry) return false
    return new Date(expiry) < new Date()
  }

  const daysLeft = (t: Tenant) => {
    const expiry = t.plan_expires_at || t.trial_ends_at
    if (!expiry) return null
    const diff = new Date(expiry).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const filtered = tenants.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || t.plan === filter || (filter === "active" && t.is_active) || (filter === "inactive" && !t.is_active)
    return matchSearch && matchFilter
  })

  const planBadge = (planId: string) => {
    const p = PLANS.find(pl => pl.id === planId) || PLANS[0]
    return (
      <span style={{ background: p.bg, color: p.color, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
        {p.label}
      </span>
    )
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      active:    { bg: "rgba(74,222,128,0.1)",  color: C.success },
      pending:   { bg: "rgba(251,146,60,0.1)",  color: C.warning },
      success:   { bg: "rgba(74,222,128,0.1)",  color: C.success },
      failed:    { bg: C.dangerBg,               color: C.danger  },
      expired:   { bg: C.dangerBg,               color: C.danger  },
      cancelled: { bg: "rgba(85,85,106,0.15)",   color: C.muted   },
      refunded:  { bg: "rgba(96,165,250,0.1)",   color: C.info    },
    }
    const s = map[status] || map.pending
    return (
      <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
        {status}
      </span>
    )
  }

  const VIEWS = [
    { id: "dashboard",    label: "📊 Dashboard" },
    { id: "clients",      label: "👥 Clients" },
    { id: "monetisation", label: "💰 Monétisation" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, sans-serif" }}>

      {/* Modal changement plan */}
      {changePlanTenant && (
        <ChangePlanModal
          tenant={changePlanTenant}
          onClose={() => setChangePlanTenant(null)}
          onSaved={loadData}
        />
      )}

      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 20px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setActiveView(v.id as typeof activeView)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: activeView === v.id ? C.gold : "transparent",
                  color: activeView === v.id ? "#000" : C.mutedLight }}>
                {v.label}
              </button>
            ))}
            <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}
              style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.mutedLight, fontSize: 13, cursor: "pointer" }}>
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ color: C.muted }}>Chargement...</p>
          </div>
        ) : (
          <>
            {/* ── DASHBOARD ─────────────────────────────── */}
            {activeView === "dashboard" && stats && (
              <>
                <h2 style={{ color: C.white, fontSize: 20, fontWeight: 700, margin: "0 0 20px 0" }}>Vue globale</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
                  {[
                    { label: "E-commerçants", value: stats.total_tenants,                        icon: "🏪", color: C.info    },
                    { label: "Actifs",         value: stats.active_tenants,                      icon: "✅", color: C.success },
                    { label: "En trial",       value: stats.trial_tenants,                       icon: "⏳", color: C.warning },
                    { label: "Commandes",      value: stats.total_orders,                        icon: "📦", color: C.gold   },
                    { label: "CA livré",        value: fmt(stats.total_revenue),                  icon: "💰", color: C.gold, big: true },
                    { label: "MRR",            value: stats.mrr === 0 ? "—" : fmt(stats.mrr),   icon: "📈", color: C.success, big: true },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
                      <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                      <p style={{ color: s.color, fontSize: s.big ? 16 : 26, fontWeight: 800, margin: "0 0 4px 0" }}>{s.value}</p>
                      <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
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
                        <p style={{ color: C.gold, fontSize: 14, fontWeight: 700, margin: 0 }}>{t.order_count} cmd</p>
                        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{fmt(t.total_revenue || 0)}</p>
                      </div>
                      {planBadge(t.plan)}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── CLIENTS ───────────────────────────────── */}
            {activeView === "clients" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                  <h2 style={{ color: C.white, fontSize: 20, fontWeight: 700, margin: 0 }}>
                    Clients <span style={{ color: C.muted, fontSize: 14, fontWeight: 400 }}>({filtered.length})</span>
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
                      <option value="enterprise">Enterprise</option>
                      <option value="active">Actifs</option>
                      <option value="inactive">Désactivés</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filtered.map(t => {
                    const days = daysLeft(t)
                    const expired = isExpired(t)
                    return (
                      <div key={t.id} style={{ background: C.card, border: `1px solid ${t.is_active ? C.border : "#2D1500"}`, borderRadius: 14, padding: "14px 16px", opacity: t.is_active ? 1 : 0.7 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                          <div style={{ flex: 2, minWidth: 200 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <h4 style={{ color: C.white, fontSize: 15, fontWeight: 700, margin: 0 }}>{t.name}</h4>
                              {planBadge(t.plan)}
                              {!t.is_active && <span style={{ background: C.dangerBg, color: C.danger, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Désactivé</span>}
                            </div>
                            <p style={{ color: C.muted, fontSize: 12, margin: "0 0 2px 0" }}>{t.email}</p>
                            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>🌍 {t.country} · 🔗 /{t.slug}</p>
                          </div>
                          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ textAlign: "center" }}>
                              <p style={{ color: C.gold, fontSize: 18, fontWeight: 800, margin: 0 }}>{t.order_count}</p>
                              <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>commandes</p>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <p style={{ color: C.success, fontSize: 13, fontWeight: 700, margin: 0 }}>{fmt(t.total_revenue || 0)}</p>
                              <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>CA livré</p>
                            </div>
                            {days !== null && (
                              <div style={{ textAlign: "center" }}>
                                <p style={{ color: expired ? C.danger : days <= 7 ? C.warning : C.mutedLight, fontSize: 13, fontWeight: 700, margin: 0 }}>
                                  {expired ? "Expiré" : `J-${days}`}
                                </p>
                                <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>expiration</p>
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button onClick={() => setChangePlanTenant(t)} style={{
                              fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                              background: "rgba(245,158,11,0.1)", color: C.gold, fontWeight: 600,
                            }}>
                              ⚙️ Plan
                            </button>
                            <button onClick={() => toggleTenant(t)} style={{
                              fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                              background: t.is_active ? C.dangerBg : "rgba(74,222,128,0.1)",
                              color: t.is_active ? C.danger : C.success, fontWeight: 600,
                            }}>
                              {t.is_active ? "⏸ Désactiver" : "▶ Activer"}
                            </button>
                          </div>
                        </div>
                        <p style={{ color: C.muted, fontSize: 11, margin: "10px 0 0 0" }}>
                          Inscrit le {fmtDate(t.created_at)}
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

            {/* ── MONÉTISATION ──────────────────────────── */}
            {activeView === "monetisation" && (
              <>
                <h2 style={{ color: C.white, fontSize: 20, fontWeight: 700, margin: "0 0 20px 0" }}>💰 Monétisation</h2>

                {/* Plans pricing */}
                <h3 style={{ color: C.white, fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" }}>📋 Grille tarifaire</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
                  {PLANS.filter(p => p.id !== "trial").map(p => {
                    const count = tenants.filter(t => t.plan === p.id).length
                    return (
                      <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 14px" }}>
                        <p style={{ color: p.color, fontSize: 13, fontWeight: 700, margin: "0 0 4px 0" }}>{p.label}</p>
                        <p style={{ color: C.white, fontSize: 20, fontWeight: 800, margin: "0 0 4px 0" }}>
                          {p.price.toLocaleString("fr-FR")}
                          <span style={{ color: C.muted, fontSize: 11, fontWeight: 400 }}> FCFA/mois</span>
                        </p>
                        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{count} client{count > 1 ? "s" : ""}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Subscriptions récentes */}
                <h3 style={{ color: C.white, fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" }}>📄 Abonnements récents</h3>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 32 }}>
                  {subscriptions.length === 0 ? (
                    <p style={{ color: C.muted, textAlign: "center", padding: "30px 0", fontSize: 13 }}>Aucun abonnement enregistré.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                            {["Client","Plan","Méthode","Montant","Début","Expire","Statut"].map(h => (
                              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {subscriptions.map((s, i) => (
                            <tr key={s.id} style={{ borderBottom: i < subscriptions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                              <td style={{ padding: "10px 14px", color: C.white, fontSize: 13, fontWeight: 600 }}>{s.tenants?.name || "—"}</td>
                              <td style={{ padding: "10px 14px" }}>{planBadge(s.plan)}</td>
                              <td style={{ padding: "10px 14px", color: C.mutedLight, fontSize: 12 }}>{s.payment_method}</td>
                              <td style={{ padding: "10px 14px", color: s.amount === 0 ? C.muted : C.gold, fontSize: 13, fontWeight: 700 }}>
                                {s.amount === 0 ? "—" : `${s.amount.toLocaleString("fr-FR")} FCFA`}
                              </td>
                              <td style={{ padding: "10px 14px", color: C.mutedLight, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(s.started_at)}</td>
                              <td style={{ padding: "10px 14px", color: new Date(s.expires_at) < new Date() ? C.danger : C.mutedLight, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(s.expires_at)}</td>
                              <td style={{ padding: "10px 14px" }}>{statusBadge(s.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Payments récents */}
                <h3 style={{ color: C.white, fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" }}>💳 Paiements récents</h3>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                  {payments.length === 0 ? (
                    <p style={{ color: C.muted, textAlign: "center", padding: "30px 0", fontSize: 13 }}>Aucun paiement enregistré.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                            {["Client","Méthode","Montant","Référence","Date","Statut"].map(h => (
                              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p, i) => (
                            <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? `1px solid ${C.border}` : "none" }}>
                              <td style={{ padding: "10px 14px", color: C.white, fontSize: 13, fontWeight: 600 }}>{p.tenants?.name || "—"}</td>
                              <td style={{ padding: "10px 14px", color: C.mutedLight, fontSize: 12 }}>{p.method}</td>
                              <td style={{ padding: "10px 14px", color: p.status === "success" ? C.success : C.gold, fontSize: 13, fontWeight: 700 }}>
                                {p.amount.toLocaleString("fr-FR")} FCFA
                              </td>
                              <td style={{ padding: "10px 14px", color: C.muted, fontSize: 11, fontFamily: "monospace" }}>{p.reference || "—"}</td>
                              <td style={{ padding: "10px 14px", color: C.mutedLight, fontSize: 12, whiteSpace: "nowrap" }}>
                                {p.paid_at ? fmtDate(p.paid_at) : fmtDate(p.created_at)}
                              </td>
                              <td style={{ padding: "10px 14px" }}>{statusBadge(p.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
