"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/app/lib/supabase"
import { useParams, useSearchParams } from "next/navigation"

// ─── Types ───────────────────────────────────────────────
type SectionItem = {
  id: string
  type: "probleme"|"benefices"|"temoignages"|"faq"|"garantie"|"composition"|"utilisation"|"comparaison"|"formulaire"|"description"|"galerie"
  active: boolean
  ordre: number
}

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
  sections_ordre?: string // JSON array of section ids in order
  vues?: number; commandes?: number; tenant_id: string
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
  const formRef = useRef<HTMLDivElement>(null)

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
    }
    load()
  }, [boutique, slug])

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
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:44,height:44,border:"3px solid #1E1E2E",borderTopColor:"#F59E0B",borderRadius:"50%",animation:"spin 0.7s linear infinite" }} />
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
  const FT = product.font || "Poppins"
  const allImages = [product.image_principale, ...(product.images||[])].filter(Boolean)
  const fmt = (n:number) => `${n.toLocaleString("fr-FR")} ${product.devise||tenant.currency||"FCFA"}`
  const stars = (n:number) => Array.from({length:5},(_,i)=>i<n?"⭐":"☆").join("")

  // Ordre des sections
  let sectionsOrdre: string[] = []
  try {
    sectionsOrdre = product.sections_ordre ? JSON.parse(product.sections_ordre) : []
  } catch { sectionsOrdre = [] }

  const defaultOrdre = ["galerie","description","probleme","benefices","utilisation","composition","temoignages","comparaison","faq","garantie","formulaire"]
  const finalOrdre = sectionsOrdre.length > 0 ? sectionsOrdre : defaultOrdre

  const inp: React.CSSProperties = {
    width:"100%", background:"rgba(255,255,255,0.06)",
    border:"1px solid rgba(255,255,255,0.15)", borderRadius:14,
    padding:"15px 16px", color:TX, fontSize:15, outline:"none",
    boxSizing:"border-box", fontFamily:FT, transition:"border-color 0.2s"
  }

  // ── Rendu des sections ──
  const renderSection = (key: string) => {
    switch(key) {

      case "galerie":
        if (allImages.length === 0) return null
        return (
          <div key="galerie" style={{ marginBottom:24 }}>
            {/* Image principale */}
            <div style={{ borderRadius:20, overflow:"hidden", background:"#111118", position:"relative", marginBottom:10 }}
              onTouchStart={e => setTouchStart(e.touches[0].clientX)}
              onTouchEnd={e => {
                const diff = touchStart - e.changedTouches[0].clientX
                if (Math.abs(diff) > 50) setMainImg(i => diff > 0 ? Math.min(i+1, allImages.length-1) : Math.max(i-1, 0))
              }}>
              <img src={allImages[mainImg]} alt={product.nom}
                style={{ width:"100%", aspectRatio:"4/3", objectFit:"cover", display:"block" }} />
              {allImages.length > 1 && (
                <>
                  <button onClick={()=>setMainImg(i=>Math.max(0,i-1))}
                    style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
                  <button onClick={()=>setMainImg(i=>Math.min(allImages.length-1,i+1))}
                    style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
                  <div style={{ position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6 }}>
                    {allImages.map((_,i)=>(
                      <div key={i} onClick={()=>setMainImg(i)} style={{ width:i===mainImg?20:8,height:8,borderRadius:4,background:i===mainImg?AC:"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all 0.3s" }} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* Miniatures */}
            {allImages.length > 1 && (
              <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none" }}>
                {allImages.map((img,i)=>(
                  <img key={i} src={img} alt="" onClick={()=>setMainImg(i)}
                    style={{ width:72,height:72,borderRadius:12,objectFit:"cover",flexShrink:0,cursor:"pointer",border:`2.5px solid ${mainImg===i?AC:"transparent"}`,opacity:mainImg===i?1:0.6,transition:"all 0.2s" }} />
                ))}
              </div>
            )}
          </div>
        )

      case "description":
        if (!product.description) return null
        return (
          <div key="description" style={{ marginBottom:32, background:`rgba(255,255,255,0.03)`, borderRadius:16, padding:"18px 20px", borderLeft:`3px solid ${AC}` }}>
            <p style={{ color:`${TX}cc`,fontSize:15,lineHeight:1.8,whiteSpace:"pre-wrap" }}>{product.description}</p>
          </div>
        )

      case "probleme":
        if (!product.section_probleme_active || !product.section_probleme_items?.length) return null
        return (
          <div key="probleme" style={{ marginBottom:36 }}>
            <h2 style={{ fontSize:"clamp(20px,5vw,28px)",fontWeight:900,marginBottom:20,textAlign:"center",color:TX }}>{product.section_probleme_titre}</h2>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {product.section_probleme_items.map((item,i)=>(
                <div key={i} style={{ display:"flex",gap:14,alignItems:"flex-start",background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:14,padding:"14px 16px" }}>
                  <span style={{ fontSize:26,flexShrink:0,marginTop:2 }}>{item.emoji}</span>
                  <p style={{ color:`${TX}cc`,fontSize:15,lineHeight:1.6,margin:0 }}>{item.texte}</p>
                </div>
              ))}
            </div>
          </div>
        )

      case "benefices":
        if (!product.section_benefices_active || !product.section_benefices_items?.length) return null
        return (
          <div key="benefices" style={{ marginBottom:36 }}>
            <h2 style={{ fontSize:"clamp(20px,5vw,28px)",fontWeight:900,marginBottom:20,textAlign:"center",color:TX }}>{product.section_benefices_titre}</h2>
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {product.section_benefices_items.map((item,i)=>(
                <div key={i} style={{ display:"flex",gap:16,alignItems:"flex-start",background:`${AC}0d`,border:`1px solid ${AC}22`,borderRadius:16,padding:"16px 18px" }}>
                  <span style={{ fontSize:30,flexShrink:0 }}>{item.emoji}</span>
                  <div>
                    <p style={{ color:TX,fontSize:15,fontWeight:700,marginBottom:4 }}>{item.titre}</p>
                    <p style={{ color:`${TX}88`,fontSize:14,lineHeight:1.6,margin:0 }}>{item.texte}</p>
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
            <h2 style={{ fontSize:"clamp(20px,5vw,28px)",fontWeight:900,marginBottom:20,textAlign:"center",color:TX }}>{product.section_utilisation_titre}</h2>
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute",left:18,top:0,bottom:0,width:2,background:`${AC}30` }} />
              {product.section_utilisation_items.map((item,i)=>(
                <div key={i} style={{ display:"flex",gap:16,alignItems:"flex-start",paddingBottom:24,position:"relative" }}>
                  <div style={{ width:38,height:38,borderRadius:"50%",background:AC,color:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,flexShrink:0,zIndex:1,boxShadow:`0 0 0 4px ${BG}` }}>{i+1}</div>
                  <div style={{ paddingTop:8 }}>
                    <p style={{ color:TX,fontSize:15,fontWeight:700,marginBottom:4 }}>{item.titre}</p>
                    <p style={{ color:`${TX}88`,fontSize:14,lineHeight:1.6,margin:0 }}>{item.texte}</p>
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
            <h2 style={{ fontSize:"clamp(20px,5vw,28px)",fontWeight:900,marginBottom:20,textAlign:"center",color:TX }}>{product.section_composition_titre}</h2>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              {product.section_composition_items.map((item,i)=>(
                <div key={i} style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px" }}>
                  <p style={{ color:AC,fontSize:13,fontWeight:700,marginBottom:4 }}>{item.nom}</p>
                  <p style={{ color:`${TX}77`,fontSize:12,lineHeight:1.5,margin:0 }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )

      case "temoignages":
        if (!product.section_temoignages_active || !product.section_temoignages_items?.length) return null
        return (
          <div key="temoignages" style={{ marginBottom:36 }}>
            <h2 style={{ fontSize:"clamp(20px,5vw,28px)",fontWeight:900,marginBottom:20,textAlign:"center",color:TX }}>{product.section_temoignages_titre}</h2>
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              {product.section_temoignages_items.map((item,i)=>(
                <div key={i} style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:"18px 16px" }}>
                  <div style={{ display:"flex",gap:12,alignItems:"center",marginBottom:12 }}>
                    {item.photo ? (
                      <img src={item.photo} alt={item.nom} style={{ width:48,height:48,borderRadius:"50%",objectFit:"cover",flexShrink:0 }} />
                    ) : (
                      <div style={{ width:48,height:48,borderRadius:"50%",background:`${AC}22`,color:AC,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,flexShrink:0 }}>
                        {item.nom.charAt(0)}
                      </div>
                    )}
                    <div style={{ flex:1 }}>
                      <p style={{ color:TX,fontSize:14,fontWeight:700,margin:"0 0 2px" }}>{item.nom}</p>
                      <p style={{ color:`${TX}55`,fontSize:12,margin:0 }}>📍 {item.ville}</p>
                    </div>
                    <span style={{ fontSize:14 }}>{stars(item.note)}</span>
                  </div>
                  <p style={{ color:`${TX}cc`,fontSize:14,lineHeight:1.7,fontStyle:"italic",margin:0,borderLeft:`3px solid ${AC}`,paddingLeft:12 }}>"{item.texte}"</p>
                </div>
              ))}
            </div>
          </div>
        )

      case "comparaison":
        if (!product.section_comparaison_active || !product.section_comparaison_items?.length) return null
        return (
          <div key="comparaison" style={{ marginBottom:36 }}>
            <h2 style={{ fontSize:"clamp(20px,5vw,28px)",fontWeight:900,marginBottom:20,textAlign:"center",color:TX }}>{product.section_comparaison_titre}</h2>
            <div style={{ borderRadius:18,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr auto auto",background:"rgba(255,255,255,0.06)",padding:"12px 16px" }}>
                <span style={{ color:`${TX}66`,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1 }}>Critère</span>
                <span style={{ color:AC,fontSize:12,fontWeight:700,textAlign:"center",minWidth:80 }}>{tenant.name}</span>
                <span style={{ color:`${TX}44`,fontSize:12,fontWeight:700,textAlign:"center",minWidth:80 }}>Autres</span>
              </div>
              {product.section_comparaison_items.map((item,i)=>(
                <div key={i} style={{ display:"grid",gridTemplateColumns:"1fr auto auto",padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.05)",background:i%2===0?"transparent":"rgba(255,255,255,0.02)" }}>
                  <span style={{ color:`${TX}cc`,fontSize:14 }}>{item.critere}</span>
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
            <h2 style={{ fontSize:"clamp(20px,5vw,28px)",fontWeight:900,marginBottom:20,textAlign:"center",color:TX }}>{product.section_faq_titre}</h2>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {product.section_faq_items.map((item,i)=>(
                <div key={i} style={{ border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,overflow:"hidden" }}>
                  <button onClick={()=>setFaqOpen(faqOpen===i?null:i)}
                    style={{ width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",background:faqOpen===i?`${AC}0d`:"rgba(255,255,255,0.03)",border:"none",color:TX,fontSize:15,fontWeight:600,cursor:"pointer",textAlign:"left",gap:12 }}>
                    <span>{item.question}</span>
                    <span style={{ color:AC,fontSize:22,flexShrink:0,transition:"transform 0.3s",transform:faqOpen===i?"rotate(45deg)":"rotate(0)" }}>+</span>
                  </button>
                  {faqOpen===i && (
                    <div style={{ padding:"14px 18px 18px",borderTop:`1px solid rgba(255,255,255,0.06)` }}>
                      <p style={{ color:`${TX}99`,fontSize:14,lineHeight:1.8,margin:0 }}>{item.reponse}</p>
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
          <div key="garantie" style={{ background:`${AC}0d`,border:`2px solid ${AC}33`,borderRadius:22,padding:"22px 20px",textAlign:"center",marginBottom:36 }}>
            <div style={{ fontSize:44,marginBottom:10 }}>{product.section_garantie_icone}</div>
            <p style={{ color:TX,fontSize:17,fontWeight:800,margin:0 }}>{product.section_garantie_texte}</p>
          </div>
        )

      case "formulaire":
        return (
          <div key="formulaire" ref={formRef} style={{ marginBottom:40 }}>
            {submitted ? (
              <div style={{ background:"rgba(74,222,128,0.07)",border:"2px solid rgba(74,222,128,0.25)",borderRadius:24,padding:"36px 20px",textAlign:"center" }}>
                <div style={{ fontSize:64,marginBottom:16 }}>✅</div>
                <h2 style={{ color:TX,fontSize:24,fontWeight:900,marginBottom:8 }}>Commande confirmée !</h2>
                <p style={{ color:`${TX}88`,fontSize:15,lineHeight:1.7,marginBottom:20 }}>
                  Merci <strong style={{color:TX}}>{form.name}</strong> !<br/>
                  Notre équipe vous rappellera au <strong style={{color:TX}}>{form.phone}</strong>.
                </p>
                <div style={{ background:`${AC}11`,border:`1px solid ${AC}33`,borderRadius:14,padding:"14px 20px",display:"inline-block" }}>
                  <p style={{ color:`${TX}55`,fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:4 }}>Numéro de commande</p>
                  <p style={{ color:AC,fontSize:22,fontWeight:900,margin:0,letterSpacing:2 }}>{orderNum}</p>
                </div>
                {tenant.phone && (
                  <a href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g,"")}?text=Bonjour+j'ai+commandé+${encodeURIComponent(product.nom)}`}
                    style={{ display:"block",marginTop:20,background:"#25D366",borderRadius:14,padding:"14px",color:"#fff",fontSize:15,fontWeight:700,textDecoration:"none" }}>
                    💬 Contacter sur WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <div style={{ background:"rgba(255,255,255,0.04)",border:`2px solid ${AC}33`,borderRadius:24,padding:"24px 20px" }}>
                <h2 style={{ fontSize:"clamp(18px,4vw,24px)",fontWeight:900,textAlign:"center",marginBottom:6,color:TX }}>🛒 Commander maintenant</h2>
                <p style={{ textAlign:"center",color:`${TX}55`,fontSize:13,marginBottom:24 }}>Paiement à la livraison · Livraison rapide</p>

                <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                  {[
                    {label:"Prénom et nom *",value:form.name,key:"name",placeholder:"Ex: Kofi Mensah"},
                    {label:"Téléphone WhatsApp *",value:form.phone,key:"phone",placeholder:"+228 90 00 00 00",type:"tel"},
                    {label:"Ville *",value:form.city,key:"city",placeholder:"Ex: Lomé, Dakar, Abidjan..."},
                    {label:"Adresse / Quartier",value:form.address,key:"address",placeholder:"Ex: Adidogomé, carrefour Shell"},
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display:"block",color:`${TX}77`,fontSize:13,fontWeight:500,marginBottom:8 }}>{f.label}</label>
                      <input value={f.value} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                        type={f.type||"text"} placeholder={f.placeholder} style={inp} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display:"block",color:`${TX}77`,fontSize:13,fontWeight:500,marginBottom:8 }}>Note (optionnel)</label>
                    <textarea value={form.note} onChange={e => setForm(p=>({...p,note:e.target.value}))}
                      placeholder="Instructions spéciales..." style={{...inp,resize:"none",height:70}} />
                  </div>

                  {/* Récap commande */}
                  <div style={{ background:`${AC}0d`,border:`1px solid ${AC}25`,borderRadius:14,padding:"16px" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                      <span style={{ color:`${TX}77`,fontSize:14 }}>{product.nom}</span>
                      <span style={{ color:TX,fontSize:14,fontWeight:700 }}>{fmt(product.prix)}</span>
                    </div>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                      <span style={{ color:`${TX}77`,fontSize:14 }}>Livraison</span>
                      <span style={{ color:"#4ADE80",fontSize:14,fontWeight:700 }}>Gratuite</span>
                    </div>
                    <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:10,display:"flex",justifyContent:"space-between" }}>
                      <span style={{ color:TX,fontSize:15,fontWeight:800 }}>Total</span>
                      <span style={{ color:AC,fontSize:22,fontWeight:900 }}>{fmt(product.prix)}</span>
                    </div>
                  </div>

                  {error && <p style={{ color:"#F87171",fontSize:13,textAlign:"center",margin:0 }}>⚠️ {error}</p>}

                  <button onClick={handleOrder} disabled={submitting}
                    style={{ width:"100%",background:submitting?`${AC}66`:`linear-gradient(135deg,${AC},${AC}cc)`,border:"none",borderRadius:16,padding:"18px",color:"#000",fontSize:17,fontWeight:900,cursor:submitting?"not-allowed":"pointer",boxShadow:`0 8px 32px ${AC}44`,transition:"all 0.2s" }}>
                    {submitting ? "Envoi en cours..." : `✅ ${product.hero_cta_texte||"Commander maintenant"} · ${fmt(product.prix)}`}
                  </button>
                  <p style={{ textAlign:"center",color:`${TX}44`,fontSize:12,margin:0 }}>🔒 Paiement sécurisé · Satisfait ou remboursé</p>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ minHeight:"100vh",background:BG,color:TX,fontFamily:`'${FT}',Inter,sans-serif` }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${FT.replace(/ /g,"+")}:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:${AC}44;border-radius:2px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .hero-animate{animation:fadeUp 0.7s ease forwards;}
        input:focus,textarea:focus{border-color:${AC}!important;box-shadow:0 0 0 3px ${AC}22!important;}
      `}</style>

      {/* ── Compte à rebours ── */}
      {countdown.active && (
        <div style={{ background:`linear-gradient(90deg,${AC}22,${AC}11)`,borderBottom:`2px solid ${AC}55`,padding:"10px 16px",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:12,flexWrap:"wrap" }}>
          <span style={{ color:AC,fontSize:13,fontWeight:700 }}>⏰ {product.countdown_texte}</span>
          {[countdown.h,countdown.m,countdown.s].map((v,i)=>(
            <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:4 }}>
              <span style={{ background:AC,color:"#000",borderRadius:10,padding:"5px 12px",fontSize:20,fontWeight:900,fontVariantNumeric:"tabular-nums" }}>{v}</span>
              {i<2 && <span style={{ color:AC,fontWeight:900,fontSize:18 }}>:</span>}
            </span>
          ))}
        </div>
      )}

      {/* ── HERO ── */}
      <div style={{ background:`linear-gradient(180deg,${BG} 0%,${BG}ee 100%)`,padding:"28px 16px 0" }}>
        <div style={{ maxWidth:640,margin:"0 auto" }}>

          {/* Badge */}
          {product.badge && (
            <div className="hero-animate" style={{ display:"inline-block",background:product.badge==="PROMO"?"#EF4444":product.badge==="NOUVEAU"?"#8B5CF6":product.badge==="BEST-SELLER"?AC:"#3B82F6",color:"#fff",borderRadius:8,padding:"4px 14px",fontSize:11,fontWeight:800,letterSpacing:1.5,marginBottom:12,textTransform:"uppercase" }}>
              {product.badge}
            </div>
          )}

          {/* Titre */}
          <h1 className="hero-animate" style={{ fontSize:"clamp(26px,6vw,44px)",fontWeight:900,lineHeight:1.15,marginBottom:12,color:TX,letterSpacing:-0.5 }}>
            {product.hero_titre || product.nom}
          </h1>

          {product.hero_sous_titre && (
            <p className="hero-animate" style={{ fontSize:"clamp(14px,3.5vw,18px)",color:`${TX}88`,lineHeight:1.7,marginBottom:20 }}>
              {product.hero_sous_titre}
            </p>
          )}

          {/* Prix */}
          <div className="hero-animate" style={{ display:"flex",alignItems:"center",gap:14,marginBottom:24,flexWrap:"wrap" }}>
            <span style={{ fontSize:"clamp(32px,7vw,52px)",fontWeight:900,color:AC,letterSpacing:-1 }}>{fmt(product.prix)}</span>
            {product.prix_barre && (
              <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
                <span style={{ fontSize:"clamp(16px,3.5vw,24px)",color:`${TX}44`,textDecoration:"line-through" }}>{fmt(product.prix_barre)}</span>
                <span style={{ background:`${AC}22`,color:AC,borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:800,textAlign:"center" }}>
                  -{Math.round((1-product.prix/product.prix_barre)*100)}%
                </span>
              </div>
            )}
          </div>

          {/* CTA principal */}
          <button className="hero-animate" onClick={scrollToForm}
            style={{ width:"100%",background:`linear-gradient(135deg,${AC},${AC}cc)`,border:"none",borderRadius:18,padding:"20px",color:"#000",fontSize:18,fontWeight:900,cursor:"pointer",marginBottom:12,boxShadow:`0 12px 40px ${AC}55`,letterSpacing:-0.3 }}>
            🛒 {product.hero_cta_texte || "Commander maintenant"}
          </button>
          <p style={{ textAlign:"center",color:`${TX}44`,fontSize:12,marginBottom:32 }}>
            ✅ Paiement à la livraison &nbsp;·&nbsp; 🚚 Livraison rapide &nbsp;·&nbsp; 🔒 100% sécurisé
          </p>

        </div>
      </div>

      {/* ── Corps de la page — sections dans l'ordre ── */}
      <div style={{ maxWidth:640,margin:"0 auto",padding:"0 16px" }}>
        {finalOrdre.map(key => renderSection(key))}

        {/* CTA final */}
        {!submitted && (
          <button onClick={scrollToForm}
            style={{ width:"100%",background:`linear-gradient(135deg,${AC},${AC}cc)`,border:"none",borderRadius:18,padding:"20px",color:"#000",fontSize:18,fontWeight:900,cursor:"pointer",marginBottom:32,boxShadow:`0 8px 32px ${AC}44` }}>
            🛒 {product.hero_cta_texte || "Commander maintenant"}
          </button>
        )}

        {/* Footer */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)",padding:"20px 0 32px",textAlign:"center" }}>
          <p style={{ color:`${TX}33`,fontSize:12 }}>
            Propulsé par{" "}
            <a href="https://shipivo.app" style={{ color:AC,textDecoration:"none",fontWeight:700 }}>Shipivo</a>
          </p>
        </div>
      </div>
    </div>
  )
}
