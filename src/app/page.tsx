"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const C = {
  bg:        "#07070C",
  bg2:       "#0D0D15",
  card:      "#10101A",
  card2:     "#14141F",
  border:    "#1A1A2E",
  border2:   "#222236",
  gold:      "#F59E0B",
  goldDark:  "#D97706",
  goldLight: "#FCD34D",
  goldDim:   "#78450A",
  white:     "#F8F8FC",
  muted:     "#44445A",
  muted2:    "#7878A0",
  muted3:    "#AAAAC0",
  success:   "#22C55E",
  successBg: "rgba(34,197,94,0.08)",
  info:      "#3B82F6",
  purple:    "#A855F7",
  purpleBg:  "rgba(168,85,247,0.08)",
  danger:    "#EF4444",
}

const PLANS = [
  {
    id: "starter", label: "Starter", price: 9900, color: C.success, bg: C.successBg,
    border: "rgba(34,197,94,0.2)", popular: false,
    tagline: "Pour démarrer et valider ton business",
    features: [
      "Boutique en ligne personnalisée",
      "Commandes illimitées",
      "Gestion livreurs & closeurs",
      "SMS automatiques — 50/mois",
      "CA jusqu'à 500 000 FCFA/mois",
      "Dashboard analytics de base",
      "Support par email",
    ],
    missing: ["Pixels Facebook & TikTok", "Analytics avancés", "SMS illimités", "Support WhatsApp dédié"],
  },
  {
    id: "pro", label: "Pro", price: 19900, color: C.gold, bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.35)", popular: true,
    tagline: "Pour scaler et maximiser tes ventes",
    features: [
      "Boutique en ligne personnalisée",
      "Commandes illimitées",
      "Gestion livreurs & closeurs",
      "SMS illimités",
      "CA jusqu'à 2 000 000 FCFA/mois",
      "Pixels Facebook & TikTok",
      "Google Analytics 4 intégré",
      "Dashboard analytics avancés",
      "Support prioritaire",
    ],
    missing: ["Support WhatsApp dédié"],
  },
  {
    id: "business", label: "Business", price: 39900, color: C.purple, bg: C.purpleBg,
    border: "rgba(168,85,247,0.2)", popular: false,
    tagline: "Pour les marques qui dominent leur marché",
    features: [
      "Boutique en ligne personnalisée",
      "Commandes illimitées",
      "Gestion livreurs & closeurs",
      "SMS illimités",
      "CA illimité — aucune restriction",
      "Pixels Facebook & TikTok",
      "Google Analytics 4 intégré",
      "Dashboard analytics avancés",
      "Rapport hebdomadaire automatique",
      "Accès API complet",
      "Support WhatsApp dédié 7j/7",
    ],
    missing: [],
  },
]

const FEATURES = [
  {
    icon: "🏪", color: C.gold,
    title: "Boutique en ligne en 5 minutes",
    desc: "Crée ta boutique avec tes couleurs, ton logo et tes produits. Un lien à partager — tes clients commandent directement. Aucune compétence technique requise.",
    stat: "5 min", statLabel: "pour lancer",
  },
  {
    icon: "📦", color: C.info,
    title: "Gestion des commandes centralisée",
    desc: "Toutes tes commandes dans un seul tableau de bord. Statuts en temps réel, historique complet, filtres par date, livreur ou statut. Zéro perte d'information.",
    stat: "100%", statLabel: "traçabilité",
  },
  {
    icon: "🛵", color: C.success,
    title: "Livreurs avec accès sécurisé",
    desc: "Chaque livreur a son propre compte. Il voit uniquement ses commandes, confirme les livraisons et les encaissements COD. Toi tu gardes le contrôle total.",
    stat: "0 fuite", statLabel: "d'information",
  },
  {
    icon: "📱", color: C.purple,
    title: "SMS automatiques à chaque étape",
    desc: "Tes clients sont informés automatiquement : commande confirmée, livreur en route, colis livré. Réduis les annulations et booste la satisfaction client.",
    stat: "-40%", statLabel: "d'annulations",
  },
  {
    icon: "📊", color: "#F43F5E",
    title: "Pixels & Analytics sans configuration",
    desc: "Facebook Pixel, TikTok Pixel et Google Analytics activés en 30 secondes. Événements ViewContent, InitiateCheckout et Purchase trackés automatiquement.",
    stat: "3 pixels", statLabel: "en 30 secondes",
  },
  {
    icon: "💰", color: C.goldLight,
    title: "Commissions calculées automatiquement",
    desc: "Tu définis les commissions de tes closeurs et livreurs une seule fois. À chaque livraison, tout est calculé et enregistré. Plus de disputes, plus d'erreurs.",
    stat: "0 erreur", statLabel: "de calcul",
  },
]

