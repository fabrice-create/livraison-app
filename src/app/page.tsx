"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const C = {
  bg:       "#07070C",
  card:     "#0F0F18",
  card2:    "#13131E",
  border:   "#1C1C2E",
  border2:  "#232338",
  gold:     "#F59E0B",
  goldDk:   "#D97706",
  goldLt:   "#FCD34D",
  white:    "#F4F4F8",
  muted:    "#3E3E55",
  muted2:   "#6E6E90",
  muted3:   "#A0A0BC",
  success:  "#22C55E",
  info:     "#3B82F6",
  purple:   "#A855F7",
  danger:   "#EF4444",
}

const PLANS = [
  {
    id:"starter", label:"Starter", price:9900, color:C.success,
    bg:"rgba(34,197,94,0.07)", border:"rgba(34,197,94,0.18)", popular:false,
    tagline:"Pour démarrer et valider ton business",
    features:["Boutique en ligne personnalisée","Commandes illimitées","Gestion livreurs & closeurs","SMS automatiques — 50/mois","CA jusqu'à 500 000 FCFA/mois","Dashboard analytics de base","Support par email"],
    missing:["Pixels Facebook & TikTok","SMS illimités","Support WhatsApp dédié"],
  },
  {
    id:"pro", label:"Pro", price:19900, color:C.gold,
    bg:"rgba(245,158,11,0.07)", border:"rgba(245,158,11,0.3)", popular:true,
    tagline:"Pour scaler et maximiser tes ventes",
    features:["Boutique en ligne personnalisée","Commandes illimitées","Gestion livreurs & closeurs","SMS illimités","CA jusqu'à 2 000 000 FCFA/mois","Pixels Facebook & TikTok","Google Analytics 4","Dashboard analytics avancés","Support prioritaire"],
    missing:["Support WhatsApp dédié"],
  },
  {
    id:"business", label:"Business", price:39900, color:C.purple,
    bg:"rgba(168,85,247,0.07)", border:"rgba(168,85,247,0.18)", popular:false,
    tagline:"Pour les marques qui dominent leur marché",
    features:["Boutique en ligne personnalisée","Commandes illimitées","Gestion livreurs & closeurs","SMS illimités","CA illimité — aucune restriction","Pixels Facebook & TikTok","Google Analytics 4","Dashboard analytics avancés","Rapport hebdomadaire auto","Accès API complet","Support WhatsApp 7j/7"],
    missing:[],
  },
]

const FEATURES = [
  { icon:"🏪", color:C.gold,    title:"Boutique en ligne",       desc:"Crée ta boutique avec tes couleurs et tes produits. Un lien à partager — tes clients commandent directement.", stat:"5 min", statLabel:"pour lancer" },
  { icon:"📦", color:C.info,    title:"Commandes centralisées",  desc:"Toutes tes commandes dans un tableau de bord. Statuts en temps réel, historique complet, filtres avancés.", stat:"100%", statLabel:"traçabilité" },
  { icon:"🛵", color:C.success, title:"Livreurs sécurisés",      desc:"Chaque livreur a son propre accès. Il voit uniquement ses commandes, confirme les livraisons et encaissements.", stat:"0 fuite", statLabel:"d'info" },
  { icon:"📱", color:C.purple,  title:"SMS automatiques",        desc:"Tes clients sont informés à chaque étape. Réduis les annulations et booste la satisfaction client.", stat:"-40%", statLabel:"d'annulations" },
  { icon:"📊", color:"#F43F5E", title:"Pixels & Analytics",      desc:"Facebook, TikTok et Google Analytics activés en 30 secondes. Événements trackés automatiquement.", stat:"3 pixels", statLabel:"en 30s" },
  { icon:"💰", color:C.goldLt,  title:"Commissions auto",        desc:"Définis les commissions une seule fois. À chaque livraison, tout est calculé. Zéro erreur, zéro dispute.", stat:"0 erreur", statLabel:"de calcul" },
]

