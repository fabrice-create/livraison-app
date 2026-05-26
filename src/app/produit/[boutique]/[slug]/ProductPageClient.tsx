"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"
import { useParams, useSearchParams } from "next/navigation"

type PageContent = {
  hero_titre: string; hero_sous_titre: string; hero_cta: string
  hero_badges: string[]; bandeau: string[]
  images: string[]
  chiffres: { valeur: string; label: string }[]
  problemes_titre: string; problemes_sous_titre: string
  problemes: { emoji: string; titre: string; texte: string }[]
  danger_titre: string; danger_sous_titre: string
  dangers: { titre: string; texte: string }[]
  danger_cta_texte: string
  solution_titre: string; solution_sous_titre: string
  ingredients: { emoji: string; nom: string; dosage: string; description: string; tag: string }[]
  whatsapp_actif: boolean; whatsapp_nom: string; whatsapp_photo: string
  whatsapp_messages: { auteur: "client"|"vendeur"; texte: string }[]
  presse_actif: boolean; presse_titre: string; presse_logos: string[]
  temoignages: { nom: string; ville: string; texte: string; note: number; photo: string }[]
  garantie_texte: string; garantie_icone: string
  offres_actif?: boolean; offres_titre?: string
  offres?: { quantite: number; label: string; prix: number; populaire: boolean; badge: string }[]
  couleur: string; fond: string
}

type Product = {
  id: string; nom: string; slug: string; prix: number
  prix_barre: number|null; devise: string; badge: string
  is_active: boolean; image_principale: string
  page_content: string; tenant_id: string
  vues?: number; commandes?: number
}

type Tenant = {
  id: string; name: string; slug: string; phone: string
}

const defaultContent: PageContent = {
  hero_titre: "", hero_sous_titre: "", hero_cta: "Commander maintenant",
  hero_badges: [], bandeau: [], images: [], chiffres: [],
  problemes_titre: "", problemes_sous_titre: "", problemes: [],
  danger_titre: "", danger_sous_titre: "", dangers: [], danger_cta_texte: "",
  solution_titre: "", solution_sous_titre: "", ingredients: [],
  whatsapp_actif: false, whatsapp_nom: "", whatsapp_photo: "", whatsapp_messages: [],
  presse_actif: false, presse_titre: "", presse_logos: [],
  temoignages: [], garantie_texte: "", garantie_icone: "🛡️",
  couleur: "#F59E0B", fond: "#09090F"
}