const TESTIMONIALS = [
  {
    name: "Kofi A.", role: "E-commerçant • Lomé", avatar: "KA",
    text: "Avant Shipivo je gérais tout sur WhatsApp. Maintenant j'ai un vrai dashboard, mes livreurs ont leur accès et je sais exactement ce qui est livré ou pas. C'est le jour et la nuit.",
    revenue: "2.4M FCFA/mois",
  },
  {
    name: "Ama S.", role: "Vendeuse en ligne • Abidjan", avatar: "AS",
    text: "La boutique en ligne est incluse dans l'abonnement. Je payais cher pour ça avant. Et les SMS automatiques ont vraiment réduit les clients qui demandent 'où est ma commande'.",
    revenue: "890K FCFA/mois",
  },
  {
    name: "Mawuli K.", role: "E-commerce • Accra", avatar: "MK",
    text: "Le pixel Facebook intégré a changé mes pubs. Avant je ne savais pas ce qui convertissait. Maintenant je vois tout. Mon coût par commande a baissé de 35%.",
    revenue: "1.8M FCFA/mois",
  },
]

const FAQS = [
  { q: "Puis-je tester sans carte bancaire ?", a: "Oui. 14 jours d'essai gratuit avec toutes les fonctionnalités Pro débloquées. Aucune carte requise. Tu passes au plan payant seulement quand tu es convaincu." },
  { q: "Comment je paie mon abonnement ?", a: "Via Wave, Orange Money, MTN Mobile Money, Visa ou Mastercard — tout depuis ton dashboard. Tu peux aussi contacter notre équipe sur WhatsApp pour un paiement manuel." },
  { q: "Mes données sont-elles sécurisées ?", a: "Oui. Toutes les données sont hébergées sur Supabase avec chiffrement end-to-end. Chaque e-commerçant est complètement isolé — personne ne voit les données d'un autre." },
  { q: "Est-ce que mes livreurs ont besoin d'un smartphone ?", a: "Oui. Shipivo fonctionne sur tout navigateur mobile. Tes livreurs accèdent à leur espace depuis leur téléphone sans installer d'application." },
  { q: "Puis-je changer de plan en cours de mois ?", a: "Oui. Tu peux upgrader ou downgrader à tout moment depuis tes paramètres. Le changement est immédiat." },
  { q: "Que se passe-t-il si je dépasse mon CA mensuel ?", a: "On te prévient par SMS et email. Tu as 48h pour upgrader avant que l'accès soit restreint. On ne coupe pas sans prévenir." },
  { q: "Y a-t-il des frais cachés ?", a: "Aucun. Le prix affiché est le prix final. Les SMS sont inclus dans ton plan. Tu ne paies pas à la commande, pas à la livraison — juste ton abonnement mensuel." },
]