const TESTIMONIALS = [
  { name:"Kofi A.", role:"E-commerçant • Lomé 🇹🇬", avatar:"KA", color:C.gold,
    text:"Avant je gérais tout sur WhatsApp. Maintenant j'ai un vrai dashboard, mes livreurs ont leur accès. C'est le jour et la nuit.",
    revenue:"2.4M FCFA/mois" },
  { name:"Ama S.", role:"Vendeuse en ligne • Abidjan 🇨🇮", avatar:"AS", color:C.success,
    text:"La boutique est incluse dans l'abonnement. Et les SMS automatiques ont réduit les clients qui demandent 'où est ma commande'.",
    revenue:"890K FCFA/mois" },
  { name:"Mawuli K.", role:"E-commerce • Accra 🇬🇭", avatar:"MK", color:C.purple,
    text:"Le pixel Facebook intégré a changé mes pubs. Mon coût par commande a baissé de 35% depuis que j'utilise Shipivo.",
    revenue:"1.8M FCFA/mois" },
]

const FAQS = [
  { q:"Puis-je tester sans carte bancaire ?", a:"Oui. 14 jours d'essai gratuit avec toutes les fonctionnalités Pro. Aucune carte requise. Tu passes au plan payant seulement quand tu es convaincu." },
  { q:"Comment je paie mon abonnement ?", a:"Via Wave, Orange Money, MTN Mobile Money, Visa ou Mastercard. Tu peux aussi contacter notre équipe sur WhatsApp pour un paiement manuel." },
  { q:"Mes données sont-elles sécurisées ?", a:"Oui. Chiffrement end-to-end, hébergement Supabase. Chaque boutique est complètement isolée des autres." },
  { q:"Mes livreurs ont besoin d'un smartphone ?", a:"Oui, n'importe quel navigateur mobile suffit. Pas d'application à installer — ils accèdent depuis leur téléphone." },
  { q:"Puis-je changer de plan en cours de mois ?", a:"Oui. Upgrade ou downgrade à tout moment depuis tes paramètres. Changement immédiat." },
  { q:"Y a-t-il des frais cachés ?", a:"Aucun. Le prix affiché est le prix final. SMS inclus dans le plan. Tu ne paies pas à la commande ou à la livraison." },
]

