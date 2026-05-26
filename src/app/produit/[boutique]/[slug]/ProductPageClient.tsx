"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"
import { useParams, useSearchParams } from "next/navigation"

// ─── Types ───────────────────────────────────────────────
type Product = {
  id: string; nom: string; slug: string
  description: string; prix: number; prix_barre: number | null
  devise: string; badge: string; is_active: boolean
  image_principale: string; images: string[]
  hero_titre: string; hero_sous_titre: string; hero_cta_texte: string
  section_probleme_active: boolean; section_probleme_titre: string
  section_probleme_items: {emoji:string;texte:string}[]
  section_benefices_active: boolean; section_benefices_titre: string
  section_benefices_items: {emoji:string;titre:string;texte:string}[]
  section_composition_active: boolean; section_composition_titre: string
  section_composition_items: {nom:string;description:string}[]
  section_temoignages_active: boolean; section_temoignages_titre: string
  section_temoignages_items: {nom:string;ville:string;texte:string;note:number;photo?:string}[]
  section_comparaison_active: boolean; section_comparaison_titre: string
  section_comparaison_items: {critere:string;nous:boolean;concurrent:boolean}[]
  section_faq_active: boolean; section_faq_titre: string
  section_faq_items: {question:string;reponse:string}[]
  section_garantie_active: boolean; section_garantie_texte: string; section_garantie_icone: string
  section_utilisation_active: boolean; section_utilisation_titre: string
  section_utilisation_items: {etape:number;titre:string;texte:string}[]
  countdown_active: boolean; countdown_texte: string; countdown_end: string
  theme: string; font: string
  couleur_fond: string; couleur_accent: string; couleur_texte: string
  sections_ordre?: string
  vues?: number; commandes?: number; tenant_id: string
  // Social proof
  sp_active?: boolean
  sp_note?: number
  sp_avis_count?: number
  sp_clients_count?: number
  sp_derniere_commande?: number // minutes
}

type Tenant = {
  id: string; name: string; slug: string; phone: string
  brand_color: string; logo_url: string; delivery_fee: number; currency: string
}