function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const steps = 60
    const interval = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      const ease = 1 - Math.pow(1 - step / steps, 3)
      setValue(Math.floor(target * ease))
      if (step >= steps) { setValue(target); clearInterval(timer) }
    }, interval)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [billingAnnual, setBillingAnnual] = useState(false)
  const c1 = useCountUp(14800)
  const c2 = useCountUp(340)
  const c3 = useCountUp(94)
  const c4 = useCountUp(2600000000)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  const price = (p: number) => billingAnnual ? Math.floor(p * 0.8) : p

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: C.white, overflowX: "hidden" }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(7,7,12,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "none",
        transition: "all 0.4s ease",
        padding: "16px 32px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <rect x="2" y="2" width="22" height="5" rx="2.5" fill="#07070C"/>
                <rect x="2" y="2" width="5" height="12" rx="2.5" fill="#07070C"/>
                <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill="#07070C"/>
                <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill="#07070C"/>
                <rect x="2" y="19" width="22" height="5" rx="2.5" fill="#07070C"/>
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", color: C.white }}>Shipivo</span>
            <span style={{ background: "rgba(245,158,11,0.12)", color: C.gold, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, letterSpacing: "0.06em" }}>WEST AFRICA</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a href="#pricing" style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", color: C.muted3, fontSize: 14, fontWeight: 500, cursor: "pointer", textDecoration: "none" }}>Tarifs</a>
            <button onClick={() => router.push("/login")} style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border2}`, background: "transparent", color: C.muted3, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Connexion
            </button>
            <button onClick={() => router.push("/signup")} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "-0.01em" }}>
              Essai gratuit →
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", padding: "160px 32px 120px", textAlign: "center", overflow: "hidden" }}>
        {/* Glow background */}
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 100, padding: "8px 20px", marginBottom: 36 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.success, display: "inline-block", flexShrink: 0 }} />
            <span style={{ color: C.gold, fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" }}>Plateforme SaaS #1 pour l'e-commerce en Afrique de l'Ouest</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(40px, 6.5vw, 76px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 28px", letterSpacing: "-0.04em" }}>
            Gérez vos livraisons.<br />
            <span style={{ position: "relative", display: "inline-block" }}>
              <span style={{ background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 50%, ${C.goldDark} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Explosez vos ventes.
              </span>
            </span>
          </h1>

          <p style={{ color: C.muted3, fontSize: "clamp(16px, 2vw, 20px)", maxWidth: 640, margin: "0 auto 48px", lineHeight: 1.75, fontWeight: 400 }}>
            Boutique en ligne, gestion des commandes, livreurs, SMS automatiques et pixels publicitaires — tout en un. Conçu pour les e-commerçants africains qui veulent scaler vite.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
            <button onClick={() => router.push("/signup")} style={{ padding: "16px 36px", borderRadius: 14, border: "none", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, color: "#000", fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: "-0.02em" }}>
              🚀 Démarrer gratuitement — 14 jours
            </button>
            <button onClick={() => router.push("/commander/therawolf")} style={{ padding: "16px 32px", borderRadius: 14, border: `1px solid ${C.border2}`, background: "rgba(255,255,255,0.02)", color: C.muted3, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
              Voir une vraie boutique →
            </button>
          </div>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            ✓ Sans carte bancaire &nbsp;·&nbsp; ✓ Aucune installation &nbsp;·&nbsp; ✓ Annulable à tout moment
          </p>
        </div>
      </section>

      {/* ── LOGOS / SOCIAL PROOF ── */}
      <section style={{ padding: "0 32px 80px", textAlign: "center" }}>
        <p style={{ color: C.muted, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24 }}>
          Ils utilisent Shipivo au quotidien
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap", alignItems: "center" }}>
          {["Togo 🇹🇬", "Côte d'Ivoire 🇨🇮", "Bénin 🇧🇯", "Sénégal 🇸🇳", "Cameroun 🇨🇲"].map(c => (
            <span key={c} style={{ color: C.muted2, fontSize: 14, fontWeight: 600, letterSpacing: "0.02em" }}>{c}</span>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: "0 32px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 1, background: C.border, borderRadius: 24, overflow: "hidden", border: `1px solid ${C.border}` }}>
            {[
              { value: c1.toLocaleString("fr-FR") + "+", label: "Commandes traitées", sub: "depuis le lancement", color: C.gold },
              { value: c2 + "+",                          label: "E-commerçants actifs", sub: "en Afrique de l'Ouest", color: C.success },
              { value: c3 + "%",                          label: "Taux de livraison moyen", sub: "chez nos clients", color: C.info },
              { value: (c4 / 1000000).toFixed(0) + "M+", label: "FCFA générés", sub: "par nos clients ce mois", color: C.purple },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, padding: "40px 32px" }}>
                <p style={{ color: s.color, fontSize: "clamp(32px,4vw,48px)", fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.04em" }}>{s.value}</p>
                <p style={{ color: C.white, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{s.label}</p>
                <p style={{ color: C.muted2, fontSize: 12, margin: 0 }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLÈME / SOLUTION ── */}
      <section style={{ padding: "0 32px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Problème */}
            <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 20, padding: "40px 36px" }}>
              <p style={{ color: C.danger, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>❌ Sans Shipivo</p>
              {[
                "Tu gères tes commandes sur WhatsApp et tu perds des ventes",
                "Tes livreurs t'appellent pour tout — impossible de tout suivre",
                "Tu ne sais pas combien tu as vendu vraiment ce mois",
                "Tes pixels pub ne sont pas configurés — tu perds de l'argent",
                "Les commissions de tes closeurs se calculent à la main",
                "Tes clients ne sont pas informés — ils annulent par frustration",
              ].map(t => (
                <div key={t} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                  <span style={{ color: C.danger, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✗</span>
                  <span style={{ color: C.muted3, fontSize: 14, lineHeight: 1.6 }}>{t}</span>
                </div>
              ))}
            </div>
            {/* Solution */}
            <div style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 20, padding: "40px 36px" }}>
              <p style={{ color: C.success, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>✅ Avec Shipivo</p>
              {[
                "Toutes tes commandes dans un dashboard propre et ordonné",
                "Chaque livreur a son accès — tu vois tout en temps réel",
                "Analytics complets : CA, taux de livraison, commissions",
                "Pixels Facebook, TikTok et GA4 actifs en 30 secondes",
                "Commissions calculées automatiquement à chaque livraison",
                "SMS automatiques — tes clients savent où est leur colis",
              ].map(t => (
                <div key={t} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                  <span style={{ color: C.success, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ color: C.muted3, fontSize: 14, lineHeight: 1.6 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section style={{ padding: "0 32px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Fonctionnalités</p>
            <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-0.04em" }}>Tout ce dont tu as besoin.<br />Rien de superflu.</h2>
            <p style={{ color: C.muted2, fontSize: 17, margin: "0 auto", maxWidth: 500, lineHeight: 1.7 }}>Shipivo est conçu pour l'Afrique de l'Ouest. Pas un outil occidental adapté — une solution pensée pour toi.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "32px 28px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle, ${f.color}08 0%, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ fontSize: 36, marginBottom: 20 }}>{f.icon}</div>
                <h3 style={{ color: C.white, fontSize: 18, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>{f.title}</h3>
                <p style={{ color: C.muted2, fontSize: 14, margin: "0 0 24px", lineHeight: 1.75 }}>{f.desc}</p>
                <div style={{ display: "inline-flex", alignItems: "baseline", gap: 6, background: `${f.color}10`, border: `1px solid ${f.color}20`, borderRadius: 10, padding: "8px 14px" }}>
                  <span style={{ color: f.color, fontSize: 20, fontWeight: 900 }}>{f.stat}</span>
                  <span style={{ color: f.color, fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{f.statLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section style={{ padding: "0 32px 100px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Comment ça marche</p>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, margin: 0, letterSpacing: "-0.04em" }}>Prêt en 4 étapes</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { step: "01", icon: "✍️", title: "Crée ton compte", desc: "Inscris-toi en 2 minutes. Aucune carte bancaire. 14 jours d'essai avec toutes les fonctionnalités débloquées." },
              { step: "02", icon: "🏪", title: "Configure ta boutique", desc: "Ajoute tes produits, ton logo, ta couleur de marque. Ta boutique est en ligne immédiatement avec un lien unique." },
              { step: "03", icon: "👥", title: "Ajoute ton équipe", desc: "Invites tes livreurs et closeurs. Chacun reçoit son accès sécurisé avec seulement ce dont il a besoin." },
              { step: "04", icon: "🚀", title: "Vends et scale", desc: "Lance tes pubs, reçois les commandes, suis les livraisons en temps réel. Shipivo s'occupe de tout le reste." },
            ].map((s, i) => (
              <div key={s.step} style={{ display: "flex", gap: 32, alignItems: "flex-start", padding: "32px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 16, background: C.card2, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 28 }}>{s.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ color: C.gold, fontSize: 12, fontWeight: 800, letterSpacing: "0.08em" }}>{s.step}</span>
                    <h3 style={{ color: C.white, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>{s.title}</h3>
                  </div>
                  <p style={{ color: C.muted2, fontSize: 15, margin: 0, lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section style={{ padding: "0 32px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Témoignages</p>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, margin: 0, letterSpacing: "-0.04em" }}>Ce que disent nos clients</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 26px" }}>
                <div style={{ display: "flex", marginBottom: 16, gap: 2 }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: C.gold, fontSize: 16 }}>★</span>)}
                </div>
                <p style={{ color: C.muted3, fontSize: 15, lineHeight: 1.8, margin: "0 0 24px", fontStyle: "italic" }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#000", fontSize: 13, fontWeight: 800 }}>{t.avatar}</span>
                  </div>
                  <div>
                    <p style={{ color: C.white, fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>{t.name}</p>
                    <p style={{ color: C.muted2, fontSize: 12, margin: 0 }}>{t.role}</p>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <p style={{ color: C.gold, fontSize: 14, fontWeight: 800, margin: "0 0 2px" }}>{t.revenue}</p>
                    <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>CA mensuel</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "0 32px 100px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Tarifs</p>
            <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-0.04em" }}>Simple. Transparent. Africain.</h2>
            <p style={{ color: C.muted2, fontSize: 17, margin: "0 0 32px", lineHeight: 1.7 }}>14 jours gratuit. Ensuite choisis le plan qui correspond à ton niveau.</p>

            {/* Toggle mensuel/annuel */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 8px" }}>
              <button onClick={() => setBillingAnnual(false)} style={{ padding: "8px 20px", borderRadius: 100, border: "none", background: !billingAnnual ? C.card2 : "transparent", color: !billingAnnual ? C.white : C.muted2, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Mensuel
              </button>
              <button onClick={() => setBillingAnnual(true)} style={{ padding: "8px 20px", borderRadius: 100, border: "none", background: billingAnnual ? C.card2 : "transparent", color: billingAnnual ? C.white : C.muted2, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                Annuel
                <span style={{ background: "rgba(34,197,94,0.15)", color: C.success, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>-20%</span>
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, alignItems: "start" }}>
            {PLANS.map(plan => (
              <div key={plan.id} style={{
                background: C.card, borderRadius: 24, padding: "32px 28px", position: "relative",
                border: `1px solid ${plan.popular ? plan.border : C.border}`,
                boxShadow: plan.popular ? `0 0 60px rgba(245,158,11,0.08)` : "none",
                transform: plan.popular ? "translateY(-8px)" : "none",
              }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, color: "#000", padding: "5px 18px", borderRadius: 100, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
                    ⭐ LE PLUS POPULAIRE
                  </div>
                )}

                <div style={{ marginBottom: 8 }}>
                  <span style={{ background: plan.bg, color: plan.color, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {plan.label}
                  </span>
                </div>
                <p style={{ color: C.muted2, fontSize: 14, margin: "12px 0 20px", lineHeight: 1.6 }}>{plan.tagline}</p>

                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                  <span style={{ color: C.white, fontSize: "clamp(36px,4vw,52px)", fontWeight: 900, letterSpacing: "-0.04em" }}>
                    {price(plan.price).toLocaleString("fr-FR")}
                  </span>
                  <span style={{ color: C.muted, fontSize: 15 }}>FCFA/mois</span>
                </div>
                {billingAnnual && (
                  <p style={{ color: C.muted, fontSize: 12, margin: "0 0 4px", textDecoration: "line-through" }}>
                    {plan.price.toLocaleString("fr-FR")} FCFA/mois
                  </p>
                )}
                <p style={{ color: C.muted, fontSize: 12, margin: "0 0 28px" }}>
                  soit ~{Math.round(price(plan.price) / 30).toLocaleString("fr-FR")} FCFA/jour
                </p>

                <button onClick={() => router.push("/signup")} style={{
                  width: "100%", padding: "15px", borderRadius: 14, border: plan.popular ? "none" : `1px solid ${C.border2}`,
                  background: plan.popular ? `linear-gradient(135deg,${C.gold},${C.goldDark})` : C.card2,
                  color: plan.popular ? "#000" : C.white, fontSize: 16, fontWeight: 800, cursor: "pointer",
                  marginBottom: 28, letterSpacing: "-0.01em",
                }}>
                  {plan.popular ? "Commencer maintenant →" : "Essai gratuit 14 jours →"}
                </button>

                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
                  <p style={{ color: C.muted2, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Inclus :</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ color: plan.color, fontSize: 15, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span style={{ color: C.muted3, fontSize: 14 }}>{f}</span>
                      </div>
                    ))}
                    {plan.missing.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ color: C.muted, fontSize: 15, flexShrink: 0, marginTop: 1 }}>✗</span>
                        <span style={{ color: C.muted, fontSize: 14, textDecoration: "line-through" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trial */}
          <div style={{ marginTop: 40, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 20, padding: "28px 32px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ fontSize: 40 }}>⏳</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ color: C.white, fontSize: 18, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>14 jours gratuit — Toutes fonctionnalités Pro</p>
              <p style={{ color: C.muted2, fontSize: 14, margin: 0 }}>Aucune carte bancaire. Tu choisis ton plan seulement après avoir vu les résultats.</p>
            </div>
            <button onClick={() => router.push("/signup")} style={{ padding: "14px 32px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              Démarrer gratuitement →
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "0 32px 100px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>FAQ</p>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, margin: 0, letterSpacing: "-0.04em" }}>Questions fréquentes</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${openFaq === i ? "rgba(245,158,11,0.3)" : C.border}`, borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", padding: "22px 24px", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 16 }}>
                  <span style={{ color: C.white, fontSize: 16, fontWeight: 600, textAlign: "left", lineHeight: 1.4 }}>{faq.q}</span>
                  <span style={{ color: C.gold, fontSize: 22, flexShrink: 0, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.25s", lineHeight: 1 }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 22px" }}>
                    <p style={{ color: C.muted2, fontSize: 15, margin: 0, lineHeight: 1.8 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "0 32px 120px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", background: C.card, border: `1px solid ${C.border}`, borderRadius: 28, padding: "80px 48px", textAlign: "center", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 300, background: "radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 20 }}>Prêt à passer au niveau supérieur ?</p>
            <h2 style={{ fontSize: "clamp(28px,5vw,56px)", fontWeight: 900, margin: "0 0 20px", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              Ton business mérite<br />un vrai outil professionnel.
            </h2>
            <p style={{ color: C.muted2, fontSize: 18, margin: "0 auto 40px", maxWidth: 520, lineHeight: 1.7 }}>
              Rejoins les e-commerçants qui ont choisi Shipivo pour gérer leurs ventes, leurs livreurs et développer leur business en Afrique de l'Ouest.
            </p>
            <button onClick={() => router.push("/signup")} style={{ padding: "18px 48px", borderRadius: 16, border: "none", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, color: "#000", fontSize: 18, fontWeight: 900, cursor: "pointer", letterSpacing: "-0.02em", marginBottom: 20 }}>
              🚀 Démarrer 14 jours gratuit
            </button>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
              ✓ Sans carte bancaire &nbsp;·&nbsp; ✓ Configuration en 5 min &nbsp;·&nbsp; ✓ Support WhatsApp inclus
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "48px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 26 26" fill="none">
                    <rect x="2" y="2" width="22" height="5" rx="2.5" fill="#07070C"/>
                    <rect x="2" y="2" width="5" height="12" rx="2.5" fill="#07070C"/>
                    <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill="#07070C"/>
                    <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill="#07070C"/>
                    <rect x="2" y="19" width="22" height="5" rx="2.5" fill="#07070C"/>
                  </svg>
                </div>
                <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em" }}>Shipivo</span>
              </div>
              <p style={{ color: C.muted2, fontSize: 14, margin: "0 0 6px", maxWidth: 260, lineHeight: 1.7 }}>
                La plateforme SaaS conçue pour les e-commerçants d'Afrique de l'Ouest.
              </p>
              <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Made with 🤎 in Lomé, Togo</p>
            </div>
            <div style={{ display: "flex", gap: 64, flexWrap: "wrap" }}>
              <div>
                <p style={{ color: C.muted2, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Produit</p>
                {["Fonctionnalités", "Tarifs", "Demo"].map(l => (
                  <p key={l} style={{ margin: "0 0 10px" }}><a href={l === "Tarifs" ? "#pricing" : "#"} style={{ color: C.muted2, fontSize: 14, textDecoration: "none" }}>{l}</a></p>
                ))}
              </div>
              <div>
                <p style={{ color: C.muted2, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Compte</p>
                {[["Connexion", "/login"], ["Inscription", "/signup"], ["Super Admin", "/super-admin"]].map(([l, href]) => (
                  <p key={l} style={{ margin: "0 0 10px" }}><button onClick={() => router.push(href)} style={{ background: "none", border: "none", color: C.muted2, fontSize: 14, cursor: "pointer", padding: 0 }}>{l}</button></p>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 28, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>© 2026 Shipivo. Tous droits réservés.</p>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>🌍 Togo · Côte d'Ivoire · Bénin · Sénégal · Cameroun</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