function useCountUp(target: number, duration = 2000) {
  const [val, setVal] = useState(0)
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    const steps = 60
    let i = 0
    const t = setInterval(() => {
      i++
      setVal(Math.floor(target * (1 - Math.pow(1 - i/steps, 3))))
      if (i >= steps) { setVal(target); clearInterval(t) }
    }, duration / steps)
    return () => clearInterval(t)
  }, [target, duration])
  return val
}

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number|null>(null)
  const [annual, setAnnual] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const c1 = useCountUp(14800)
  const c2 = useCountUp(340)
  const c3 = useCountUp(94)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  const go = (path: string) => { setMenuOpen(false); router.push(path) }
  const price = (p: number) => annual ? Math.floor(p * 0.8) : p

  const S: Record<string, React.CSSProperties> = {
    section: { padding: "64px 20px" },
    sectionTitle: { fontSize: "clamp(26px,5vw,44px)", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 12px", color: C.white },
    sectionSub: { color: C.muted2, fontSize: "clamp(13px,2vw,16px)", margin: "0 0 48px", lineHeight: 1.75 },
    eyebrow: { color: C.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 12, display: "block" },
    card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "24px 20px" },
    btnPrimary: { padding: "14px 28px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${C.gold},${C.goldDk})`, color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer", width: "100%", letterSpacing: "-0.01em" },
    btnSecondary: { padding: "14px 28px", borderRadius: 12, border: `1px solid ${C.border2}`, background: "transparent", color: C.muted3, fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%" },
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"Inter,system-ui,sans-serif", color:C.white, overflowX:"hidden" }}>

      {/* ── CSS responsive global ── */}
      <style>{`
        * { box-sizing: border-box; }
        @media (min-width: 640px) {
          .hero-btns { flex-direction: row !important; }
          .hero-btns button { width: auto !important; }
          .grid-2 { grid-template-columns: 1fr 1fr !important; }
          .grid-3 { grid-template-columns: repeat(3,1fr) !important; }
          .grid-feat { grid-template-columns: repeat(2,1fr) !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
          .nav-desktop { display: flex !important; }
          .nav-burger { display: none !important; }
          .prob-grid { grid-template-columns: 1fr 1fr !important; }
          .stat-grid { grid-template-columns: repeat(3,1fr) !important; }
        }
        @media (min-width: 1024px) {
          .grid-feat { grid-template-columns: repeat(3,1fr) !important; }
          .plans-grid { grid-template-columns: repeat(3,1fr) !important; }
          .section-inner { max-width: 1100px; margin: 0 auto; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background: scrolled ? "rgba(7,7,12,0.95)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? `1px solid ${C.border}` : "none", transition:"all 0.3s", padding:"14px 20px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => go("/")}>
            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${C.gold},${C.goldDk})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 26 26" fill="none">
                <rect x="2" y="2" width="22" height="5" rx="2.5" fill="#07070C"/>
                <rect x="2" y="2" width="5" height="12" rx="2.5" fill="#07070C"/>
                <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill="#07070C"/>
                <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill="#07070C"/>
                <rect x="2" y="19" width="22" height="5" rx="2.5" fill="#07070C"/>
              </svg>
            </div>
            <span style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.04em" }}>Shipivo</span>
          </div>

          {/* Desktop nav */}
          <div className="nav-desktop" style={{ display:"none", gap:8, alignItems:"center" }}>
            <a href="#features" style={{ padding:"8px 14px", color:C.muted3, fontSize:14, fontWeight:500, textDecoration:"none" }}>Fonctionnalités</a>
            <a href="#pricing" style={{ padding:"8px 14px", color:C.muted3, fontSize:14, fontWeight:500, textDecoration:"none" }}>Tarifs</a>
            <button onClick={() => go("/login")} style={{ padding:"9px 18px", borderRadius:10, border:`1px solid ${C.border2}`, background:"transparent", color:C.muted3, fontSize:14, fontWeight:600, cursor:"pointer" }}>Connexion</button>
            <button onClick={() => go("/signup")} style={{ padding:"10px 22px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${C.gold},${C.goldDk})`, color:"#000", fontSize:14, fontWeight:800, cursor:"pointer" }}>Essai gratuit →</button>
          </div>

          {/* Mobile burger */}
          <button className="nav-burger" onClick={() => setMenuOpen(!menuOpen)} style={{ background:"transparent", border:`1px solid ${C.border2}`, borderRadius:8, padding:"8px 10px", cursor:"pointer", color:C.white, fontSize:18 }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background:C.card, borderTop:`1px solid ${C.border}`, padding:"16px 20px", display:"flex", flexDirection:"column", gap:10 }}>
            <a href="#features" onClick={() => setMenuOpen(false)} style={{ color:C.muted3, fontSize:15, fontWeight:500, textDecoration:"none", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>Fonctionnalités</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ color:C.muted3, fontSize:15, fontWeight:500, textDecoration:"none", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>Tarifs</a>
            <button onClick={() => go("/login")} style={{ padding:"12px", borderRadius:10, border:`1px solid ${C.border2}`, background:"transparent", color:C.muted3, fontSize:15, fontWeight:600, cursor:"pointer" }}>Connexion</button>
            <button onClick={() => go("/signup")} style={{ padding:"12px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${C.gold},${C.goldDk})`, color:"#000", fontSize:15, fontWeight:800, cursor:"pointer" }}>🚀 Essai gratuit 14 jours</button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding:"120px 20px 72px", textAlign:"center" }}>
        <div className="section-inner">
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:100, padding:"7px 18px", marginBottom:28 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:C.success, display:"inline-block" }} />
            <span style={{ color:C.gold, fontSize:12, fontWeight:600 }}>Plateforme #1 e-commerce en Afrique de l'Ouest</span>
          </div>

          <h1 style={{ fontSize:"clamp(36px,8vw,72px)", fontWeight:900, lineHeight:1.07, margin:"0 0 22px", letterSpacing:"-0.04em" }}>
            Gérez vos livraisons.<br/>
            <span style={{ background:`linear-gradient(135deg,${C.goldLt},${C.gold},${C.goldDk})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Explosez vos ventes.
            </span>
          </h1>

          <p style={{ color:C.muted3, fontSize:"clamp(15px,3vw,19px)", maxWidth:580, margin:"0 auto 36px", lineHeight:1.75 }}>
            Boutique en ligne, commandes, livreurs, SMS automatiques et pixels publicitaires — tout en un. Conçu pour les e-commerçants africains.
          </p>

          <div className="hero-btns" style={{ display:"flex", flexDirection:"column", gap:12, maxWidth:480, margin:"0 auto 20px" }}>
            <button onClick={() => go("/signup")} style={{ ...S.btnPrimary, fontSize:16 }}>
              🚀 Démarrer gratuitement — 14 jours
            </button>
            <button onClick={() => go("/commander/therawolf")} style={{ ...S.btnSecondary, fontSize:16 }}>
              Voir une vraie boutique →
            </button>
          </div>
          <p style={{ color:C.muted, fontSize:13 }}>✓ Sans carte bancaire &nbsp;·&nbsp; ✓ Annulable à tout moment</p>
        </div>
      </section>

      {/* ── PAYS ── */}
      <section style={{ padding:"0 20px 56px", textAlign:"center" }}>
        <p style={{ color:C.muted, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:20 }}>Présent dans toute l'Afrique de l'Ouest</p>
        <div style={{ display:"flex", justifyContent:"center", gap:"clamp(16px,4vw,48px)", flexWrap:"wrap" }}>
          {["Togo 🇹🇬","Côte d'Ivoire 🇨🇮","Bénin 🇧🇯","Sénégal 🇸🇳","Cameroun 🇨🇲"].map(c => (
            <span key={c} style={{ color:C.muted2, fontSize:"clamp(12px,2vw,14px)", fontWeight:600 }}>{c}</span>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding:"0 20px 72px" }}>
        <div className="section-inner">
          <div className="stat-grid" style={{ display:"grid", gridTemplateColumns:"1fr", gap:2, background:C.border, borderRadius:20, overflow:"hidden", border:`1px solid ${C.border}` }}>
            {[
              { value:`${c1.toLocaleString("fr-FR")}+`, label:"Commandes traitées", color:C.gold },
              { value:`${c2}+`,                         label:"E-commerçants actifs", color:C.success },
              { value:`${c3}%`,                         label:"Taux de livraison moyen", color:C.info },
            ].map(s => (
              <div key={s.label} style={{ background:C.card, padding:"32px 24px", textAlign:"center" }}>
                <p style={{ color:s.color, fontSize:"clamp(32px,6vw,48px)", fontWeight:900, margin:"0 0 6px", letterSpacing:"-0.04em" }}>{s.value}</p>
                <p style={{ color:C.muted3, fontSize:14, margin:0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLÈME / SOLUTION ── */}
      <section style={{ padding:"0 20px 72px" }}>
        <div className="section-inner">
          <div className="prob-grid" style={{ display:"grid", gridTemplateColumns:"1fr", gap:16 }}>
            <div style={{ background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:20, padding:"28px 24px" }}>
              <p style={{ color:C.danger, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:20 }}>❌ Sans Shipivo</p>
              {["Commandes gérées sur WhatsApp — tu perds des ventes","Livreurs qui appellent pour tout — impossible de suivre","Pas d'analytics — tu ne sais pas ce qui marche","Pixels pub non configurés — tu perds de l'argent","Commissions calculées à la main — erreurs et disputes"].map(t => (
                <div key={t} style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
                  <span style={{ color:C.danger, flexShrink:0, marginTop:2, fontSize:14 }}>✗</span>
                  <span style={{ color:C.muted3, fontSize:14, lineHeight:1.6 }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ background:"rgba(34,197,94,0.04)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:20, padding:"28px 24px" }}>
              <p style={{ color:C.success, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:20 }}>✅ Avec Shipivo</p>
              {["Dashboard propre — toutes tes commandes en un clic","Livreurs avec accès sécurisé — tu vois tout en temps réel","Analytics complets — CA, taux livraison, commissions","Pixels Facebook, TikTok et GA4 en 30 secondes","Commissions calculées automatiquement à chaque livraison"].map(t => (
                <div key={t} style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
                  <span style={{ color:C.success, flexShrink:0, marginTop:2, fontSize:14 }}>✓</span>
                  <span style={{ color:C.muted3, fontSize:14, lineHeight:1.6 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section id="features" style={{ padding:"0 20px 72px" }}>
        <div className="section-inner">
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <span style={S.eyebrow}>Fonctionnalités</span>
            <h2 style={S.sectionTitle}>Tout ce dont tu as besoin.<br/>Rien de superflu.</h2>
            <p style={{ ...S.sectionSub, maxWidth:480, margin:"0 auto 0" }}>Pensé pour l'Afrique de l'Ouest — pas un outil occidental adapté.</p>
          </div>
          <div className="grid-feat" style={{ display:"grid", gridTemplateColumns:"1fr", gap:16 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ ...S.card, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, right:0, width:100, height:100, background:`radial-gradient(circle,${f.color}08 0%,transparent 70%)`, pointerEvents:"none" }} />
                <div style={{ fontSize:32, marginBottom:16 }}>{f.icon}</div>
                <h3 style={{ color:C.white, fontSize:17, fontWeight:800, margin:"0 0 10px", letterSpacing:"-0.02em" }}>{f.title}</h3>
                <p style={{ color:C.muted2, fontSize:14, margin:"0 0 20px", lineHeight:1.7 }}>{f.desc}</p>
                <div style={{ display:"inline-flex", alignItems:"baseline", gap:6, background:`${f.color}10`, border:`1px solid ${f.color}18`, borderRadius:8, padding:"7px 12px" }}>
                  <span style={{ color:f.color, fontSize:18, fontWeight:900 }}>{f.stat}</span>
                  <span style={{ color:f.color, fontSize:12, opacity:0.8 }}>{f.statLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section style={{ padding:"0 20px 72px" }}>
        <div className="section-inner">
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <span style={S.eyebrow}>Comment ça marche</span>
            <h2 style={S.sectionTitle}>Prêt en 4 étapes</h2>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {[
              { step:"01", icon:"✍️", title:"Crée ton compte", desc:"2 minutes. Aucune carte bancaire. 14 jours d'essai toutes fonctionnalités débloquées." },
              { step:"02", icon:"🏪", title:"Configure ta boutique", desc:"Ajoute tes produits, ton logo, ta couleur. Ta boutique est en ligne immédiatement." },
              { step:"03", icon:"👥", title:"Invite ton équipe", desc:"Livreurs et closeurs reçoivent leur accès sécurisé avec uniquement ce dont ils ont besoin." },
              { step:"04", icon:"🚀", title:"Vends et scale", desc:"Lance tes pubs, reçois les commandes, suis les livraisons. Shipivo gère le reste." },
            ].map((s,i) => (
              <div key={s.step} style={{ display:"flex", gap:20, alignItems:"flex-start", padding:"24px 0", borderBottom:i<3?`1px solid ${C.border}`:"none" }}>
                <div style={{ flexShrink:0, width:48, height:48, borderRadius:14, background:C.card2, border:`1px solid ${C.border2}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                  {s.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <span style={{ color:C.gold, fontSize:11, fontWeight:800, letterSpacing:"0.08em" }}>{s.step}</span>
                    <h3 style={{ color:C.white, fontSize:17, fontWeight:800, margin:0, letterSpacing:"-0.02em" }}>{s.title}</h3>
                  </div>
                  <p style={{ color:C.muted2, fontSize:14, margin:0, lineHeight:1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section style={{ padding:"0 20px 72px" }}>
        <div className="section-inner">
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <span style={S.eyebrow}>Témoignages</span>
            <h2 style={S.sectionTitle}>Ce que disent nos clients</h2>
          </div>
          <div className="grid-3" style={{ display:"grid", gridTemplateColumns:"1fr", gap:16 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={S.card}>
                <div style={{ display:"flex", marginBottom:14, gap:2 }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color:C.gold, fontSize:14 }}>★</span>)}
                </div>
                <p style={{ color:C.muted3, fontSize:14, lineHeight:1.8, margin:"0 0 20px", fontStyle:"italic" }}>"{t.text}"</p>
                <div style={{ display:"flex", alignItems:"center", gap:12, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:`linear-gradient(135deg,${t.color},${C.goldDk})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ color:"#000", fontSize:12, fontWeight:800 }}>{t.avatar}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:C.white, fontSize:14, fontWeight:700, margin:"0 0 2px" }}>{t.name}</p>
                    <p style={{ color:C.muted2, fontSize:12, margin:0 }}>{t.role}</p>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <p style={{ color:C.gold, fontSize:13, fontWeight:800, margin:"0 0 2px" }}>{t.revenue}</p>
                    <p style={{ color:C.muted, fontSize:11, margin:0 }}>CA mensuel</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding:"0 20px 72px" }}>
        <div className="section-inner">
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <span style={S.eyebrow}>Tarifs</span>
            <h2 style={S.sectionTitle}>Simple. Transparent. Africain.</h2>
            <p style={{ color:C.muted2, fontSize:15, margin:"0 0 28px", lineHeight:1.7 }}>14 jours gratuit. Ensuite choisis ton plan.</p>

            {/* Toggle */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:C.card, border:`1px solid ${C.border}`, borderRadius:100, padding:"5px 6px" }}>
              <button onClick={() => setAnnual(false)} style={{ padding:"8px 18px", borderRadius:100, border:"none", background:!annual?C.card2:"transparent", color:!annual?C.white:C.muted2, fontSize:14, fontWeight:600, cursor:"pointer" }}>Mensuel</button>
              <button onClick={() => setAnnual(true)} style={{ padding:"8px 18px", borderRadius:100, border:"none", background:annual?C.card2:"transparent", color:annual?C.white:C.muted2, fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                Annuel
                <span style={{ background:"rgba(34,197,94,0.15)", color:C.success, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>-20%</span>
              </button>
            </div>
          </div>

          <div className="plans-grid" style={{ display:"grid", gridTemplateColumns:"1fr", gap:16 }}>
            {PLANS.map(plan => (
              <div key={plan.id} style={{ background:C.card, borderRadius:22, padding:"28px 24px", position:"relative", border:`1px solid ${plan.popular?plan.border:C.border}` }}>
                {plan.popular && (
                  <div style={{ position:"absolute", top:-13, left:"50%", transform:"translateX(-50%)", background:`linear-gradient(135deg,${C.gold},${C.goldDk})`, color:"#000", padding:"4px 16px", borderRadius:100, fontSize:11, fontWeight:800, whiteSpace:"nowrap" }}>
                    ⭐ LE PLUS POPULAIRE
                  </div>
                )}
                <div style={{ marginBottom:8 }}>
                  <span style={{ background:plan.bg, color:plan.color, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:8, textTransform:"uppercase" as const, letterSpacing:"0.06em" }}>{plan.label}</span>
                </div>
                <p style={{ color:C.muted2, fontSize:13, margin:"10px 0 18px", lineHeight:1.6 }}>{plan.tagline}</p>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:4 }}>
                  <span style={{ color:C.white, fontSize:"clamp(34px,6vw,48px)", fontWeight:900, letterSpacing:"-0.04em" }}>{price(plan.price).toLocaleString("fr-FR")}</span>
                  <span style={{ color:C.muted, fontSize:14 }}>FCFA/mois</span>
                </div>
                {annual && <p style={{ color:C.muted, fontSize:12, margin:"0 0 4px", textDecoration:"line-through" }}>{plan.price.toLocaleString("fr-FR")} FCFA</p>}
                <p style={{ color:C.muted, fontSize:12, margin:"0 0 24px" }}>~{Math.round(price(plan.price)/30).toLocaleString("fr-FR")} FCFA/jour</p>

                <button onClick={() => go("/signup")} style={{ ...plan.popular?S.btnPrimary:{...S.btnSecondary}, marginBottom:24 }}>
                  {plan.popular ? "Commencer maintenant →" : "Essai gratuit 14 jours →"}
                </button>

                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:20 }}>
                  <p style={{ color:C.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:14 }}>Inclus :</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <span style={{ color:plan.color, fontSize:14, flexShrink:0, marginTop:1 }}>✓</span>
                        <span style={{ color:C.muted3, fontSize:13, lineHeight:1.5 }}>{f}</span>
                      </div>
                    ))}
                    {plan.missing.map(f => (
                      <div key={f} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <span style={{ color:C.muted, fontSize:14, flexShrink:0, marginTop:1 }}>✗</span>
                        <span style={{ color:C.muted, fontSize:13, textDecoration:"line-through" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trial banner */}
          <div style={{ marginTop:24, background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.12)", borderRadius:18, padding:"24px 20px" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:16, alignItems:"flex-start" }}>
              <div>
                <p style={{ color:C.white, fontSize:16, fontWeight:800, margin:"0 0 4px", letterSpacing:"-0.02em" }}>⏳ 14 jours gratuit — Toutes fonctionnalités Pro</p>
                <p style={{ color:C.muted2, fontSize:14, margin:0 }}>Sans carte bancaire. Tu choisis ton plan après avoir vu les résultats.</p>
              </div>
              <button onClick={() => go("/signup")} style={{ ...S.btnPrimary, width:"auto", padding:"13px 28px" }}>Démarrer gratuitement →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding:"0 20px 72px" }}>
        <div className="section-inner" style={{ maxWidth:720 }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <span style={S.eyebrow}>FAQ</span>
            <h2 style={S.sectionTitle}>Questions fréquentes</h2>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {FAQS.map((f,i) => (
              <div key={i} style={{ background:C.card, border:`1px solid ${openFaq===i?"rgba(245,158,11,0.25)":C.border}`, borderRadius:14, overflow:"hidden", transition:"border-color 0.2s" }}>
                <button onClick={() => setOpenFaq(openFaq===i?null:i)} style={{ width:"100%", padding:"18px 20px", background:"transparent", border:"none", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", gap:12, textAlign:"left" }}>
                  <span style={{ color:C.white, fontSize:15, fontWeight:600, lineHeight:1.4 }}>{f.q}</span>
                  <span style={{ color:C.gold, fontSize:22, flexShrink:0, transform:openFaq===i?"rotate(45deg)":"none", transition:"transform 0.2s", lineHeight:1 }}>+</span>
                </button>
                {openFaq===i && (
                  <div style={{ padding:"0 20px 18px" }}>
                    <p style={{ color:C.muted2, fontSize:14, margin:0, lineHeight:1.8 }}>{f.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding:"0 20px 80px" }}>
        <div className="section-inner">
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:24, padding:"clamp(40px,6vw,80px) clamp(24px,5vw,64px)", textAlign:"center" }}>
            <span style={S.eyebrow}>Prêt à passer au niveau supérieur ?</span>
            <h2 style={{ ...S.sectionTitle, marginBottom:16 }}>Ton business mérite<br/>un vrai outil professionnel.</h2>
            <p style={{ color:C.muted2, fontSize:"clamp(14px,2vw,17px)", margin:"0 auto 36px", maxWidth:480, lineHeight:1.75 }}>
              Rejoins les e-commerçants qui utilisent Shipivo pour gérer leurs ventes et scaler en Afrique de l'Ouest.
            </p>
            <div style={{ maxWidth:360, margin:"0 auto" }}>
              <button onClick={() => go("/signup")} style={{ ...S.btnPrimary, fontSize:16, padding:"16px 32px", marginBottom:14 }}>
                🚀 Démarrer 14 jours gratuit
              </button>
              <p style={{ color:C.muted, fontSize:13, margin:0 }}>✓ Sans carte &nbsp;·&nbsp; ✓ 5 min &nbsp;·&nbsp; ✓ Support WhatsApp</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:`1px solid ${C.border}`, padding:"40px 20px" }}>
        <div className="section-inner">
          <div style={{ display:"flex", flexDirection:"column", gap:32 }}>
            <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:32 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${C.gold},${C.goldDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="18" height="18" viewBox="0 0 26 26" fill="none">
                      <rect x="2" y="2" width="22" height="5" rx="2.5" fill="#07070C"/>
                      <rect x="2" y="2" width="5" height="12" rx="2.5" fill="#07070C"/>
                      <rect x="2" y="10.5" width="22" height="5" rx="2.5" fill="#07070C"/>
                      <rect x="19" y="10.5" width="5" height="12" rx="2.5" fill="#07070C"/>
                      <rect x="2" y="19" width="22" height="5" rx="2.5" fill="#07070C"/>
                    </svg>
                  </div>
                  <span style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.03em" }}>Shipivo</span>
                </div>
                <p style={{ color:C.muted2, fontSize:13, margin:"0 0 4px", maxWidth:240, lineHeight:1.7 }}>La plateforme SaaS pour les e-commerçants d'Afrique de l'Ouest.</p>
                <p style={{ color:C.muted, fontSize:12, margin:0 }}>Made with 🤎 in Lomé, Togo</p>
              </div>
              <div style={{ display:"flex", gap:48, flexWrap:"wrap" }}>
                <div>
                  <p style={{ color:C.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:14 }}>Produit</p>
                  {[["Fonctionnalités","#features"],["Tarifs","#pricing"],["Démo","/commander/therawolf"]].map(([l,h]) => (
                    <p key={l} style={{ margin:"0 0 10px" }}><a href={h} style={{ color:C.muted2, fontSize:13, textDecoration:"none" }}>{l}</a></p>
                  ))}
                </div>
                <div>
                  <p style={{ color:C.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:14 }}>Compte</p>
                  {[["Connexion","/login"],["Inscription","/signup"]].map(([l,h]) => (
                    <p key={l} style={{ margin:"0 0 10px" }}><button onClick={() => go(h)} style={{ background:"none", border:"none", color:C.muted2, fontSize:13, cursor:"pointer", padding:0 }}>{l}</button></p>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:24, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
              <p style={{ color:C.muted, fontSize:12, margin:0 }}>© 2026 Shipivo. Tous droits réservés.</p>
              <p style={{ color:C.muted, fontSize:12, margin:0 }}>🌍 Togo · Côte d'Ivoire · Bénin · Sénégal · Cameroun</p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