// ─── Composant principal ──────────────────────────────────
export default function ProductPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const boutique = params?.boutique as string
  const slug = params?.slug as string

  const [product, setProduct] = useState<Product | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [mainImg, setMainImg] = useState(0)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [countdown, setCountdown] = useState({ h:"00",m:"00",s:"00",active:false })
  const [form, setForm] = useState({ name:"", phone:"", city:"", address:"", note:"" })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [orderNum, setOrderNum] = useState("")
  const [touchStart, setTouchStart] = useState(0)
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase.from("tenants").select("*").eq("slug", boutique).single()
      if (!t) { setLoading(false); return }
      setTenant(t as Tenant)
      const { data: p } = await supabase.from("products").select("*")
        .eq("tenant_id", t.id).eq("slug", slug).eq("is_active", true).single()
      if (p) {
        setProduct(p as Product)
        await supabase.from("products").update({ vues: ((p.vues||0)+1) }).eq("id", p.id)
      }
      setLoading(false)
      setTimeout(() => setHeroLoaded(true), 80)
    }
    load()
  }, [boutique, slug])

  // Sticky CTA — écoute window ET document (fix overflow-x:hidden sur html/body)
  useEffect(() => {
    if (!product) return
    const onScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
      const formEl = formRef.current
      if (!formEl) {
        setShowSticky(scrollY > 300)
        return
      }
      const formRect = formEl.getBoundingClientRect()
      const formInView = formRect.top < window.innerHeight && formRect.bottom > 0
      setShowSticky(scrollY > 300 && !formInView)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    document.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("scroll", onScroll)
    }
  }, [product])

  useEffect(() => {
    if (!product?.countdown_active || !product?.countdown_end) return
    const tick = () => {
      const diff = new Date(product.countdown_end).getTime() - Date.now()
      if (diff <= 0) { setCountdown(c=>({...c,active:false})); return }
      setCountdown({
        h: String(Math.floor(diff/3600000)).padStart(2,"0"),
        m: String(Math.floor((diff%3600000)/60000)).padStart(2,"0"),
        s: String(Math.floor((diff%60000)/1000)).padStart(2,"0"),
        active: true
      })
    }
    tick(); const t = setInterval(tick,1000); return ()=>clearInterval(t)
  }, [product])

  const handleOrder = async () => {
    if (!form.name.trim()) { setError("Ton prénom et nom sont requis"); return }
    if (!form.phone.trim()) { setError("Ton numéro de téléphone est requis"); return }
    if (!form.city.trim()) { setError("Ta ville est requise"); return }
    setSubmitting(true); setError("")
    const num = `CMD-${Date.now().toString(36).toUpperCase()}`
    const src = searchParams?.get("src") || "page_produit"
    const zone = searchParams?.get("zone") || null
    const { error: err } = await supabase.from("orders").insert({
      tenant_id: tenant?.id, customer_name: form.name.trim(),
      phone: form.phone.trim(), city: form.city.trim(),
      address: form.address.trim(), note: form.note.trim(),
      product: product?.nom, quantity: 1, amount: product?.prix,
      status: "En attente", source: src, zone_nom: zone,
      delivery_type: "standard"
    })
    if (err) { setError(err.message); setSubmitting(false); return }
    if (product) await supabase.from("products").update({ commandes:(product.commandes||0)+1 }).eq("id", product.id)
    setOrderNum(num); setSubmitted(true); setSubmitting(false)
  }

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#09090F", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:44,height:44,border:"3px solid #1E1E2E",borderTopColor:"#F59E0B",borderRadius:"50%",animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!product || !tenant) return (
    <div style={{ minHeight:"100vh", background:"#09090F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"DM Sans,sans-serif" }}>
      <p style={{ color:"#9898B0" }}>Produit introuvable.</p>
    </div>
  )

  const BG = product.couleur_fond || "#09090F"
  const AC = product.couleur_accent || tenant.brand_color || "#F59E0B"
  const TX = product.couleur_texte || "#F8F8FC"
  const FT = product.font || "DM Sans"
  const allImages = [product.image_principale, ...(product.images||[])].filter(Boolean)
  const fmt = (n:number) => `${n.toLocaleString("fr-FR")} ${product.devise||tenant.currency||"FCFA"}`
  const stars = (n:number) => Array.from({length:5},(_,i)=>i<n?"⭐":"☆").join("")
  const badgeColor = product.badge==="PROMO"?"#EF4444":product.badge==="NOUVEAU"?"#8B5CF6":product.badge==="BEST-SELLER"?AC:"#3B82F6"

  let sectionsOrdre: string[] = []
  try { sectionsOrdre = product.sections_ordre ? JSON.parse(product.sections_ordre) : [] } catch { sectionsOrdre = [] }
  const defaultOrdre = ["galerie","description","probleme","benefices","utilisation","composition","temoignages","comparaison","faq","garantie","formulaire"]
  const finalOrdre = sectionsOrdre.length > 0 ? sectionsOrdre : defaultOrdre

  const inp: React.CSSProperties = {
    width:"100%", background:"rgba(255,255,255,0.06)",
    border:"1px solid rgba(255,255,255,0.14)", borderRadius:14,
    padding:"15px 16px", color:TX, fontSize:15, outline:"none",
    boxSizing:"border-box", fontFamily:FT, transition:"border-color 0.2s,box-shadow 0.2s"
  }

  // ── GLOBAL STYLES ──
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=${FT.replace(/ /g,"+")}:wght@400;500;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-thumb{background:${AC}44;border-radius:2px;}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulseBadge{0%,100%{box-shadow:0 0 0 0 ${AC}00}50%{box-shadow:0 0 0 8px ${AC}18}}
    @keyframes blinkDot{0%,100%{opacity:1}50%{opacity:0.25}}
    @keyframes shine{0%{left:-80%}50%,100%{left:130%}}
    @keyframes heroReveal{from{opacity:0;transform:scale(1.04)}to{opacity:0.42;transform:scale(1)}}
    .hero-anim-0{animation:fadeUp 0.6s ease both;animation-delay:0.05s}
    .hero-anim-1{animation:fadeUp 0.6s ease both;animation-delay:0.15s}
    .hero-anim-2{animation:fadeUp 0.6s ease both;animation-delay:0.25s}
    .hero-anim-3{animation:fadeUp 0.6s ease both;animation-delay:0.35s}
    .hero-anim-4{animation:fadeUp 0.6s ease both;animation-delay:0.45s}
    .hero-anim-5{animation:fadeUp 0.6s ease both;animation-delay:0.55s}
    .hero-anim-6{animation:fadeUp 0.6s ease both;animation-delay:0.65s}
    input:focus,textarea:focus{border-color:${AC}!important;box-shadow:0 0 0 3px ${AC}1E!important;}
    .cta-btn-inner::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.18) 0%,transparent 55%);border-radius:inherit;pointer-events:none}
    .shine-el{position:absolute;top:0;left:-80%;width:55%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent);animation:shine 3.5s ease-in-out infinite 2s;pointer-events:none}
    .badge-animated{animation:pulseBadge 2.4s ease-in-out infinite}
    .blink-dot{animation:blinkDot 1.2s ease-in-out infinite}
  `

  // ── HERO SECTION ──
  const renderHero = () => (
    <div ref={heroRef} style={{ position:"relative", background:BG, overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 70% 60% at 70% 30%, ${AC}1A 0%, transparent 65%)`, pointerEvents:"none" }} />
      <style>{`
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-col-right { border-left: none !important; padding-left: 16px !important; padding-right: 16px !important; }
          .hero-col-left { padding: 24px 16px 0 !important; }
        }
      `}</style>
      <div className="hero-grid" style={{
        maxWidth:1200, margin:"0 auto",
        display:"grid", gridTemplateColumns:"1fr 1fr",
        minHeight:560
      }}>
        {/* COL GAUCHE — Galerie */}
        <div className="hero-col-left" style={{ padding:"48px 32px 48px 48px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          {allImages.length > 0 ? (
            <div>
              <div style={{ borderRadius:20, overflow:"hidden", background:"#111118", position:"relative", marginBottom:12 }}
                onTouchStart={e => setTouchStart(e.touches[0].clientX)}
                onTouchEnd={e => {
                  const diff = touchStart - e.changedTouches[0].clientX
                  if (Math.abs(diff) > 50) setMainImg(i => diff > 0 ? Math.min(i+1, allImages.length-1) : Math.max(i-1, 0))
                }}>
                <img src={allImages[mainImg]} alt={product.nom} style={{ width:"100%", aspectRatio:"1/1", objectFit:"cover", display:"block" }} />
                {allImages.length > 1 && (<>
                  <button onClick={()=>setMainImg(i=>Math.max(0,i-1))} style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
                  <button onClick={()=>setMainImg(i=>Math.min(allImages.length-1,i+1))} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
                  <div style={{ position:"absolute",bottom:14,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6 }}>
                    {allImages.map((_,i)=>( <div key={i} onClick={()=>setMainImg(i)} style={{ width:i===mainImg?22:8,height:8,borderRadius:4,background:i===mainImg?AC:"rgba(255,255,255,0.38)",cursor:"pointer",transition:"all 0.3s" }} /> ))}
                  </div>
                </>)}
              </div>
              {allImages.length > 1 && (
                <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none" }}>
                  {allImages.map((img,i)=>( <img key={i} src={img} alt="" onClick={()=>setMainImg(i)} style={{ width:72,height:72,borderRadius:12,objectFit:"cover",flexShrink:0,cursor:"pointer",border:`2.5px solid ${mainImg===i?AC:"transparent"}`,opacity:mainImg===i?1:0.55,transition:"all 0.2s" }} /> ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ aspectRatio:"1/1", borderRadius:20, background:"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:80 }}>📦</div>
          )}
        </div>

        {/* COL DROITE — Infos */}
        <div className="hero-col-right" style={{ padding:"48px 48px 48px 32px", display:"flex", flexDirection:"column", justifyContent:"center", borderLeft:`1px solid rgba(255,255,255,0.05)` }}>
          {product.badge && (
            <div style={{ marginBottom:14 }}>
              <span className="badge-animated" style={{ display:"inline-flex", alignItems:"center", gap:7, background:`${AC}18`, border:`1px solid ${AC}40`, borderRadius:20, padding:"5px 14px", fontSize:11, fontWeight:700, color:AC, letterSpacing:"0.9px", textTransform:"uppercase" }}>
                <span className="blink-dot" style={{ width:6, height:6, borderRadius:"50%", background:AC, flexShrink:0 }} />
                {product.badge}
              </span>
            </div>
          )}
          <h1 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(24px,3vw,40px)", fontWeight:800, lineHeight:1.1, color:TX, letterSpacing:"-0.5px", marginBottom:12 }}>
            {product.hero_titre || product.nom}
          </h1>
          {product.hero_sous_titre && (
            <p style={{ fontSize:"clamp(14px,1.4vw,16px)", color:`${TX}77`, lineHeight:1.7, marginBottom:18 }}>{product.hero_sous_titre}</p>
          )}
          <div style={{ display:"flex", alignItems:"flex-end", gap:14, marginBottom:14, flexWrap:"wrap" }}>
            <span style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(26px,3.5vw,44px)", fontWeight:800, color:AC, lineHeight:1, letterSpacing:"-1px" }}>{fmt(product.prix)}</span>
            {product.prix_barre && (
              <div style={{ display:"flex", flexDirection:"column", gap:3, paddingBottom:4 }}>
                <span style={{ fontSize:"clamp(14px,1.4vw,18px)", color:`${TX}38`, textDecoration:"line-through" }}>{fmt(product.prix_barre)}</span>
                <span style={{ background:`${AC}1E`, border:`1px solid ${AC}35`, borderRadius:10, padding:"2px 9px", fontSize:11, fontWeight:800, color:AC, textAlign:"center" }}>-{Math.round((1-product.prix/product.prix_barre)*100)}%</span>
              </div>
            )}
          </div>
          {product.sp_active !== false && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:10, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"10px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ display:"flex", gap:1 }}>{Array.from({length:5},(_,i)=>(<span key={i} style={{ fontSize:13, color:i<Math.round(product.sp_note||4.9)?"#F59E0B":"rgba(255,255,255,0.15)" }}>★</span>))}</div>
                  <span style={{ color:TX, fontSize:13, fontWeight:800 }}>{(product.sp_note||4.9).toFixed(1)}</span>
                  <span style={{ color:`${TX}44`, fontSize:11 }}>({(product.sp_avis_count||127).toLocaleString("fr-FR")} avis)</span>
                </div>
                <div style={{ width:1, height:16, background:"rgba(255,255,255,0.1)" }} />
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span>👥</span>
                  <span style={{ color:TX, fontSize:12, fontWeight:700 }}>{(product.sp_clients_count||2000).toLocaleString("fr-FR")}+</span>
                  <span style={{ color:`${TX}44`, fontSize:11 }}>clients</span>
                </div>
                <div style={{ width:1, height:16, background:"rgba(255,255,255,0.1)" }} />
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:7,height:7,borderRadius:"50%",background:"#4ADE80",boxShadow:"0 0 6px #4ADE80",flexShrink:0,animation:"blinkDot 1.5s ease-in-out infinite" }} />
                  <span style={{ color:`${TX}77`, fontSize:11 }}>Commandé il y a <strong style={{color:TX}}>{product.sp_derniere_commande||8} min</strong></span>
                </div>
              </div>
            </div>
          )}
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:20 }}>
            {["✅ Livraison gratuite","🔒 Paiement à la livraison","💊 100% naturel"].map((t,i)=>(
              <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:4, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.11)", borderRadius:20, padding:"5px 11px", fontSize:11, color:`${TX}77` }}>{t}</span>
            ))}
          </div>
          <button onClick={scrollToForm} className="cta-btn-inner" style={{ width:"100%", position:"relative", overflow:"hidden", background:`linear-gradient(135deg, ${AC} 0%, ${AC}CC 100%)`, border:"none", borderRadius:16, padding:"18px 24px", color:"#000", fontSize:"clamp(15px,1.6vw,18px)", fontWeight:800, cursor:"pointer", letterSpacing:"-0.3px", boxShadow:`0 12px 40px ${AC}44` }}>
            <span className="shine-el" />
            🛒 {product.hero_cta_texte || "Commander maintenant"}
          </button>
          <p style={{ textAlign:"center", color:`${TX}38`, fontSize:11, marginTop:9 }}>✅ Paiement à la livraison &nbsp;·&nbsp; 🚚 Livraison rapide &nbsp;·&nbsp; 🔒 Satisfait ou remboursé</p>
        </div>
      </div>
    </div>
  )

  const renderGalerie = () => {
    if (allImages.length === 0) return null
    return (
      <div key="galerie" style={{ marginBottom:28 }}>
        <div
          style={{ borderRadius:20, overflow:"hidden", background:"#111118", position:"relative", marginBottom:10 }}
          onTouchStart={e => setTouchStart(e.touches[0].clientX)}
          onTouchEnd={e => {
            const diff = touchStart - e.changedTouches[0].clientX
            if (Math.abs(diff) > 50) setMainImg(i => diff > 0 ? Math.min(i+1, allImages.length-1) : Math.max(i-1, 0))
          }}>
          <img src={allImages[mainImg]} alt={product.nom}
            style={{ width:"100%", aspectRatio:"4/3", objectFit:"cover", display:"block", transition:"opacity 0.25s" }} />
          {allImages.length > 1 && (
            <>
              <button onClick={()=>setMainImg(i=>Math.max(0,i-1))}
                style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
              <button onClick={()=>setMainImg(i=>Math.min(allImages.length-1,i+1))}
                style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
              <div style={{ position:"absolute",bottom:14,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6 }}>
                {allImages.map((_,i)=>(
                  <div key={i} onClick={()=>setMainImg(i)} style={{ width:i===mainImg?22:8,height:8,borderRadius:4,background:i===mainImg?AC:"rgba(255,255,255,0.38)",cursor:"pointer",transition:"all 0.3s" }} />
                ))}
              </div>
            </>
          )}
        </div>
        {allImages.length > 1 && (
          <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none" }}>
            {allImages.map((img,i)=>(
              <img key={i} src={img} alt="" onClick={()=>setMainImg(i)}
                style={{ width:72,height:72,borderRadius:12,objectFit:"cover",flexShrink:0,cursor:"pointer",border:`2.5px solid ${mainImg===i?AC:"transparent"}`,opacity:mainImg===i?1:0.55,transition:"all 0.2s" }} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Rendu sections ──
  const renderSection = (key: string): React.ReactNode => {
    switch(key) {
      case "galerie": return null // galerie déjà dans le hero layout

      case "description":
        if (!product.description) return null
        return (
          <div key="description" style={{ marginBottom:28, background:"rgba(255,255,255,0.03)", borderRadius:16, padding:"18px 20px", borderLeft:`3px solid ${AC}` }}>
            <p style={{ color:`${TX}BB`,fontSize:15,lineHeight:1.85,whiteSpace:"pre-wrap" }}>{product.description}</p>
          </div>
        )

      case "probleme":
        if (!product.section_probleme_active || !product.section_probleme_items?.length) return null
        return (
          <div key="probleme" style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,5vw,28px)",fontWeight:800,marginBottom:20,textAlign:"center",color:TX }}>{product.section_probleme_titre}</h2>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {product.section_probleme_items.map((item,i)=>(
                <div key={i} style={{ display:"flex",gap:14,alignItems:"flex-start",background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:14,padding:"14px 16px" }}>
                  <span style={{ fontSize:26,flexShrink:0,marginTop:2 }}>{item.emoji}</span>
                  <p style={{ color:`${TX}BB`,fontSize:15,lineHeight:1.65,margin:0 }}>{item.texte}</p>
                </div>
              ))}
            </div>
          </div>
        )

      case "benefices":
        if (!product.section_benefices_active || !product.section_benefices_items?.length) return null
        return (
          <div key="benefices" style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,5vw,28px)",fontWeight:800,marginBottom:20,textAlign:"center",color:TX }}>{product.section_benefices_titre}</h2>
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {product.section_benefices_items.map((item,i)=>(
                <div key={i} style={{ display:"flex",gap:16,alignItems:"flex-start",background:`${AC}0C`,border:`1px solid ${AC}20`,borderRadius:16,padding:"16px 18px" }}>
                  <span style={{ fontSize:30,flexShrink:0 }}>{item.emoji}</span>
                  <div>
                    <p style={{ color:TX,fontSize:15,fontWeight:700,marginBottom:5 }}>{item.titre}</p>
                    <p style={{ color:`${TX}77`,fontSize:14,lineHeight:1.65,margin:0 }}>{item.texte}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case "utilisation":
        if (!product.section_utilisation_active || !product.section_utilisation_items?.length) return null
        return (
          <div key="utilisation" style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,5vw,28px)",fontWeight:800,marginBottom:20,textAlign:"center",color:TX }}>{product.section_utilisation_titre}</h2>
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute",left:19,top:0,bottom:0,width:2,background:`${AC}28` }} />
              {product.section_utilisation_items.map((item,i)=>(
                <div key={i} style={{ display:"flex",gap:16,alignItems:"flex-start",paddingBottom:24,position:"relative" }}>
                  <div style={{ width:40,height:40,borderRadius:"50%",background:AC,color:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,flexShrink:0,zIndex:1,boxShadow:`0 0 0 5px ${BG}` }}>{i+1}</div>
                  <div style={{ paddingTop:9 }}>
                    <p style={{ color:TX,fontSize:15,fontWeight:700,marginBottom:5 }}>{item.titre}</p>
                    <p style={{ color:`${TX}77`,fontSize:14,lineHeight:1.65,margin:0 }}>{item.texte}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case "composition":
        if (!product.section_composition_active || !product.section_composition_items?.length) return null
        return (
          <div key="composition" style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,5vw,28px)",fontWeight:800,marginBottom:20,textAlign:"center",color:TX }}>{product.section_composition_titre}</h2>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              {product.section_composition_items.map((item,i)=>(
                <div key={i} style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 16px" }}>
                  <p style={{ color:AC,fontSize:13,fontWeight:700,marginBottom:4 }}>{item.nom}</p>
                  <p style={{ color:`${TX}66`,fontSize:12,lineHeight:1.55,margin:0 }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )

      case "temoignages":
        if (!product.section_temoignages_active || !product.section_temoignages_items?.length) return null
        return (
          <div key="temoignages" style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,5vw,28px)",fontWeight:800,marginBottom:20,textAlign:"center",color:TX }}>{product.section_temoignages_titre}</h2>
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              {product.section_temoignages_items.map((item,i)=>(
                <div key={i} style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:"18px 16px" }}>
                  <div style={{ display:"flex",gap:12,alignItems:"center",marginBottom:12 }}>
                    {item.photo ? (
                      <img src={item.photo} alt={item.nom} style={{ width:48,height:48,borderRadius:"50%",objectFit:"cover",flexShrink:0 }} />
                    ) : (
                      <div style={{ width:48,height:48,borderRadius:"50%",background:`${AC}1E`,color:AC,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,flexShrink:0 }}>
                        {item.nom.charAt(0)}
                      </div>
                    )}
                    <div style={{ flex:1 }}>
                      <p style={{ color:TX,fontSize:14,fontWeight:700,margin:"0 0 2px" }}>{item.nom}</p>
                      <p style={{ color:`${TX}44`,fontSize:12,margin:0 }}>📍 {item.ville}</p>
                    </div>
                    <span style={{ fontSize:13 }}>{stars(item.note)}</span>
                  </div>
                  <p style={{ color:`${TX}BB`,fontSize:14,lineHeight:1.75,fontStyle:"italic",margin:0,borderLeft:`3px solid ${AC}`,paddingLeft:12 }}>"{item.texte}"</p>
                </div>
              ))}
            </div>
          </div>
        )

      case "comparaison":
        if (!product.section_comparaison_active || !product.section_comparaison_items?.length) return null
        return (
          <div key="comparaison" style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,5vw,28px)",fontWeight:800,marginBottom:20,textAlign:"center",color:TX }}>{product.section_comparaison_titre}</h2>
            <div style={{ borderRadius:18,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr auto auto",background:"rgba(255,255,255,0.05)",padding:"12px 16px" }}>
                <span style={{ color:`${TX}55`,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1 }}>Critère</span>
                <span style={{ color:AC,fontSize:12,fontWeight:700,textAlign:"center",minWidth:80 }}>{tenant.name}</span>
                <span style={{ color:`${TX}33`,fontSize:12,fontWeight:700,textAlign:"center",minWidth:80 }}>Autres</span>
              </div>
              {product.section_comparaison_items.map((item,i)=>(
                <div key={i} style={{ display:"grid",gridTemplateColumns:"1fr auto auto",padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.04)",background:i%2===0?"transparent":"rgba(255,255,255,0.015)" }}>
                  <span style={{ color:`${TX}BB`,fontSize:14 }}>{item.critere}</span>
                  <span style={{ textAlign:"center",minWidth:80,fontSize:18 }}>{item.nous?"✅":"❌"}</span>
                  <span style={{ textAlign:"center",minWidth:80,fontSize:18 }}>{item.concurrent?"✅":"❌"}</span>
                </div>
              ))}
            </div>
          </div>
        )

      case "faq":
        if (!product.section_faq_active || !product.section_faq_items?.length) return null
        return (
          <div key="faq" style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,5vw,28px)",fontWeight:800,marginBottom:20,textAlign:"center",color:TX }}>{product.section_faq_titre}</h2>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {product.section_faq_items.map((item,i)=>(
                <div key={i} style={{ border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden" }}>
                  <button onClick={()=>setFaqOpen(faqOpen===i?null:i)}
                    style={{ width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",background:faqOpen===i?`${AC}0C`:"rgba(255,255,255,0.02)",border:"none",color:TX,fontSize:15,fontWeight:600,cursor:"pointer",textAlign:"left",gap:12 }}>
                    <span>{item.question}</span>
                    <span style={{ color:AC,fontSize:22,flexShrink:0,transition:"transform 0.3s",transform:faqOpen===i?"rotate(45deg)":"rotate(0)" }}>+</span>
                  </button>
                  {faqOpen===i && (
                    <div style={{ padding:"14px 18px 18px",borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                      <p style={{ color:`${TX}88`,fontSize:14,lineHeight:1.85,margin:0 }}>{item.reponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )

      case "garantie":
        if (!product.section_garantie_active) return null
        return (
          <div key="garantie" style={{ background:`${AC}0C`,border:`2px solid ${AC}2A`,borderRadius:22,padding:"24px 20px",textAlign:"center",marginBottom:36 }}>
            <div style={{ fontSize:46,marginBottom:10 }}>{product.section_garantie_icone}</div>
            <p style={{ color:TX,fontSize:17,fontWeight:800,margin:0 }}>{product.section_garantie_texte}</p>
          </div>
        )

      case "formulaire":
        return (
          <div key="formulaire" ref={formRef} style={{ marginBottom:40 }}>
            {submitted ? (
              <div style={{ background:"rgba(74,222,128,0.07)",border:"2px solid rgba(74,222,128,0.22)",borderRadius:24,padding:"36px 20px",textAlign:"center" }}>
                <div style={{ fontSize:64,marginBottom:16 }}>✅</div>
                <h2 style={{ fontFamily:"'Syne',sans-serif",color:TX,fontSize:24,fontWeight:800,marginBottom:8 }}>Commande confirmée !</h2>
                <p style={{ color:`${TX}77`,fontSize:15,lineHeight:1.7,marginBottom:20 }}>
                  Merci <strong style={{color:TX}}>{form.name}</strong> !<br/>
                  Notre équipe vous rappellera au <strong style={{color:TX}}>{form.phone}</strong>.
                </p>
                <div style={{ background:`${AC}0F`,border:`1px solid ${AC}2A`,borderRadius:14,padding:"14px 20px",display:"inline-block" }}>
                  <p style={{ color:`${TX}44`,fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:4 }}>Numéro de commande</p>
                  <p style={{ color:AC,fontSize:22,fontWeight:900,margin:0,letterSpacing:2,fontFamily:"'Syne',sans-serif" }}>{orderNum}</p>
                </div>
                {tenant.phone && (
                  <a href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g,"")}?text=Bonjour+j'ai+commandé+${encodeURIComponent(product.nom)}`}
                    style={{ display:"block",marginTop:20,background:"#25D366",borderRadius:14,padding:"14px",color:"#fff",fontSize:15,fontWeight:700,textDecoration:"none" }}>
                    💬 Contacter sur WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <div style={{ background:"rgba(255,255,255,0.03)",border:`2px solid ${AC}28`,borderRadius:24,padding:"24px 20px" }}>
                <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"clamp(18px,4vw,24px)",fontWeight:800,textAlign:"center",marginBottom:6,color:TX }}>🛒 Commander maintenant</h2>
                <p style={{ textAlign:"center",color:`${TX}44`,fontSize:13,marginBottom:24 }}>Paiement à la livraison · Livraison rapide</p>

                <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                  {[
                    {label:"Prénom et nom *",value:form.name,key:"name",placeholder:"Ex: Kofi Mensah"},
                    {label:"Téléphone WhatsApp *",value:form.phone,key:"phone",placeholder:"+228 90 00 00 00",type:"tel"},
                    {label:"Ville *",value:form.city,key:"city",placeholder:"Ex: Lomé, Dakar, Abidjan..."},
                    {label:"Adresse / Quartier",value:form.address,key:"address",placeholder:"Ex: Adidogomé, carrefour Shell"},
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display:"block",color:`${TX}66`,fontSize:13,fontWeight:500,marginBottom:8 }}>{f.label}</label>
                      <input value={f.value} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                        type={f.type||"text"} placeholder={f.placeholder} style={inp} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display:"block",color:`${TX}66`,fontSize:13,fontWeight:500,marginBottom:8 }}>Note (optionnel)</label>
                    <textarea value={form.note} onChange={e => setForm(p=>({...p,note:e.target.value}))}
                      placeholder="Instructions spéciales..." style={{...inp,resize:"none",height:70}} />
                  </div>

                  {/* Récap commande */}
                  <div style={{ background:`${AC}0C`,border:`1px solid ${AC}20`,borderRadius:14,padding:"16px" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                      <span style={{ color:`${TX}66`,fontSize:14 }}>{product.nom}</span>
                      <span style={{ color:TX,fontSize:14,fontWeight:700 }}>{fmt(product.prix)}</span>
                    </div>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                      <span style={{ color:`${TX}66`,fontSize:14 }}>Livraison</span>
                      <span style={{ color:"#4ADE80",fontSize:14,fontWeight:700 }}>Gratuite</span>
                    </div>
                    <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:10,display:"flex",justifyContent:"space-between" }}>
                      <span style={{ color:TX,fontSize:15,fontWeight:800 }}>Total</span>
                      <span style={{ color:AC,fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif" }}>{fmt(product.prix)}</span>
                    </div>
                  </div>

                  {error && <p style={{ color:"#F87171",fontSize:13,textAlign:"center",margin:0 }}>⚠️ {error}</p>}

                  <button
                    onClick={handleOrder}
                    disabled={submitting}
                    className="cta-btn-inner"
                    style={{
                      width:"100%", position:"relative", overflow:"hidden",
                      background:submitting?`${AC}66`:`linear-gradient(135deg,${AC} 0%,${AC}CC 100%)`,
                      border:"none", borderRadius:16, padding:"18px",
                      color:"#000", fontSize:17, fontWeight:900,
                      cursor:submitting?"not-allowed":"pointer",
                      boxShadow:submitting?"none":`0 8px 32px ${AC}3A`,
                      transition:"all 0.2s"
                    }}>
                    {!submitting && <span className="shine-el" />}
                    {submitting ? "Envoi en cours..." : `✅ ${product.hero_cta_texte||"Commander maintenant"} · ${fmt(product.prix)}`}
                  </button>
                  <p style={{ textAlign:"center",color:`${TX}33`,fontSize:12,margin:0 }}>🔒 Paiement sécurisé · Satisfait ou remboursé</p>
                </div>
              </div>
            )}
          </div>
        )

      default: return null
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:BG, color:TX, fontFamily:`'${FT}',DM Sans,Inter,sans-serif` }}>
      <style>{globalStyles}</style>

      {/* ── STICKY CTA ── */}
      {!submitted && showSticky && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:100,
          padding:"12px 16px 16px",
          background:`linear-gradient(to top, ${BG} 70%, ${BG}00 100%)`,
          animation:"slideUp 0.3s ease"
        }}>
          <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div style={{ maxWidth:640, margin:"0 auto" }}>
            <button
              onClick={scrollToForm}
              className="cta-btn-inner"
              style={{
                width:"100%", position:"relative", overflow:"hidden",
                background:`linear-gradient(135deg,${AC} 0%,${AC}CC 100%)`,
                border:"none", borderRadius:16,
                padding:"17px 24px",
                color:"#000", fontSize:16, fontWeight:900,
                cursor:"pointer", letterSpacing:"-0.3px",
                boxShadow:`0 -4px 24px ${BG}, 0 8px 32px ${AC}44`
              }}>
              <span className="shine-el" />
              🛒 {product.hero_cta_texte || "Commander maintenant"} · {fmt(product.prix)}
            </button>
          </div>
        </div>
      )}
      {countdown.active && (
        <div style={{ background:`linear-gradient(90deg,${AC}1E,${AC}0F)`,borderBottom:`1px solid ${AC}44`,padding:"9px 16px",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:12,flexWrap:"wrap" }}>
          <span style={{ color:AC,fontSize:12,fontWeight:700,letterSpacing:"0.5px" }}>⏰ {product.countdown_texte}</span>
          {[countdown.h,countdown.m,countdown.s].map((v,i)=>(
            <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:4 }}>
              <span style={{ background:AC,color:"#000",borderRadius:10,padding:"4px 11px",fontSize:19,fontWeight:900,fontVariantNumeric:"tabular-nums",fontFamily:"'Syne',sans-serif" }}>{v}</span>
              {i<2 && <span style={{ color:AC,fontWeight:900,fontSize:17 }}>:</span>}
            </span>
          ))}
        </div>
      )}

      {/* ── HERO PREMIUM ── */}
      {renderHero()}

      {/* ── Corps — sections ── */}
      <div style={{ maxWidth:640, margin:"0 auto", padding:"8px 16px 0" }}>
        {finalOrdre.map(key => renderSection(key))}

        {/* CTA final */}
        {!submitted && (
          <button onClick={scrollToForm}
            className="cta-btn-inner"
            style={{
              width:"100%", position:"relative", overflow:"hidden",
              background:`linear-gradient(135deg,${AC} 0%,${AC}CC 100%)`,
              border:"none", borderRadius:18, padding:"20px",
              color:"#000", fontSize:17, fontWeight:900, cursor:"pointer",
              marginBottom:32, boxShadow:`0 8px 32px ${AC}3A`
            }}>
            <span className="shine-el" />
            🛒 {product.hero_cta_texte || "Commander maintenant"}
          </button>
        )}

        {/* Footer */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)",padding:"20px 0 32px",textAlign:"center" }}>
          <p style={{ color:`${TX}22`,fontSize:12 }}>
            Propulsé par{" "}
            <a href="https://shipivo.app" style={{ color:AC,textDecoration:"none",fontWeight:700 }}>Shipivo</a>
          </p>
        </div>
      </div>
    </div>
  )
}
