"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const C = {
  bg:       "#0A0A0F",
  card:     "#111118",
  card2:    "#16161F",
  border:   "#1E1E2E",
  gold:     "#F59E0B",
  goldDark: "#D97706",
  white:    "#F8F8FC",
  muted:    "#55556A",
  muted2:   "#9898B0",
  success:  "#4ADE80",
  info:     "#60A5FA",
  purple:   "#C084FC",
  danger:   "#F87171",
}

const PLANS = [
  {
    id: "starter",
    label: "Starter",
    price: 9900,
    color: C.success,
    bg: "rgba(74,222,128,0.08)",
    border: "rgba(74,222,128,0.2)",
    badge: null,
    features: [
      { ok: true,  text: "Boutique en ligne incluse" },
      { ok: true,  text: "Commandes illimitées" },
      { ok: true,  text: "Gestion livreurs + closeurs" },
      { ok: true,  text: "SMS automatiques (50/mois)" },
      { ok: true,  text: "CA jusqu'à 500 000 FCFA/mois" },
      { ok: false, text: "Pixels Facebook & TikTok" },
      { ok: false, text: "Analytics avancés" },
      { ok: false, text: "Support WhatsApp dédié" },
    ],
  },
  {
    id: "pro",
    label: "Pro",
    price: 19900,
    color: C.gold,
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.3)",
    badge: "⭐ Populaire",
    features: [
      { ok: true,  text: "Boutique en ligne incluse" },
      { ok: true,  text: "Commandes illimitées" },
      { ok: true,  text: "Gestion livreurs + closeurs" },
      { ok: true,  text: "SMS illimités" },
      { ok: true,  text: "CA jusqu'à 2 000 000 FCFA/mois" },
      { ok: true,  text: "Pixels Facebook & TikTok" },
      { ok: true,  text: "Analytics avancés" },
      { ok: false, text: "Support WhatsApp dédié" },
    ],
  },
  {
    id: "business",
    label: "Business",
    price: 39900,
    color: C.purple,
    bg: "rgba(192,132,252,0.08)",
    border: "rgba(192,132,252,0.2)",
    badge: null,
    features: [
      { ok: true, text: "Boutique en ligne incluse" },
      { ok: true, text: "Commandes illimitées" },
      { ok: true, text: "Gestion livreurs + closeurs" },
      { ok: true, text: "SMS illimités" },
      { ok: true, text: "CA illimité" },
      { ok: true, text: "Pixels Facebook & TikTok" },
      { ok: true, text: "Analytics avancés" },
      { ok: true, text: "Support WhatsApp dédié" },
    ],
  },
]

