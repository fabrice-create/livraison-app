"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"
import { useParams, useSearchParams } from "next/navigation"

type Product = {
  id: string; nom: string; slug: string; description: string
  prix: number; prix_barre: number | null; devise: string; badge: string
  image_principale: string; images: string[]
  hero_titre: string; hero_sous_titre: string; hero_cta_texte: string
  section_probleme_active: boolean; section_probleme_titre: string
  section_probleme_items: {emoji:string;texte:string}[]
  section_benefices_active: boolean; section_benefices_titre: string
  section_benefices_items: {emoji:string;titre:string;texte:string}[]
  section_composition_active: boolean; section_composition_titre: string
  section_composition_items: {nom:string;description:string}[]
  section_temoignages_active: boolean; section_temoignages_titre: string
  section_temoignages_items: {nom:string;ville:string;texte:string;note:number}[]
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
  tenant_id: string
  vues?: number; commandes?: number
}
type Tenant = {
  id: string; name: string; slug: string; phone: string
  brand_color: string; logo_url: string; delivery_fee: number; currency: string
}

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
  const [step, setStep] = useState<"page"|"form"|"success">("page")
  const [form, setForm] = useState({ name:"", phone:"", city:"", address:"", note:"" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [orderNumber, setOrderNumber] = useState("")
  const orderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase.from("tenants").select("*").eq("slug", boutique).single()
      if (!t) { setLoading(false); return }
      setTenant(t as Tenant)
      const { data: p } = await supabase.from("products").select("*").eq("tenant_id", t.id).eq("slug", slug).eq("is_active", true).single()
      if (p) {
        setProduct(p as Product)
        setMainImg(0)
        // Incrémenter vues
        await supabase.from("products").update({ vues: (p.vues || 0) + 1 }).eq("id", p.id)
      }
      setLoading(false)
    }
    load()
  }, [boutique, slug])

  // Countdown
  useEffect(() => {
    if (!product?.countdown_active || !product?.countdown_end) return
    const tick = () => {
      const end = new Date(product.countdown_end).getTime()
      const diff = end - Date.now()
      if (diff <= 0) { setCountdown({ h:"00",m:"00",s:"00",active:false }); return }
      const h = String(Math.floor(diff/3600000)).padStart(2,"0")
      const m = String(Math.floor((diff%3600000)/60000)).padStart(2,"0")
      const s = String(Math.floor((diff%60000)/1000)).padStart(2,"0")
      setCountdown({ h,m,s,active:true })
    }
    tick(); const t = setInterval(tick,1000); return () => clearInterval(t)
  }, [product])

  const handleOrder = async () => {
    if (!form.name || !form.phone || !form.city) { setError("Prénom, téléphone et ville sont requis."); return }
    setSubmitting(true); setError("")
    const num = `CMD-${Date.now().toString(36).toUpperCase()}`
    const { error: err } = await supabase.from("orders").insert({
      tenant_id: tenant?.id, customer_name: form.name, phone: form.phone,
      city: form.city, address: form.address, note: form.note,
      product: product?.nom, quantity: 1, amount: product?.prix,
      status: "En attente", source: searchParams?.get("src") || "page_produit",
    })
    if (err) { setError(err.message); setSubmitting(false); return }
    // Incrémenter commandes
    if (product) await supabase.from("products").update({ commandes: (product.commandes||0)+1 }).eq("id", product.id)
    setOrderNumber(num); setStep("success"); setSubmitting(false)
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:40,height:40,border:"3px solid #1E1E2E",borderTopColor:"#F59E0B",borderRadius:"50%",animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!product || !tenant) return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,sans-serif" }}>
      <p style={{ color:"#9898B0" }}>Produit introuvable.</p>
    </div>
  )

  const BG = product.couleur_fond || "#080810"
  const AC = product.couleur_accent || tenant.brand_color || "#F59E0B"
  const TX = product.couleur_texte || "#F8F8FC"
  const FT = product.font || "Inter"
  const allImages = [product.image_principale, ...product.images].filter(Boolean)
  const fmt = (n: number) => `${n.toLocaleString("fr-FR")} ${product.devise || tenant.currency || "FCFA"}`

  const stars = (n: number) => "⭐".repeat(n) + "☆".repeat(5-n)

  const inpStyle: React.CSSProperties = {
    width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:12, padding:"14px 16px", color:TX, fontSize:15, outline:"none",
    boxSizing:"border-box", fontFamily:FT,
  }

  return (
    <div style={{ minHeight:"100vh", background:BG, color:TX, fontFamily:`${FT},Inter,sans-serif` }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${FT.replace(" ","+")}:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${AC}55; border-radius:2px; }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .fadeUp { animation: fadeUp 0.6s ease forwards; }
        .btn-cta { transition: transform 0.1s, box-shadow 0.1s; }
        .btn-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 24px ${AC}55; }
        .btn-cta:active { transform: translateY(0); }
      `}</style>

      {/* ── Compte à rebours ── */}
      {countdown.active && (
        <div style={{ background:`linear-gradient(135deg,${AC}22,${AC}11)`, borderBottom:`2px solid ${AC}`, padding:"10px 16px", textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
          <span style={{ color:AC, fontSize:13, fontWeight:700 }}>⏰ {product.countdown_texte}</span>
          {[countdown.h, countdown.m, countdown.s].map((val, i) => (
            <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
              <span style={{ background:AC, color:"#000", borderRadius:8, padding:"4px 12px", fontSize:18, fontWeight:900 }}>{val}</span>
              {i < 2 && <span style={{ color:AC, fontWeight:900 }}>:</span>}
            </span>
          ))}
        </div>
      )}

      {/* ── HERO ── */}
      <div style={{ maxWidth:680, margin:"0 auto", padding:"32px 16px 0" }}>

        {/* Badge */}
        {product.badge && (
          <div style={{ display:"inline-block", background:product.badge==="PROMO"?"#EF4444":product.badge==="NOUVEAU"?"#8B5CF6":AC, color:"#fff", borderRadius:8, padding:"4px 12px", fontSize:11, fontWeight:800, letterSpacing:1, marginBottom:12 }}>
            {product.badge}
          </div>
        )}

        {/* Titre */}
        <h1 className="fadeUp" style={{ fontSize:"clamp(24px,5vw,40px)", fontWeight:900, lineHeight:1.2, marginBottom:12, color:TX }}>
          {product.hero_titre || product.nom}
        </h1>
        {product.hero_sous_titre && (
          <p style={{ fontSize:"clamp(14px,3vw,18px)", color:`${TX}99`, lineHeight:1.6, marginBottom:20 }}>
            {product.hero_sous_titre}
          </p>
        )}

        {/* Prix */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          <span style={{ fontSize:"clamp(28px,6vw,44px)", fontWeight:900, color:AC }}>{fmt(product.prix)}</span>
          {product.prix_barre && (
            <span style={{ fontSize:"clamp(16px,3vw,22px)", color:`${TX}55`, textDecoration:"line-through" }}>{fmt(product.prix_barre)}</span>
          )}
          {product.prix_barre && (
            <span style={{ background:`${AC}22`, color:AC, borderRadius:20, padding:"4px 12px", fontSize:13, fontWeight:700 }}>
              -{Math.round((1 - product.prix/product.prix_barre)*100)}%
            </span>
          )}
        </div>

        {/* Galerie images */}
        {allImages.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ borderRadius:20, overflow:"hidden", aspectRatio:"4/3", background:"#16161F", position:"relative", marginBottom:8 }}>
              <img src={allImages[mainImg]} alt={product.nom} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              {allImages.length > 1 && (
                <>
                  <button onClick={() => setMainImg(i => (i-1+allImages.length)%allImages.length)}
                    style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.6)", border:"none", borderRadius:"50%", width:40, height:40, color:"#fff", fontSize:18, cursor:"pointer" }}>‹</button>
                  <button onClick={() => setMainImg(i => (i+1)%allImages.length)}
                    style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,0.6)", border:"none", borderRadius:"50%", width:40, height:40, color:"#fff", fontSize:18, cursor:"pointer" }}>›</button>
                </>
              )}
            </div>
            {allImages.length > 1 && (
              <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
                {allImages.map((img, i) => (
                  <img key={i} src={img} alt="" onClick={() => setMainImg(i)}
                    style={{ width:64, height:64, borderRadius:10, objectFit:"cover", cursor:"pointer", flexShrink:0, border:`2px solid ${mainImg===i?AC:"transparent"}`, opacity:mainImg===i?1:0.6 }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CTA principal */}
        <button className="btn-cta" onClick={() => { setStep("form"); setTimeout(() => orderRef.current?.scrollIntoView({behavior:"smooth"}),100) }}
          style={{ width:"100%", background:`linear-gradient(135deg,${AC},${AC}cc)`, border:"none", borderRadius:16, padding:"18px", color:"#000", fontSize:17, fontWeight:900, cursor:"pointer", marginBottom:12 }}>
          🛒 {product.hero_cta_texte || "Commander maintenant"}
        </button>
        <p style={{ textAlign:"center", color:`${TX}66`, fontSize:13, marginBottom:32 }}>✅ Paiement à la livraison &nbsp;·&nbsp; 🚚 Livraison rapide</p>

        {/* Description */}
        {product.description && (
          <div style={{ background:`rgba(255,255,255,0.04)`, borderRadius:16, padding:"16px 20px", marginBottom:32, borderLeft:`3px solid ${AC}` }}>
            <p style={{ color:`${TX}cc`, fontSize:15, lineHeight:1.7 }}>{product.description}</p>
          </div>
        )}

        {/* ── Section Problème ── */}
        {product.section_probleme_active && product.section_probleme_items.length > 0 && (
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:"clamp(20px,4vw,28px)", fontWeight:800, marginBottom:20, textAlign:"center" }}>{product.section_probleme_titre}</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {product.section_probleme_items.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:14, alignItems:"center", background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:14, padding:"14px 16px" }}>
                  <span style={{ fontSize:24, flexShrink:0 }}>{item.emoji}</span>
                  <p style={{ color:`${TX}cc`, fontSize:15, lineHeight:1.5 }}>{item.texte}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section Bénéfices ── */}
        {product.section_benefices_active && product.section_benefices_items.length > 0 && (
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:"clamp(20px,4vw,28px)", fontWeight:800, marginBottom:20, textAlign:"center" }}>{product.section_benefices_titre}</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {product.section_benefices_items.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:16, alignItems:"flex-start", background:`${AC}0d`, border:`1px solid ${AC}25`, borderRadius:16, padding:"16px 18px" }}>
                  <span style={{ fontSize:28, flexShrink:0 }}>{item.emoji}</span>
                  <div>
                    <p style={{ color:TX, fontSize:15, fontWeight:700, marginBottom:4 }}>{item.titre}</p>
                    <p style={{ color:`${TX}88`, fontSize:14, lineHeight:1.6 }}>{item.texte}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section Mode d'emploi ── */}
        {product.section_utilisation_active && product.section_utilisation_items.length > 0 && (
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:"clamp(20px,4vw,28px)", fontWeight:800, marginBottom:20, textAlign:"center" }}>{product.section_utilisation_titre}</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {product.section_utilisation_items.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:16, alignItems:"flex-start", padding:"14px 0", borderBottom:`1px solid rgba(255,255,255,0.06)` }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:AC, color:"#000", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, flexShrink:0 }}>{i+1}</div>
                  <div>
                    <p style={{ color:TX, fontSize:15, fontWeight:700, marginBottom:4 }}>{item.titre}</p>
                    <p style={{ color:`${TX}88`, fontSize:14, lineHeight:1.6 }}>{item.texte}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section Composition ── */}
        {product.section_composition_active && product.section_composition_items.length > 0 && (
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:"clamp(20px,4vw,28px)", fontWeight:800, marginBottom:20, textAlign:"center" }}>{product.section_composition_titre}</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {product.section_composition_items.map((item, i) => (
                <div key={i} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"14px 16px" }}>
                  <p style={{ color:AC, fontSize:14, fontWeight:700, marginBottom:4 }}>{item.nom}</p>
                  <p style={{ color:`${TX}88`, fontSize:13, lineHeight:1.5 }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA milieu page */}
        <button className="btn-cta" onClick={() => { setStep("form"); setTimeout(() => orderRef.current?.scrollIntoView({behavior:"smooth"}),100) }}
          style={{ width:"100%", background:`linear-gradient(135deg,${AC},${AC}cc)`, border:"none", borderRadius:16, padding:"18px", color:"#000", fontSize:17, fontWeight:900, cursor:"pointer", marginBottom:40 }}>
          🛒 {product.hero_cta_texte || "Commander maintenant"}
        </button>

        {/* ── Section Témoignages ── */}
        {product.section_temoignages_active && product.section_temoignages_items.length > 0 && (
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:"clamp(20px,4vw,28px)", fontWeight:800, marginBottom:20, textAlign:"center" }}>{product.section_temoignages_titre}</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {product.section_temoignages_items.map((item, i) => (
                <div key={i} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"18px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div>
                      <p style={{ color:TX, fontSize:14, fontWeight:700 }}>{item.nom}</p>
                      <p style={{ color:`${TX}55`, fontSize:12 }}>{item.ville}</p>
                    </div>
                    <span style={{ fontSize:14 }}>{stars(item.note)}</span>
                  </div>
                  <p style={{ color:`${TX}cc`, fontSize:14, lineHeight:1.6, fontStyle:"italic" }}>"{item.texte}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section Comparaison ── */}
        {product.section_comparaison_active && product.section_comparaison_items.length > 0 && (
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:"clamp(20px,4vw,28px)", fontWeight:800, marginBottom:20, textAlign:"center" }}>{product.section_comparaison_titre}</h2>
            <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", background:"rgba(255,255,255,0.06)", padding:"12px 16px" }}>
                <p style={{ color:`${TX}88`, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>Critère</p>
                <p style={{ color:AC, fontSize:12, fontWeight:700, textAlign:"center", minWidth:80 }}>{tenant.name}</p>
                <p style={{ color:`${TX}55`, fontSize:12, fontWeight:700, textAlign:"center", minWidth:80 }}>Autres</p>
              </div>
              {product.section_comparaison_items.map((item, i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.06)", background:i%2===0?"transparent":"rgba(255,255,255,0.02)" }}>
                  <p style={{ color:`${TX}cc`, fontSize:14 }}>{item.critere}</p>
                  <p style={{ textAlign:"center", minWidth:80, fontSize:18 }}>{item.nous ? "✅" : "❌"}</p>
                  <p style={{ textAlign:"center", minWidth:80, fontSize:18 }}>{item.concurrent ? "✅" : "❌"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section Garantie ── */}
        {product.section_garantie_active && (
          <div style={{ background:`${AC}0d`, border:`2px solid ${AC}33`, borderRadius:20, padding:"20px", textAlign:"center", marginBottom:40 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>{product.section_garantie_icone}</div>
            <p style={{ color:TX, fontSize:17, fontWeight:800 }}>{product.section_garantie_texte}</p>
          </div>
        )}

        {/* ── Section FAQ ── */}
        {product.section_faq_active && product.section_faq_items.length > 0 && (
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:"clamp(20px,4vw,28px)", fontWeight:800, marginBottom:20, textAlign:"center" }}>{product.section_faq_titre}</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {product.section_faq_items.map((item, i) => (
                <div key={i} style={{ border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, overflow:"hidden" }}>
                  <button onClick={() => setFaqOpen(faqOpen===i?null:i)}
                    style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 18px", background:"rgba(255,255,255,0.04)", border:"none", color:TX, fontSize:15, fontWeight:600, cursor:"pointer", textAlign:"left", gap:12 }}>
                    <span>{item.question}</span>
                    <span style={{ color:AC, fontSize:20, flexShrink:0 }}>{faqOpen===i?"−":"+"}</span>
                  </button>
                  {faqOpen===i && (
                    <div style={{ padding:"14px 18px", background:"rgba(255,255,255,0.02)" }}>
                      <p style={{ color:`${TX}99`, fontSize:14, lineHeight:1.7 }}>{item.reponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Formulaire de commande ── */}
        <div ref={orderRef} style={{ marginBottom:40 }}>
          {step === "page" || step === "form" ? (
            <div style={{ background:"rgba(255,255,255,0.04)", border:`2px solid ${AC}44`, borderRadius:24, padding:"24px 20px" }}>
              <h2 style={{ fontSize:"clamp(18px,4vw,26px)", fontWeight:900, textAlign:"center", marginBottom:6 }}>🛒 Commander maintenant</h2>
              <p style={{ textAlign:"center", color:`${TX}66`, fontSize:13, marginBottom:24 }}>Paiement à la livraison • Livraison rapide</p>

              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ display:"block", color:`${TX}88`, fontSize:13, fontWeight:500, marginBottom:8 }}>Prénom et nom *</label>
                  <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} style={inpStyle} placeholder="Ex: Kofi Mensah" />
                </div>
                <div>
                  <label style={{ display:"block", color:`${TX}88`, fontSize:13, fontWeight:500, marginBottom:8 }}>Téléphone WhatsApp *</label>
                  <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} style={inpStyle} placeholder="+228 90 00 00 00" type="tel" />
                </div>
                <div>
                  <label style={{ display:"block", color:`${TX}88`, fontSize:13, fontWeight:500, marginBottom:8 }}>Ville *</label>
                  <input value={form.city} onChange={e => setForm(f=>({...f,city:e.target.value}))} style={inpStyle} placeholder="Ex: Lomé, Abidjan, Dakar..." />
                </div>
                <div>
                  <label style={{ display:"block", color:`${TX}88`, fontSize:13, fontWeight:500, marginBottom:8 }}>Adresse / Quartier</label>
                  <input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} style={inpStyle} placeholder="Ex: Adidogomé, carrefour Shell" />
                </div>
                <div>
                  <label style={{ display:"block", color:`${TX}88`, fontSize:13, fontWeight:500, marginBottom:8 }}>Note (optionnel)</label>
                  <textarea value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))} style={{...inpStyle,resize:"none",height:70}} placeholder="Instructions spéciales..." />
                </div>

                <div style={{ background:`${AC}0d`, border:`1px solid ${AC}33`, borderRadius:14, padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ color:`${TX}88`, fontSize:14 }}>{product.nom}</span>
                    <span style={{ color:TX, fontSize:14, fontWeight:700 }}>{fmt(product.prix)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ color:`${TX}88`, fontSize:14 }}>Livraison</span>
                    <span style={{ color:"#4ADE80", fontSize:14, fontWeight:700 }}>Gratuite</span>
                  </div>
                  <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)", marginTop:10, paddingTop:10, display:"flex", justifyContent:"space-between" }}>
                    <span style={{ color:TX, fontSize:15, fontWeight:700 }}>Total</span>
                    <span style={{ color:AC, fontSize:20, fontWeight:900 }}>{fmt(product.prix)}</span>
                  </div>
                </div>

                {error && <p style={{ color:"#F87171", fontSize:13, textAlign:"center" }}>⚠️ {error}</p>}

                <button className="btn-cta" onClick={handleOrder} disabled={submitting}
                  style={{ width:"100%", background:submitting?`${AC}88`:`linear-gradient(135deg,${AC},${AC}cc)`, border:"none", borderRadius:16, padding:"18px", color:"#000", fontSize:17, fontWeight:900, cursor:submitting?"not-allowed":"pointer" }}>
                  {submitting ? "Envoi en cours..." : `✅ Confirmer ma commande • ${fmt(product.prix)}`}
                </button>
                <p style={{ textAlign:"center", color:`${TX}55`, fontSize:12 }}>🔒 Vos données sont sécurisées</p>
              </div>
            </div>
          ) : (
            <div style={{ background:"rgba(74,222,128,0.06)", border:"2px solid rgba(74,222,128,0.3)", borderRadius:24, padding:"32px 20px", textAlign:"center" }}>
              <div style={{ fontSize:60, marginBottom:12 }}>✅</div>
              <h2 style={{ color:TX, fontSize:22, fontWeight:800, marginBottom:8 }}>Commande confirmée !</h2>
              <p style={{ color:`${TX}88`, fontSize:14, lineHeight:1.6, marginBottom:16 }}>
                Merci <strong style={{color:TX}}>{form.name}</strong> !<br/>
                Notre équipe vous appellera bientôt au <strong style={{color:TX}}>{form.phone}</strong>.
              </p>
              <div style={{ background:`${AC}11`, border:`1px solid ${AC}33`, borderRadius:12, padding:"12px 16px", marginBottom:20 }}>
                <p style={{ color:`${TX}66`, fontSize:11, marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Numéro de commande</p>
                <p style={{ color:AC, fontSize:20, fontWeight:900 }}>{orderNumber}</p>
              </div>
              {tenant.phone && (
                <a href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g,"")}?text=Bonjour+j'ai+commandé+${encodeURIComponent(product.nom)}`}
                  style={{ display:"inline-block", background:"#25D366", borderRadius:14, padding:"14px 24px", color:"#fff", fontSize:15, fontWeight:700, textDecoration:"none" }}>
                  💬 Contacter sur WhatsApp
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"20px 0", textAlign:"center" }}>
          <p style={{ color:`${TX}44`, fontSize:12 }}>
            Propulsé par <a href="https://shipivo.app" style={{ color:AC, textDecoration:"none", fontWeight:600 }}>Shipivo</a>
          </p>
        </div>
      </div>
    </div>
  )
}
