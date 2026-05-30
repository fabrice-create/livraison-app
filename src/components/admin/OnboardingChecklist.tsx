"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"

const S = {
  bg: "#09090F", card: "#111118", card2: "#1A1A28",
  border: "#1E1E2E", gold: "#F59E0B", green: "#4ADE80",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
}

type Step = {
  id: string
  label: string
  desc: string
  icon: string
  href: string
  btnLabel: string
  check: (data: CheckData) => boolean
}

type CheckData = {
  hasProducts: boolean
  hasZones: boolean
  hasDrivers: boolean
  hasOrders: boolean
  hasWidget: boolean
}

const STEPS: Step[] = [
  {
    id: "compte",
    label: "Compte créé",
    desc: "Bienvenue sur Shipivo !",
    icon: "✅",
    href: "",
    btnLabel: "",
    check: () => true,
  },
  {
    id: "produit",
    label: "Ajouter ton premier produit",
    desc: "Crée ton produit avec ses offres et sa page de vente",
    icon: "📦",
    href: "?view=produits",
    btnLabel: "Ajouter un produit",
    check: (d) => d.hasProducts,
  },
  {
    id: "zone",
    label: "Créer ta première zone",
    desc: "Définis tes zones de livraison par pays",
    icon: "🌍",
    href: "?view=zones",
    btnLabel: "Créer une zone",
    check: (d) => d.hasZones,
  },
  {
    id: "livreur",
    label: "Ajouter un livreur",
    desc: "Invite ton premier livreur dans l'équipe",
    icon: "🛵",
    href: "?view=equipe",
    btnLabel: "Ajouter un livreur",
    check: (d) => d.hasDrivers,
  },
  {
    id: "commande",
    label: "Créer ta première commande",
    desc: "Teste le flux complet — closeuse, livreur, livraison",
    icon: "🛒",
    href: "?view=commandes",
    btnLabel: "Créer une commande",
    check: (d) => d.hasOrders,
  },
  {
    id: "widget",
    label: "Intégrer le widget",
    desc: "Copie ton widget et intègre-le sur ton site",
    icon: "🔌",
    href: "?view=widget",
    btnLabel: "Voir le widget",
    check: (d) => d.hasWidget,
  },
]

export default function OnboardingChecklist({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<CheckData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const key = `shipivo_onboarding_dismissed_${tenantId}`
    if (localStorage.getItem(key)) { setDismissed(true); return }

    const load = async () => {
      const [products, zones, drivers, orders] = await Promise.all([
        supabase.from("products").select("id").eq("tenant_id", tenantId).eq("is_active", true).limit(1),
        supabase.from("zones").select("id").eq("tenant_id", tenantId).limit(1),
        supabase.from("profiles").select("id").eq("tenant_id", tenantId).ilike("role", "livreur").limit(1),
        supabase.from("orders").select("id").eq("tenant_id", tenantId).limit(1),
      ])
      setData({
        hasProducts: (products.data?.length || 0) > 0,
        hasZones: (zones.data?.length || 0) > 0,
        hasDrivers: (drivers.data?.length || 0) > 0,
        hasOrders: (orders.data?.length || 0) > 0,
        hasWidget: (orders.data?.length || 0) > 0,
      })
    }
    load()
  }, [tenantId])

  const handleDismiss = () => {
    localStorage.setItem(`shipivo_onboarding_dismissed_${tenantId}`, "1")
    setDismissed(true)
  }

  if (dismissed || !data) return null

  const completed = STEPS.filter(s => s.check(data)).length
  const total = STEPS.length
  const allDone = completed === total
  const pct = Math.round((completed / total) * 100)

  // Si tout est complété, afficher brièvement puis disparaître
  if (allDone) return (
    <div style={{ background:"linear-gradient(135deg,#052E16,#065F46)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:16, padding:"20px 24px", marginBottom:24, display:"flex", alignItems:"center", gap:16 }}>
      <span style={{ fontSize:32 }}>🎉</span>
      <div style={{ flex:1 }}>
        <p style={{ color:S.green, fontWeight:800, fontSize:16, margin:"0 0 4px" }}>Félicitations ! Tu es prêt à vendre.</p>
        <p style={{ color:"#6EE7B7", fontSize:13, margin:0 }}>Toutes les étapes sont complétées. Bonne vente !</p>
      </div>
      <button onClick={handleDismiss} style={{ background:"none", border:"none", color:"#6EE7B7", cursor:"pointer", fontSize:20 }}>✕</button>
    </div>
  )

  return (
    <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:16, padding:"20px 24px", marginBottom:24 }}>
      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <p style={{ color:S.text, fontWeight:800, fontSize:16, margin:"0 0 4px" }}>🚀 Bienvenue sur Shipivo !</p>
          <p style={{ color:S.text2, fontSize:13, margin:0 }}>Complète ces étapes pour commencer à vendre</p>
        </div>
        <button onClick={handleDismiss} style={{ background:"none", border:"none", color:S.text3, cursor:"pointer", fontSize:18, padding:0 }}>✕</button>
      </div>

      {/* Barre de progression */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ color:S.text2, fontSize:12 }}>{completed}/{total} étapes complétées</span>
          <span style={{ color:S.gold, fontSize:12, fontWeight:700 }}>{pct}%</span>
        </div>
        <div style={{ background:S.border, borderRadius:8, height:8 }}>
          <div style={{ width:`${pct}%`, background:S.gold, borderRadius:8, height:"100%", transition:"width 0.5s" }} />
        </div>
      </div>

      {/* Liste des étapes */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {STEPS.map(step => {
          const done = step.check(data)
          return (
            <div key={step.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, background:done?"rgba(74,222,128,0.05)":S.card2, border:`1px solid ${done?"rgba(74,222,128,0.2)":S.border}`, transition:"all 0.2s" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:done?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                {done ? "✅" : step.icon}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ color:done?S.green:S.text, fontSize:13, fontWeight:600, margin:"0 0 2px", textDecoration:done?"line-through":"none" }}>{step.label}</p>
                <p style={{ color:S.text3, fontSize:11, margin:0 }}>{step.desc}</p>
              </div>
              {!done && step.href && (
                <a href={step.href} style={{ background:S.gold, color:"#000", border:"none", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer", textDecoration:"none", flexShrink:0 }}>
                  {step.btnLabel}
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