export default function ProductPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const boutique = params?.boutique as string
  const slug = params?.slug as string

  const [product, setProduct] = useState<Product|null>(null)
  const [tenant, setTenant] = useState<Tenant|null>(null)
  const [content, setContent] = useState<PageContent>(defaultContent)
  const [loading, setLoading] = useState(true)
  const [mainImg, setMainImg] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [form, setForm] = useState({ name:"", phone:"", city:"", address:"", note:"" })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderNum, setOrderNum] = useState("")
  const [formError, setFormError] = useState("")
  const [selectedOffre, setSelectedOffre] = useState<number>(0)
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
        try { const pc = p.page_content ? JSON.parse(p.page_content) : null; setContent(pc ? { ...defaultContent, ...pc } : defaultContent) } catch { setContent(defaultContent) }
        await supabase.from("products").update({ vues: ((p.vues||0)+1) }).eq("id", p.id)
      }
      setLoading(false)
    }
    load()
  }, [boutique, slug])

  const handleOrder = async () => {
    if (!form.name.trim()) { setFormError("Ton prénom est requis"); return }
    if (!form.phone.trim()) { setFormError("Ton téléphone est requis"); return }
    if (!form.city.trim()) { setFormError("Ta ville est requise"); return }
    setSubmitting(true); setFormError("")
    const num = `CMD-${Date.now().toString(36).toUpperCase()}`
    const { error } = await supabase.from("orders").insert({
      tenant_id: tenant?.id, customer_name: form.name.trim(),
      phone: form.phone.trim(), city: form.city.trim(),
      address: form.address.trim(), note: form.note.trim(),
      product: product?.nom || (product as any)?.name, quantity: offreActive?.quantite || 1, amount: prixActif || product?.prix || (product as any)?.price,
      status: "En attente", delivery_type: "standard",
      source: searchParams?.get("src")||"page_produit",
      zone_nom: searchParams?.get("zone")||null,
    })
    if (error) { setFormError(error.message); setSubmitting(false); return }
    if (product) await supabase.from("products").update({ commandes:(product.commandes||0)+1 }).eq("id", product.id)
    setOrderNum(num); setSubmitted(true); setSubmitting(false)
  }

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#09090F",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:44,height:44,border:"3px solid #1E1E2E",borderTopColor:"#F59E0B",borderRadius:"50%",animation:"spin 0.7s linear infinite"}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!product || !tenant) return (
    <div style={{minHeight:"100vh",background:"#09090F",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui"}}>
      <p style={{color:"#9898B0"}}>Produit introuvable.</p>
    </div>
  )

  const AC = content.couleur || "#F59E0B"
  const BG = content.fond || "#09090F"
  const TX = "#F8F8FC"
  const allImages = [product.image_principale, ...(content.images||[])].filter(Boolean)
  const fmt = (n: number) => `${n.toLocaleString("fr-FR")} ${product.devise||"FCFA"}`
  const offres = content.offres || []
  const offreActive = offres.length > 0 && content.offres_actif ? offres[selectedOffre] : null
  const prixActif = offreActive ? offreActive.prix : product.prix

  const inp: React.CSSProperties = {
    width:"100%", background:"rgba(255,255,255,0.06)",
    border:"1px solid rgba(255,255,255,0.12)", borderRadius:12,
    padding:"14px 16px", color:TX, fontSize:15, outline:"none",
    boxSizing:"border-box", fontFamily:"inherit"
  }

  return (
    <div style={{minHeight:"100vh",background:BG,color:TX,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        .fade-up{animation:fadeUp 0.6s ease both;}
        input:focus,textarea:focus{border-color:${AC}!important;outline:none;}
      `}</style>

      {/* ── BANDEAU DÉFILANT ── */}
      {content.bandeau.length > 0 && (
        <div style={{background:AC,overflow:"hidden",padding:"9px 0"}}>
          <div style={{display:"flex",animation:"marquee 20s linear infinite",width:"max-content"}}>
            {[...content.bandeau,...content.bandeau].map((item,i)=>(
              <span key={i} style={{color:"#000",fontSize:12,fontWeight:700,padding:"0 32px",whiteSpace:"nowrap"}}>
                {item} &nbsp;·&nbsp;
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"clamp(24px,4vw,56px) 20px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:40,alignItems:"start"}}>

          {/* Galerie */}
          <div>
            {allImages.length > 0 ? (
              <>
                <div style={{borderRadius:20,overflow:"hidden",background:"#111118",position:"relative",marginBottom:12}}
                  onTouchStart={e=>setTouchStart(e.touches[0].clientX)}
                  onTouchEnd={e=>{const d=touchStart-e.changedTouches[0].clientX;if(Math.abs(d)>50)setMainImg(i=>d>0?Math.min(i+1,allImages.length-1):Math.max(i-1,0))}}>
                  <img src={allImages[mainImg]} alt={product.nom} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block"}} />
                  {allImages.length > 1 && (
                    <>
                      <button onClick={()=>setMainImg(i=>Math.max(0,i-1))} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:22,cursor:"pointer"}}>‹</button>
                      <button onClick={()=>setMainImg(i=>Math.min(allImages.length-1,i+1))} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:22,cursor:"pointer"}}>›</button>
                    </>
                  )}
                </div>
                {allImages.length > 1 && (
                  <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                    {allImages.map((img,i)=>(
                      <img key={i} src={img} alt="" onClick={()=>setMainImg(i)}
                        style={{width:70,height:70,borderRadius:10,objectFit:"cover",flexShrink:0,cursor:"pointer",border:`2.5px solid ${mainImg===i?AC:"transparent"}`,opacity:mainImg===i?1:0.55,transition:"all 0.2s"}} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{aspectRatio:"1/1",borderRadius:20,background:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:80}}>📦</div>
            )}
          </div>

          {/* Infos */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {product.badge && (
              <span style={{display:"inline-flex",alignItems:"center",gap:6,background:`${AC}20`,border:`1px solid ${AC}40`,borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:700,color:AC,letterSpacing:"0.9px",textTransform:"uppercase",width:"fit-content"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:AC,animation:"blink 1.2s infinite"}} />
                {product.badge}
              </span>
            )}

            <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(24px,4vw,42px)",fontWeight:900,lineHeight:1.15,color:TX,letterSpacing:"-0.5px"}}>
              {content.hero_titre || product.nom}
            </h1>

            {content.hero_sous_titre && (
              <p style={{fontSize:"clamp(14px,1.8vw,17px)",color:`${TX}88`,lineHeight:1.7}}>
                {content.hero_sous_titre}
              </p>
            )}

            {/* Prix */}
            <div style={{display:"flex",alignItems:"flex-end",gap:14,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(28px,5vw,48px)",fontWeight:900,color:AC,letterSpacing:"-1px"}}>
                {fmt(product.prix)}
              </span>
              {product.prix_barre && (
                <div style={{display:"flex",flexDirection:"column",gap:3,paddingBottom:4}}>
                  <span style={{fontSize:"clamp(14px,2vw,18px)",color:`${TX}35`,textDecoration:"line-through"}}>{fmt(product.prix_barre)}</span>
                  <span style={{background:`${AC}20`,border:`1px solid ${AC}35`,borderRadius:10,padding:"2px 9px",fontSize:11,fontWeight:800,color:AC,textAlign:"center"}}>
                    -{Math.round((1-product.prix/product.prix_barre)*100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Badges hero */}
            {content.hero_badges.length > 0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {content.hero_badges.map((badge,i)=>(
                  <span key={i} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"6px 12px",fontSize:12,color:`${TX}88`}}>{badge}</span>
                ))}
              </div>
            )}

            {/* CTA */}
            <button onClick={()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"})}
              style={{position:"relative",overflow:"hidden",background:`linear-gradient(135deg,${AC},${AC}CC)`,border:"none",borderRadius:14,padding:"18px 24px",color:"#000",fontSize:"clamp(15px,2vw,18px)",fontWeight:800,cursor:"pointer",boxShadow:`0 8px 32px ${AC}44`,width:"100%"}}>
              🛒 {content.hero_cta||"Commander maintenant"}
            </button>
            <p style={{textAlign:"center",color:`${TX}35`,fontSize:11}}>✅ Paiement à la livraison &nbsp;·&nbsp; 🚚 Livraison rapide &nbsp;·&nbsp; 🔒 Satisfait ou remboursé</p>
          </div>
        </div>
      </div>

      {/* ── CHIFFRES CLÉS ── */}
      {content.chiffres.length > 0 && (
        <div style={{background:"rgba(255,255,255,0.03)",borderTop:`1px solid rgba(255,255,255,0.06)`,borderBottom:`1px solid rgba(255,255,255,0.06)`,padding:"28px 20px"}}>
          <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"center",gap:"clamp(24px,6vw,80px)",flexWrap:"wrap"}}>
            {content.chiffres.map((c,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <p style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(22px,4vw,36px)",fontWeight:900,color:AC,margin:"0 0 4px"}}>{c.valeur}</p>
                <p style={{color:`${TX}55`,fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",margin:0}}>{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TÉMOIGNAGE WHATSAPP ── */}
      {content.whatsapp_actif && content.whatsapp_messages.length > 0 && (
        <div style={{padding:"60px 20px"}}>
          <div style={{maxWidth:500,margin:"0 auto"}}>
            <p style={{textAlign:"center",color:`${TX}55`,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20}}>💬 Témoignage Réel</p>
            <div style={{background:"#1A1A2E",borderRadius:20,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
              {/* Header WhatsApp */}
              <div style={{background:"#2A2A3E",padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
                {content.whatsapp_photo
                  ? <img src={content.whatsapp_photo} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover"}} />
                  : <div style={{width:40,height:40,borderRadius:"50%",background:AC,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#000"}}>{content.whatsapp_nom.charAt(0)}</div>
                }
                <div>
                  <p style={{color:TX,fontSize:14,fontWeight:700,margin:0}}>{content.whatsapp_nom}</p>
                  <p style={{color:"#4ADE80",fontSize:11,margin:0}}>● En ligne</p>
                </div>
              </div>
              {/* Messages */}
              <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
                {content.whatsapp_messages.map((msg,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:msg.auteur==="vendeur"?"flex-end":"flex-start"}}>
                    <div style={{
                      maxWidth:"78%",padding:"10px 14px",borderRadius:msg.auteur==="vendeur"?"16px 4px 16px 16px":"4px 16px 16px 16px",
                      background:msg.auteur==="vendeur"?AC:"rgba(255,255,255,0.08)",
                      color:msg.auteur==="vendeur"?"#000":TX,fontSize:14,lineHeight:1.5
                    }}>
                      {msg.texte}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRESSE ── */}
      {content.presse_actif && content.presse_logos.length > 0 && (
        <div style={{padding:"40px 20px",borderTop:`1px solid rgba(255,255,255,0.05)`}}>
          <p style={{textAlign:"center",color:`${TX}44`,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20}}>{content.presse_titre}</p>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:32,flexWrap:"wrap"}}>
            {content.presse_logos.map((logo,i)=>(
              <img key={i} src={logo} alt="" style={{height:36,objectFit:"contain",filter:"brightness(0) invert(1)",opacity:0.5}} />
            ))}
          </div>
        </div>
      )}

      {/* ── PROBLÈMES ── */}
      {content.problemes.length > 0 && (
        <div style={{padding:"60px 20px",background:"rgba(239,68,68,0.04)"}}>
          <div style={{maxWidth:800,margin:"0 auto"}}>
            <p style={{textAlign:"center",color:"#EF4444",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>⚠️ Attention</p>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(22px,4vw,36px)",fontWeight:900,textAlign:"center",marginBottom:12,lineHeight:1.2}}>{content.problemes_titre}</h2>
            <p style={{textAlign:"center",color:`${TX}55`,fontSize:15,marginBottom:40}}>{content.problemes_sous_titre}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
              {content.problemes.map((p,i)=>(
                <div key={i} style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:16,padding:"20px 18px"}}>
                  <div style={{fontSize:32,marginBottom:10}}>{p.emoji}</div>
                  <p style={{color:TX,fontSize:15,fontWeight:700,marginBottom:6}}>{p.titre}</p>
                  <p style={{color:`${TX}66`,fontSize:13,lineHeight:1.65,margin:0}}>{p.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DANGER ── */}
      {content.dangers.length > 0 && (
        <div style={{padding:"60px 20px",background:"rgba(0,0,0,0.3)"}}>
          <div style={{maxWidth:700,margin:"0 auto"}}>
            <p style={{textAlign:"center",color:"#EF4444",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>🔥 Danger</p>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,4vw,32px)",fontWeight:900,textAlign:"center",marginBottom:10,lineHeight:1.2}}>{content.danger_titre}</h2>
            <p style={{textAlign:"center",color:`${TX}55`,fontSize:15,marginBottom:40}}>{content.danger_sous_titre}</p>
            <div style={{display:"flex",flexDirection:"column",gap:16,position:"relative"}}>
              <div style={{position:"absolute",left:19,top:0,bottom:0,width:2,background:"rgba(239,68,68,0.2)"}} />
              {content.dangers.map((d,i)=>(
                <div key={i} style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(239,68,68,0.15)",border:"2px solid rgba(239,68,68,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#EF4444",flexShrink:0,zIndex:1}}>
                    {String(i+1).padStart(2,"0")}
                  </div>
                  <div style={{paddingTop:8}}>
                    <p style={{color:TX,fontSize:15,fontWeight:700,marginBottom:4}}>{d.titre}</p>
                    <p style={{color:`${TX}66`,fontSize:13,lineHeight:1.65,margin:0}}>{d.texte}</p>
                  </div>
                </div>
              ))}
            </div>
            {content.danger_cta_texte && (
              <div style={{marginTop:32,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:12,padding:"16px 20px",textAlign:"center"}}>
                <p style={{color:"#EF4444",fontSize:14,fontWeight:700,margin:0}}>⏳ {content.danger_cta_texte}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SOLUTION ── */}
      {content.ingredients.length > 0 && (
        <div style={{padding:"60px 20px"}}>
          <div style={{maxWidth:800,margin:"0 auto"}}>
            <p style={{textAlign:"center",color:AC,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>💊 La Solution</p>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(22px,4vw,36px)",fontWeight:900,textAlign:"center",marginBottom:10,lineHeight:1.2}}>{content.solution_titre}</h2>
            <p style={{textAlign:"center",color:`${TX}55`,fontSize:15,marginBottom:40}}>{content.solution_sous_titre}</p>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {content.ingredients.map((ing,i)=>(
                <div key={i} style={{display:"flex",gap:16,alignItems:"flex-start",background:`${AC}08`,border:`1px solid ${AC}18`,borderRadius:16,padding:"18px 20px"}}>
                  <span style={{fontSize:32,flexShrink:0}}>{ing.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                      <p style={{color:TX,fontSize:15,fontWeight:800,margin:0}}>{ing.nom}</p>
                      {ing.dosage && <span style={{color:`${TX}55`,fontSize:12}}>{ing.dosage}</span>}
                      {ing.tag && <span style={{background:`${AC}25`,color:AC,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,letterSpacing:"0.5px"}}>{ing.tag}</span>}
                    </div>
                    <p style={{color:`${TX}77`,fontSize:13,lineHeight:1.65,margin:0}}>{ing.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TÉMOIGNAGES ── */}
      {content.temoignages.length > 0 && (
        <div style={{padding:"60px 20px",background:"rgba(255,255,255,0.02)"}}>
          <div style={{maxWidth:800,margin:"0 auto"}}>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,4vw,32px)",fontWeight:900,textAlign:"center",marginBottom:36}}>Ce qu'ils en disent</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
              {content.temoignages.map((t,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:"18px"}}>
                  <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
                    {t.photo
                      ? <img src={t.photo} alt={t.nom} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",flexShrink:0}} />
                      : <div style={{width:48,height:48,borderRadius:"50%",background:`${AC}20`,color:AC,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,flexShrink:0}}>{t.nom.charAt(0)}</div>
                    }
                    <div style={{flex:1}}>
                      <p style={{color:TX,fontSize:14,fontWeight:700,margin:"0 0 2px"}}>{t.nom}</p>
                      <p style={{color:`${TX}44`,fontSize:12,margin:0}}>📍 {t.ville}</p>
                    </div>
                    <span style={{color:"#F59E0B",fontSize:13}}>{"★".repeat(t.note)}</span>
                  </div>
                  <p style={{color:`${TX}BB`,fontSize:14,lineHeight:1.75,fontStyle:"italic",margin:0,borderLeft:`3px solid ${AC}`,paddingLeft:12}}>"{t.texte}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GARANTIE ── */}
      {/* ── OFFRES GROUPÉES ── */}
      {content.offres_actif && offres.length > 0 && (
        <div style={{ padding:"40px 20px", background:"rgba(255,255,255,0.02)" }}>
          <div style={{ maxWidth:600, margin:"0 auto" }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(20px,4vw,28px)", fontWeight:900, textAlign:"center", marginBottom:8, color:TX }}>
              {content.offres_titre || "Choisissez votre offre"}
            </h2>
            <p style={{ textAlign:"center", color:`${TX}55`, fontSize:13, marginBottom:28 }}>
              Plus vous commandez, plus vous économisez
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {offres.map((offre, i) => (
                <div key={i} onClick={() => setSelectedOffre(i)}
                  style={{ position:"relative", display:"flex", alignItems:"center", gap:16, padding:"16px 20px", borderRadius:14, border:`2px solid ${selectedOffre===i?AC:offre.populaire?`${AC}40`:"rgba(255,255,255,0.08)"}`, background:selectedOffre===i?`${AC}12`:offre.populaire?`${AC}06`:"transparent", cursor:"pointer", transition:"all 0.2s" }}>
                  {offre.populaire && (
                    <span style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:AC, color:"#000", fontSize:11, fontWeight:800, padding:"3px 14px", borderRadius:20, whiteSpace:"nowrap" }}>
                      ⭐ POPULAIRE
                    </span>
                  )}
                  {/* Radio */}
                  <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${selectedOffre===i?AC:"rgba(255,255,255,0.3)"}`, background:selectedOffre===i?AC:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
                    {selectedOffre===i && <div style={{ width:8, height:8, borderRadius:"50%", background:"#000" }} />}
                  </div>
                  {/* Label */}
                  <div style={{ flex:1 }}>
                    <p style={{ color:TX, fontSize:15, fontWeight:700, margin:"0 0 2px" }}>{offre.label}</p>
                    {offre.badge && (
                      <span style={{ background:`${AC}20`, color:AC, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{offre.badge}</span>
                    )}
                  </div>
                  {/* Prix */}
                  <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(18px,4vw,24px)", fontWeight:900, color:selectedOffre===i?AC:TX }}>
                    {offre.prix.toLocaleString("fr-FR")} {product.devise||"FCFA"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {content.garantie_texte && (
        <div style={{padding:"32px 20px"}}>
          <div style={{maxWidth:600,margin:"0 auto",background:`${AC}0A`,border:`2px solid ${AC}25`,borderRadius:20,padding:"24px 20px",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:10}}>{content.garantie_icone||"🛡️"}</div>
            <p style={{color:TX,fontSize:17,fontWeight:800,margin:0}}>{content.garantie_texte}</p>
          </div>
        </div>
      )}

      {/* ── FORMULAIRE DE COMMANDE ── */}
      <div ref={formRef} style={{padding:"60px 20px",background:"rgba(0,0,0,0.4)"}}>
        <div style={{maxWidth:560,margin:"0 auto"}}>
          {submitted ? (
            <div style={{background:"rgba(74,222,128,0.07)",border:"2px solid rgba(74,222,128,0.22)",borderRadius:24,padding:"40px 24px",textAlign:"center"}}>
              <div style={{fontSize:64,marginBottom:16}}>✅</div>
              <h2 style={{fontFamily:"'Syne',sans-serif",color:TX,fontSize:26,fontWeight:900,marginBottom:8}}>Commande confirmée !</h2>
              <p style={{color:`${TX}77`,fontSize:15,lineHeight:1.7,marginBottom:20}}>
                Merci <strong style={{color:TX}}>{form.name}</strong> !<br/>
                Notre équipe te rappellera au <strong style={{color:TX}}>{form.phone}</strong> très bientôt.
              </p>
              <div style={{background:`${AC}0F`,border:`1px solid ${AC}25`,borderRadius:14,padding:"14px 20px",display:"inline-block",marginBottom:20}}>
                <p style={{color:`${TX}44`,fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Numéro de commande</p>
                <p style={{color:AC,fontSize:24,fontWeight:900,margin:0,letterSpacing:2,fontFamily:"'Syne',sans-serif"}}>{orderNum}</p>
              </div>
              {tenant.phone && (
                <a href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g,"")}?text=Bonjour+j'ai+commandé+${encodeURIComponent(product.nom)}`}
                  style={{display:"block",background:"#25D366",borderRadius:14,padding:"14px",color:"#fff",fontSize:15,fontWeight:700,textDecoration:"none"}}>
                  💬 Nous contacter sur WhatsApp
                </a>
              )}
            </div>
          ) : (
            <div>
              <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(20px,4vw,28px)",fontWeight:900,textAlign:"center",marginBottom:6}}>
                🛒 Commander maintenant
              </h2>
              <p style={{textAlign:"center",color:`${TX}44`,fontSize:13,marginBottom:28}}>Paiement à la livraison · Livraison rapide</p>

              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {[
                  {label:"Prénom et nom *",key:"name",placeholder:"Ex: Kofi Mensah",type:"text"},
                  {label:"Téléphone WhatsApp *",key:"phone",placeholder:"+228 90 00 00 00",type:"tel"},
                  {label:"Ville *",key:"city",placeholder:"Ex: Lomé, Dakar, Abidjan...",type:"text"},
                  {label:"Adresse / Quartier",key:"address",placeholder:"Ex: Adidogomé, carrefour Shell",type:"text"},
                ].map(f=>(
                  <div key={f.key}>
                    <label style={{display:"block",color:`${TX}66`,fontSize:13,fontWeight:500,marginBottom:8}}>{f.label}</label>
                    <input type={f.type} value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                      placeholder={f.placeholder} style={inp} />
                  </div>
                ))}

                <div>
                  <label style={{display:"block",color:`${TX}66`,fontSize:13,fontWeight:500,marginBottom:8}}>Note (optionnel)</label>
                  <textarea value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}
                    placeholder="Instructions spéciales..." style={{...inp,resize:"none",height:70}} />
                </div>

                {/* Récap */}
                <div style={{background:`${AC}0A`,border:`1px solid ${AC}1E`,borderRadius:14,padding:"16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{color:`${TX}66`,fontSize:14}}>{product.nom}</span>
                    <span style={{color:TX,fontSize:14,fontWeight:700}}>{fmt(product.prix)}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{color:`${TX}66`,fontSize:14}}>Livraison</span>
                    <span style={{color:"#4ADE80",fontSize:14,fontWeight:700}}>Gratuite</span>
                  </div>
                  <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:10,display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:TX,fontSize:15,fontWeight:800}}>Total</span>
                    <span style={{color:AC,fontSize:24,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>{fmt(product.prix)}</span>
                  </div>
                </div>

                {formError && <p style={{color:"#F87171",fontSize:13,textAlign:"center"}}>⚠️ {formError}</p>}

                <button onClick={handleOrder} disabled={submitting}
                  style={{position:"relative",overflow:"hidden",background:submitting?`${AC}66`:`linear-gradient(135deg,${AC},${AC}CC)`,border:"none",borderRadius:14,padding:"20px",color:"#000",fontSize:17,fontWeight:900,cursor:submitting?"not-allowed":"pointer",boxShadow:submitting?"none":`0 8px 32px ${AC}40`}}>
                  {submitting?"Envoi en cours...":` ✅ Confirmer ma commande · ${fmt(product.prix)}`}
                </button>
                <p style={{textAlign:"center",color:`${TX}33`,fontSize:12}}>🔒 Paiement sécurisé à la livraison</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:"20px",textAlign:"center",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
        <p style={{color:`${TX}22`,fontSize:12}}>
          Propulsé par <a href="https://shipivo.app" style={{color:AC,textDecoration:"none",fontWeight:700}}>Shipivo</a>
        </p>
      </div>
    </div>
  )
}