const FAQS = [
  { q: "Est-ce que je peux tester avant de payer ?", a: "Oui. Tu as 14 jours d'essai gratuit avec toutes les fonctionnalités débloquées. Aucune carte bancaire requise." },
  { q: "Comment se passe le paiement ?", a: "Tu paies via Mobile Money (Wave, Orange Money, MTN), Visa ou Mastercard via CinetPay. Tu peux aussi contacter notre équipe pour un virement bancaire." },
  { q: "Puis-je changer de plan à tout moment ?", a: "Oui. Tu upgrades ou downgrads quand tu veux depuis tes paramètres. Le changement est effectif immédiatement." },
  { q: "Mes livreurs ont accès à quoi ?", a: "Chaque livreur a son propre accès sécurisé. Il voit ses commandes assignées, peut confirmer les livraisons et ses encaissements COD." },
  { q: "La boutique est-elle incluse dans tous les plans ?", a: "Oui. Chaque plan inclut une boutique en ligne prête à l'emploi avec tes produits, ton logo et ta couleur de marque." },
]

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [count, setCount] = useState({ commandes: 0, tenants: 0, livraison: 0 })

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Compteur animé
  useEffect(() => {
    const targets = { commandes: 12000, tenants: 120, livraison: 94 }
    const duration = 1800
    const steps = 60
    const interval = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount({
        commandes: Math.floor(targets.commandes * ease),
        tenants:   Math.floor(targets.tenants * ease),
        livraison: Math.floor(targets.livraison * ease),
      })
      if (step >= steps) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [])

  const btn = (label: string, onClick: () => void, primary = false) => (
    <button onClick={onClick} style={{
      padding: "13px 28px", borderRadius: 12, border: primary ? "none" : `1px solid ${C.border}`,
      background: primary ? `linear-gradient(135deg,${C.gold},${C.goldDark})` : "transparent",
      color: primary ? "#000" : C.muted2, fontSize: 15, fontWeight: 700, cursor: "pointer",
      transition: "all 0.2s",
    }}>
      {label}
    </button>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, system-ui, sans-serif", color: C.white }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(10,10,15,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "none",
        transition: "all 0.3s",
        padding: "14px 24px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <rect x="2" y="2" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="2" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
                <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="19" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
              </svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: C.white, letterSpacing: "-0.03em" }}>Shipivo</span>
          </div>
          {/* Actions */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => router.push("/login")} style={{ padding: "9px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted2, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Connexion
            </button>
            <button onClick={() => router.push("/signup")} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Essai gratuit →
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 140, paddingBottom: 80, textAlign: "center", padding: "140px 24px 80px" }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 100, padding: "6px 16px", marginBottom: 28 }}>
          <span style={{ fontSize: 13 }}>🚀</span>
          <span style={{ color: C.gold, fontSize: 13, fontWeight: 600 }}>Plateforme #1 gestion e-commerce en Afrique de l'Ouest</span>
        </div>

        <h1 style={{ fontSize: "clamp(32px, 6vw, 64px)", fontWeight: 900, lineHeight: 1.1, margin: "0 auto 24px", maxWidth: 800, letterSpacing: "-0.03em" }}>
          Gérez vos commandes,<br/>
          <span style={{ background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            livreurs et boutique
          </span><br/>
          en un seul endroit
        </h1>

        <p style={{ color: C.muted2, fontSize: "clamp(15px, 2vw, 18px)", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.7 }}>
          Shipivo est le SaaS conçu pour les e-commerçants africains. Boutique en ligne, gestion des livreurs, encaissement COD, SMS automatiques et pixels publicitaires — tout en FCFA.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {btn("🚀 Démarrer 14 jours gratuit", () => router.push("/signup"), true)}
          {btn("Voir une démo →", () => router.push("/commander/therawolf"))}
        </div>

        <p style={{ color: C.muted, fontSize: 13, marginTop: 16 }}>
          ✓ Aucune carte bancaire requise &nbsp;·&nbsp; ✓ 14 jours gratuit &nbsp;·&nbsp; ✓ Annulation à tout moment
        </p>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, background: C.border, borderRadius: 20, overflow: "hidden" }}>
          {[
            { value: count.commandes.toLocaleString("fr-FR") + "+", label: "Commandes gérées" },
            { value: count.tenants + "+",                           label: "E-commerçants actifs" },
            { value: count.livraison + "%",                         label: "Taux de livraison moyen" },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, padding: "32px 24px", textAlign: "center" }}>
              <p style={{ color: C.gold, fontSize: "clamp(28px,4vw,42px)", fontWeight: 900, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>{s.value}</p>
              <p style={{ color: C.muted2, fontSize: 13, margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: C.gold, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Fonctionnalités</p>
            <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>Tout ce qu'il vous faut pour vendre</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { icon: "🏪", title: "Boutique en ligne",        desc: "Crée ta boutique en 5 minutes. Personnalise les couleurs, le logo, les produits. Partage le lien et commence à vendre." },
              { icon: "📦", title: "Gestion des commandes",    desc: "Suis chaque commande en temps réel. Assigne les livreurs, gère les statuts, visualise les encaissements COD." },
              { icon: "🛵", title: "Équipe de livreurs",       desc: "Chaque livreur a son accès. Il confirme les livraisons, les paiements reçus. Tu gardes le contrôle total." },
              { icon: "📱", title: "SMS automatiques",         desc: "Tes clients reçoivent des SMS à chaque étape : confirmation, en route, livré. Zéro effort de ta part." },
              { icon: "📊", title: "Pixels & Analytics",       desc: "Facebook Pixel, TikTok Pixel et Google Analytics configurés en 30 secondes. Optimise tes publicités." },
              { icon: "💰", title: "Commissions automatiques", desc: "Les commissions de tes closeurs et livreurs sont calculées automatiquement à chaque livraison." },
            ].map(f => (
              <div key={f.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 22px", transition: "border-color 0.2s" }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ color: C.white, fontSize: 16, fontWeight: 700, margin: "0 0 8px 0" }}>{f.title}</h3>
                <p style={{ color: C.muted2, fontSize: 14, margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: C.gold, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Tarifs</p>
            <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 900, margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>Simple et transparent</h2>
            <p style={{ color: C.muted2, fontSize: 16, margin: 0 }}>14 jours gratuit — aucune carte bancaire requise</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 20, alignItems: "start" }}>
            {PLANS.map(plan => (
              <div key={plan.id} style={{
                background: C.card,
                border: `1px solid ${plan.id === "pro" ? plan.border : C.border}`,
                borderRadius: 20,
                padding: "28px 24px",
                position: "relative",
                transform: plan.id === "pro" ? "scale(1.03)" : "scale(1)",
                boxShadow: plan.id === "pro" ? `0 0 40px rgba(245,158,11,0.1)` : "none",
              }}>
                {plan.badge && (
                  <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: C.gold, color: "#000", padding: "4px 16px", borderRadius: 100, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {plan.badge}
                  </div>
                )}
                <p style={{ color: plan.color, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px 0" }}>{plan.label}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ color: C.white, fontSize: "clamp(32px,4vw,44px)", fontWeight: 900, letterSpacing: "-0.03em" }}>
                    {plan.price.toLocaleString("fr-FR")}
                  </span>
                  <span style={{ color: C.muted, fontSize: 14 }}>FCFA/mois</span>
                </div>
                <p style={{ color: C.muted, fontSize: 12, margin: "0 0 24px 0" }}>soit ~{Math.round(plan.price / 30).toLocaleString("fr-FR")} FCFA/jour</p>

                <button onClick={() => router.push("/signup")} style={{
                  width: "100%", padding: "13px", borderRadius: 12, border: plan.id === "pro" ? "none" : `1px solid ${C.border}`,
                  background: plan.id === "pro" ? `linear-gradient(135deg,${C.gold},${C.goldDark})` : C.card2,
                  color: plan.id === "pro" ? "#000" : C.white, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 24,
                }}>
                  Commencer gratuitement
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {plan.features.map(f => (
                    <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: f.ok ? C.success : C.muted, fontSize: 16, flexShrink: 0 }}>{f.ok ? "✓" : "✗"}</span>
                      <span style={{ color: f.ok ? C.muted2 : C.muted, fontSize: 13, textDecoration: f.ok ? "none" : "line-through" }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Trial banner */}
          <div style={{ marginTop: 32, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 28 }}>⏳</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.white, fontSize: 15, fontWeight: 700, margin: "0 0 2px 0" }}>Essai gratuit 14 jours — Toutes fonctionnalités débloquées</p>
              <p style={{ color: C.muted2, fontSize: 13, margin: 0 }}>Aucune carte bancaire. Tu choisis ton plan seulement quand tu es convaincu.</p>
            </div>
            <button onClick={() => router.push("/signup")} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              Démarrer maintenant →
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ color: C.gold, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>FAQ</p>
            <h2 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>Questions fréquentes</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${openFaq === i ? C.gold : C.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", padding: "18px 20px", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 12 }}>
                  <span style={{ color: C.white, fontSize: 15, fontWeight: 600, textAlign: "left" }}>{faq.q}</span>
                  <span style={{ color: C.gold, fontSize: 20, flexShrink: 0, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 18px" }}>
                    <p style={{ color: C.muted2, fontSize: 14, margin: 0, lineHeight: 1.7 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", background: `linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))`, border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 24, padding: "56px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
          <h2 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, margin: "0 0 16px 0", letterSpacing: "-0.02em" }}>
            Prêt à booster ton e-commerce ?
          </h2>
          <p style={{ color: C.muted2, fontSize: 16, margin: "0 0 32px 0", lineHeight: 1.7 }}>
            Rejoins les e-commerçants qui utilisent Shipivo pour gérer leurs livraisons et développer leur business en Afrique de l'Ouest.
          </p>
          <button onClick={() => router.push("/signup")} style={{ padding: "16px 40px", borderRadius: 14, border: "none", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, color: "#000", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
            Démarrer 14 jours gratuit →
          </button>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 14 }}>
            ✓ Sans carte bancaire &nbsp;·&nbsp; ✓ Configuration en 5 minutes &nbsp;·&nbsp; ✓ Support WhatsApp
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "32px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 26 26" fill="none">
                <rect x="2" y="2" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="2" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
                <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill="#0A0A0F"/>
                <rect x="2" y="19" width="22" height="5" rx="2.5" fill="#0A0A0F"/>
              </svg>
            </div>
            <span style={{ color: C.white, fontWeight: 800, fontSize: 16 }}>Shipivo</span>
          </div>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            © 2026 Shipivo · Made in 🌍 Afrique de l'Ouest
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            <button onClick={() => router.push("/login")} style={{ background: "none", border: "none", color: C.muted2, fontSize: 13, cursor: "pointer" }}>Connexion</button>
            <button onClick={() => router.push("/signup")} style={{ background: "none", border: "none", color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Inscription →</button>
          </div>
        </div>
      </footer>

    </div>
  )
}
