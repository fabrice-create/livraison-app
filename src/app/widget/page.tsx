// src/app/widget/page.tsx
"use client"
import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/app/lib/supabase"

interface Product {
  id: string; name: string; price: number
  description?: string; image_url?: string
}

interface BoutiqueInfo {
  id: string; name: string; slug: string; phone?: string
  delivery_fee: number; currency: string; brand_color: string
  widget_couleur?: string; widget_fond?: string; widget_police?: string
  widget_btn_text?: string; widget_btn_style?: string
  widget_titre?: string; widget_sous_titre?: string
  widget_redirect_url?: string
  widget_merci_titre?: string; widget_merci_message?: string
  widget_merci_bouton_texte?: string; widget_merci_bouton_url?: string
}

function WidgetContent() {
  const searchParams = useSearchParams()
  const slug = searchParams?.get("boutique") || ""
  const produitId = searchParams?.get("produit") || ""
  const produitNom = searchParams?.get("produit_nom") || ""
  const produitPrix = searchParams?.get("produit_prix") || ""
  const produitImage = searchParams?.get("produit_image") || ""
  const mode = searchParams?.get("mode") || "form"
  const produitOffres = searchParams?.get("offres") || ""  // JSON encodé des offres

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ customer_name:"", phone:"", city:"", address:"", note:"" })
  const DIAL_CODES = [
    {flag:"🇹🇬",code:"+228"},{flag:"🇸🇳",code:"+221"},{flag:"🇨🇮",code:"+225"},
    {flag:"🇧🇯",code:"+229"},{flag:"🇧🇫",code:"+226"},{flag:"🇲🇱",code:"+223"},
    {flag:"🇳🇪",code:"+227"},{flag:"🇬🇳",code:"+224"},{flag:"🇳🇬",code:"+234"},
    {flag:"🇬🇭",code:"+233"},{flag:"🇨🇲",code:"+237"},{flag:"🇲🇦",code:"+212"},
    {flag:"🇫🇷",code:"+33"},{flag:"🇧🇪",code:"+32"},{flag:"🇬🇧",code:"+44"},{flag:"🇺🇸",code:"+1"},
  ]
  // Règles de validation par pays
  const PHONE_RULES: Record<string, {len: number; prefixes?: string[]; name: string}> = {
    "+228": { len:8, prefixes:["70","71","72","79","90","91","92","93","96","97","98","99"], name:"Togo" },
    "+221": { len:9, prefixes:["70","75","76","77","78"], name:"Sénégal" },
    "+225": { len:10, name:"Côte d'Ivoire" },
    "+229": { len:8, prefixes:["40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","65","66","67","68","69","90","91","92","93","94","95","96","97","98","99"], name:"Bénin" },
    "+226": { len:8, prefixes:["5","6","7"], name:"Burkina Faso" },
    "+223": { len:8, prefixes:["5","6","7","8","9"], name:"Mali" },
    "+227": { len:8, name:"Niger" },
    "+224": { len:9, prefixes:["6"], name:"Guinée" },
    "+234": { len:10, prefixes:["7","8","9"], name:"Nigéria" },
    "+233": { len:9, prefixes:["2","5"], name:"Ghana" },
    "+237": { len:9, name:"Cameroun" },
    "+212": { len:9, prefixes:["6","7"], name:"Maroc" },
    "+33":  { len:9, prefixes:["6","7"], name:"France" },
    "+32":  { len:9, name:"Belgique" },
    "+44":  { len:10, name:"Royaume-Uni" },
    "+1":   { len:10, name:"USA/Canada" },
  }

  const validatePhone = (phone: string, dial: string): string | null => {
    const digits = phone.replace(/\D/g, "").replace(/^0/, "")
    const rules = PHONE_RULES[dial]
    if (!rules) return null
    if (digits.length !== rules.len) return `Numéro invalide — ${rules.name}: ${rules.len} chiffres requis`
    if (rules.prefixes && !rules.prefixes.some(p => digits.startsWith(p))) {
      return `Numéro invalide pour ${rules.name}`
    }
    return null
  }

  const [dialCode, setDialCode] = useState("+228")
  const [showPicker, setShowPicker] = useState(false)
  const [selectedOffre, setSelectedOffre] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      if (!slug) return
      const { data: tenant } = await supabase.from("tenants")
        .select("id,name,slug,phone,delivery_fee,currency,brand_color,widget_couleur,widget_fond,widget_police,widget_btn_text,widget_btn_style,widget_titre,widget_sous_titre,widget_redirect_url,widget_merci_titre,widget_merci_message,widget_merci_bouton_texte,widget_merci_bouton_url")
        .eq("slug", slug).single()
      if (tenant) setBoutique(tenant)
      if (produitId) {
        const { data: prod } = await supabase.from("products").select("id,name,price,description,image_url").eq("id", produitId).single()
        if (prod) setProduct(prod)
      } else if (produitNom) {
        // Chercher l'image du produit par nom si pas d'image directe
        let imgUrl = produitImage || undefined
        if (!imgUrl && produitNom && slug) {
          const { data: pp } = await supabase.from("products")
            .select("image_principale").eq("tenant_id", tenant?.id || "")
            .ilike("nom", produitNom.trim()).single()
          if (pp?.image_principale) imgUrl = pp.image_principale
        }
        setProduct({ id:"external", name:produitNom, price:Number(produitPrix)||0, image_url:imgUrl })
      }
      setLoading(false)
    }
    load()
  }, [slug, produitId])

  // Parser les offres depuis l'URL — gère simple et double encodage
  const offresData = (() => {
    if (!produitOffres) return []
    try { return JSON.parse(decodeURIComponent(produitOffres)) } catch {}
    try { return JSON.parse(decodeURIComponent(decodeURIComponent(produitOffres))) } catch {}
    try { return JSON.parse(produitOffres) } catch {}
    return []
  })()
  const offres: {quantite:number;label:string;prix:number;populaire:boolean;badge:string}[] = offresData
  const offreActive = offres.length > 0 ? offres[selectedOffre] : null
  const prixFinal = offreActive ? offreActive.prix : (product?.price || Number(produitPrix) || 0)

  useEffect(() => {
    const detect = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) })
        if (res.ok) {
          const geo = await res.json()
          const codes: Record<string,string> = { TG:"+228",SN:"+221",CI:"+225",BJ:"+229",NG:"+234",GH:"+233",FR:"+33",BE:"+32",DE:"+49",GB:"+44",US:"+1" }
          if (codes[geo.country_code]) setDialCode(codes[geo.country_code])
        }
      } catch {}
    }
    detect()
  }, [])

  useEffect(() => {
    const sendHeight = () => {
      if (containerRef.current) {
        const h = containerRef.current.scrollHeight + 16
        window.parent.postMessage({ type:"shipivo-resize", height:h }, "*")
      }
    }
    sendHeight()
    const t1 = setTimeout(sendHeight, 300)
    const t2 = setTimeout(sendHeight, 800)
    const obs = new ResizeObserver(() => sendHeight())
    if (containerRef.current) obs.observe(containerRef.current)
    return () => { obs.disconnect(); clearTimeout(t1); clearTimeout(t2) }
  })

  const handleSubmit = async () => {
    if (!form.customer_name.trim()) { setError("Nom requis"); return }
    if (!form.phone.trim()) { setError("Numéro requis"); return }
    if (!form.city.trim()) { setError("Ville requise"); return }
    if (!boutique) return
    setSubmitting(true); setError("")
    const fullPhone = dialCode + form.phone.trim().replace(/^0/, "")
    const productName = offreActive ? `${product?.name || produitNom} — ${offreActive.label}` : (product?.name || produitNom || "Commande directe")
    const amount = prixFinal + (boutique.delivery_fee || 0)
    const quantity = offreActive?.quantite || 1
    const { error: err } = await supabase.from("orders").insert({
      tenant_id: boutique.id, customer_name: form.customer_name.trim(),
      phone: fullPhone, city: form.city.trim(), address: form.address.trim(),
      product: productName, quantity: quantity, amount,
      status: "En attente", source: "widget", delivery_type: "standard",
      note: form.note.trim() || null,
    })
    if (err) { setError(err.message); setSubmitting(false); return }
    window.parent.postMessage({ type:"shipivo-success", order:{ customer:form.customer_name, phone:fullPhone, product:productName } }, "*")
    setSuccess(true); setSubmitting(false)
    // Rediriger immédiatement si URL configurée — sans afficher page Shipivo
    if (boutique?.widget_redirect_url) {
      window.parent.location.href = boutique.widget_redirect_url
      return
    }
  }

  if (loading) return (
    <div style={{ padding:32, textAlign:"center", fontFamily:"Inter,sans-serif" }}>
      <div style={{ width:32,height:32,border:"3px solid #1E1E2E",borderTopColor:"#F59E0B",borderRadius:"50%",animation:"spin 0.7s linear infinite",margin:"0 auto" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // Couleurs depuis les préférences du tenant
  const AC = boutique?.widget_couleur || boutique?.brand_color || "#F59E0B"
  const isDark = (boutique?.widget_fond || "dark") === "dark"
  const BG = isDark ? "#09090F" : "#FFFFFF"
  const CARD = isDark ? "#111118" : "#F8F9FA"
  const BORDER = isDark ? "#1E1E2E" : "#E5E7EB"
  const TX = isDark ? "#F8F8FC" : "#111118"
  const TX2 = isDark ? "#9898B0" : "#6B7280"
  const FONT = boutique?.widget_police || "Inter"
  const BTN_TEXT = boutique?.widget_btn_text || "Commander — Paiement à la livraison"
  const BTN_STYLE = boutique?.widget_btn_style || "full"
  const TITRE = boutique?.widget_titre || "Commander maintenant"
  const SOUS_TITRE = boutique?.widget_sous_titre || "Paiement à la livraison · Livraison rapide"

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " " + (boutique?.currency || "FCFA")

  const inp: React.CSSProperties = {
    width:"100%", background:CARD, border:`1.5px solid ${BORDER}`,
    borderRadius:10, padding:"10px 12px", color:TX, fontSize:14,
    outline:"none", boxSizing:"border-box", fontFamily:FONT,
    transition:"border-color 0.2s, box-shadow 0.2s"
  }

  const btnStyle: React.CSSProperties = BTN_STYLE === "outline"
    ? { background:"transparent", border:`2px solid ${AC}`, color:AC }
    : BTN_STYLE === "gradient"
    ? { background:`linear-gradient(135deg, ${AC}, ${AC}CC)`, border:"none", color:"#000" }
    : { background:AC, border:"none", color:"#000" }

  if (success) return (
    <div ref={containerRef} style={{ background:BG, borderRadius:16, padding:32, textAlign:"center", fontFamily:FONT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=${FONT.replace(/ /g,"+")}:wght@400;600;700;800&display=swap');`}</style>

      {/* Icône succès */}
      <div style={{ width:80,height:80,borderRadius:"50%",background:"rgba(74,222,128,0.12)",border:"2px solid rgba(74,222,128,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,margin:"0 auto 20px" }}>✅</div>

      {/* Titre personnalisé */}
      <h3 style={{ color:TX, margin:"0 0 12px", fontSize:22, fontWeight:800, fontFamily:FONT }}>
        {boutique?.widget_merci_titre || "Merci pour votre commande !"}
      </h3>

      {/* Message personnalisé */}
      <p style={{ color:TX2, fontSize:14, margin:"0 0 8px", lineHeight:1.7 }}>
        {boutique?.widget_merci_message || "Notre équipe vous appellera bientôt pour confirmer."}
      </p>
      <p style={{ color:TX2, fontSize:14, margin:"0 0 24px", lineHeight:1.7 }}>
        Merci <strong style={{color:TX}}>{form.customer_name}</strong> — nous vous appelons au <strong style={{color:TX}}>{dialCode}{form.phone}</strong>.
      </p>

      {/* Numéro boutique */}
      <div style={{ background:`${AC}15`, border:`1px solid ${AC}30`, borderRadius:12, padding:"10px 14px", display:"inline-block", marginBottom:20 }}>
        <p style={{ color:TX2, fontSize:11, textTransform:"uppercase", letterSpacing:1, margin:"0 0 4px" }}>Boutique</p>
        <p style={{ color:AC, fontSize:16, fontWeight:800, margin:0 }}>{boutique?.name}</p>
      </div>

      {/* Bouton WhatsApp si téléphone disponible */}
      {boutique?.phone && (
        <div style={{ marginBottom:12 }}>
          <a href={`https://wa.me/${boutique.phone.replace(/[^0-9]/g,"")}?text=Bonjour+j'ai+commandé+${encodeURIComponent(product?.name||"votre produit")}`}
            target="_blank" rel="noreferrer"
            style={{ display:"inline-block", background:"#25D366", borderRadius:12, padding:"12px 24px", color:"#fff", fontSize:14, fontWeight:700, textDecoration:"none" }}>
            💬 Contacter sur WhatsApp
          </a>
        </div>
      )}

      {/* Bouton retour personnalisé */}
      {(boutique?.widget_merci_bouton_url || boutique?.widget_redirect_url) && (
        <a href={boutique.widget_merci_bouton_url || boutique.widget_redirect_url || "#"}
          style={{ display:"inline-block", background:`${AC}15`, border:`1px solid ${AC}30`, borderRadius:12, padding:"11px 24px", color:AC, fontSize:14, fontWeight:700, textDecoration:"none" }}>
          {boutique?.widget_merci_bouton_texte || "Retour à la boutique"}
        </a>
      )}

      {/* Redirection auto si URL configurée */}
      {boutique?.widget_redirect_url && (
        <p style={{ color:TX2, fontSize:11, marginTop:16 }}>
          Redirection automatique dans 3 secondes...
        </p>
      )}
    </div>
  )

  return (
    <div id="shipivo-widget" ref={containerRef} style={{ background:BG, borderRadius:16, padding:16, fontFamily:FONT, maxWidth:"100%", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${FONT.replace(/ /g,"+")}:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        /* Reset WordPress styles */
        #shipivo-widget, #shipivo-widget * { box-sizing: border-box !important; font-family: ${FONT}, Inter, sans-serif !important; }
        #shipivo-widget input, #shipivo-widget select, #shipivo-widget textarea {
          all: unset !important;
          box-sizing: border-box !important;
          display: block !important;
          width: 100% !important;
          background: ${CARD} !important;
          border: 1.5px solid ${BORDER} !important;
          border-radius: 10px !important;
          padding: 10px 12px !important;
          color: ${TX} !important;
          font-size: 13px !important;
          font-family: ${FONT}, Inter, sans-serif !important;
          line-height: 1.4 !important;
          margin: 0 !important;
          outline: none !important;
        }
        #shipivo-widget input:focus, #shipivo-widget select:focus, #shipivo-widget textarea:focus {
          border-color: ${AC} !important;
          box-shadow: 0 0 0 3px ${AC}25 !important;
        }
        #shipivo-widget button { cursor: pointer !important; }
        #shipivo-widget p, #shipivo-widget h3, #shipivo-widget label { margin: 0 !important; padding: 0 !important; }
        .sw-inp:focus{ border-color:${AC} !important; box-shadow:0 0 0 3px ${AC}20 !important; }
      `}</style>

      {/* Produit si mode full */}
      {mode === "full" && product && (
        <div style={{ display:"flex", gap:14, marginBottom:20, padding:14, background:CARD, borderRadius:14, border:`1.5px solid ${BORDER}` }}>
          {product.image_url && (
            <img src={product.image_url} alt={product.name}
              style={{ width:64, height:64, borderRadius:8, objectFit:"cover", flexShrink:0 }} />
          )}
          <div style={{ flex:1 }}>
            <p style={{ color:TX, fontWeight:700, fontSize:15, margin:"0 0 4px" }}>{product.name}</p>
            <p style={{ color:AC, fontWeight:900, fontSize:22, margin:"0 0 4px", fontFamily:"'Syne',sans-serif" }}>{fmt(product.price)}</p>
            {boutique?.delivery_fee ? (
              <p style={{ color:TX2, fontSize:12, margin:0 }}>+ {fmt(boutique.delivery_fee)} livraison</p>
            ) : (
              <p style={{ color:"#4ADE80", fontSize:12, margin:0, fontWeight:600 }}>✓ Livraison gratuite</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${BORDER}` }}>
        <h3 style={{ color:TX, fontSize:18, fontWeight:800, margin:"0 0 4px" }}>{TITRE}</h3>
        <p style={{ color:TX2, fontSize:13, margin:0 }}>{SOUS_TITRE}</p>
      </div>

      {/* Offres groupées */}
      {offres.length > 0 && (
        <div style={{ marginBottom:18 }}>
          <p style={{ color:TX2, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 10px" }}>
            Choisissez votre offre
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {offres.map((offre, i) => (
              <div key={i} onClick={() => setSelectedOffre(i)}
                style={{ position:"relative", display:"flex", alignItems:"center", gap:12, padding:"11px 13px", borderRadius:10, border:`2px solid ${selectedOffre===i?AC:offre.populaire?`${AC}40`:BORDER}`, background:selectedOffre===i?`${AC}10`:"transparent", cursor:"pointer", transition:"all 0.2s" }}>
                {offre.populaire && (
                  <span style={{ position:"absolute", top:-9, left:12, background:AC, color:"#000", fontSize:10, fontWeight:800, padding:"1px 8px", borderRadius:20 }}>⭐ POPULAIRE</span>
                )}
                <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${selectedOffre===i?AC:TX2}`, background:selectedOffre===i?AC:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {selectedOffre===i && <div style={{ width:6, height:6, borderRadius:"50%", background:"#000" }} />}
                </div>
                <span style={{ color:TX, fontSize:13, fontWeight:600, flex:1 }}>{offre.label}</span>
                {offre.badge && <span style={{ background:`${AC}20`, color:AC, fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:20 }}>{offre.badge}</span>}
                <span style={{ color:selectedOffre===i?AC:TX, fontSize:15, fontWeight:800 }}>
                  {offre.prix.toLocaleString("fr-FR")} {boutique?.currency||"FCFA"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Champs */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

        {!product && (
          <div>
            <label style={{ display:"block", color:TX2, fontSize:12, fontWeight:600, marginBottom:4 }}>
              Produit souhaité <span style={{color:AC}}>*</span>
            </label>
            <input className="sw-inp" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}
              placeholder="Ex: Crème massage 50ml..." style={inp} />
          </div>
        )}

        <div>
          <label style={{ display:"block", color:TX2, fontSize:12, fontWeight:600, marginBottom:4 }}>
            Prénom et nom <span style={{color:AC}}>*</span>
          </label>
          <input className="sw-inp" value={form.customer_name} onChange={e=>setForm(p=>({...p,customer_name:e.target.value}))}
            placeholder="Ex: Kofi Mensah" style={inp} />
        </div>

        <div>
          <label style={{ display:"block", color:TX2, fontSize:12, fontWeight:600, marginBottom:4 }}>
            Téléphone WhatsApp <span style={{color:AC}}>*</span>
          </label>
          <div style={{ display:"flex", gap:8, position:"relative" }}>
            <button type="button" onClick={()=>setShowPicker(p=>!p)}
              style={{ background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"10px", color:TX, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              {DIAL_CODES.find(d=>d.code===dialCode)?.flag||"🌍"} {dialCode} ▾
            </button>
            {showPicker && (
              <div style={{ position:"absolute", top:52, left:0, background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, zIndex:100, maxHeight:180, overflowY:"auto", minWidth:150, boxShadow:"0 8px 24px rgba(0,0,0,0.5)" }}>
                {DIAL_CODES.map(dc=>(
                  <div key={dc.code} onClick={()=>{setDialCode(dc.code);setShowPicker(false)}}
                    style={{ padding:"9px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${BORDER}`, background:dialCode===dc.code?"rgba(245,158,11,0.1)":"transparent" }}>
                    <span style={{fontSize:18}}>{dc.flag}</span>
                    <span style={{color:TX,fontSize:13}}>{dc.code}</span>
                  </div>
                ))}
              </div>
            )}
            <input className="sw-inp" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}
              onFocus={e=>{setShowPicker(false);setTimeout(()=>e.target.scrollIntoView({behavior:"smooth",block:"center"}),300)}}
              placeholder="90 00 00 00" type="tel" inputMode="numeric" pattern="[0-9]*"
              style={{...inp,flex:1}} />
          </div>

        </div>
        <div>
          <label style={{ display:"block", color:TX2, fontSize:12, fontWeight:600, marginBottom:4 }}>
            Ville <span style={{color:AC}}>*</span>
          </label>
          <input className="sw-inp" value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))}
            placeholder="Ex: Lomé, Abidjan, Lagos..." style={inp} />
        </div>

        <div>
          <label style={{ display:"block", color:TX2, fontSize:12, fontWeight:600, marginBottom:4 }}>Adresse / Quartier</label>
          <input className="sw-inp" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}
            placeholder="Ex: Adidogomé, carrefour Shell" style={inp} />
        </div>

        <div>
          <label style={{ display:"block", color:TX2, fontSize:12, fontWeight:600, marginBottom:4 }}>Note (optionnel)</label>
          <textarea className="sw-inp" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}
            placeholder="Instructions spéciales..." rows={1}
            style={{...inp, resize:"none"}} />
        </div>

        {/* Récap commande */}
        <div style={{ background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:12, padding:"10px 12px" }}>
          {offreActive ? (
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, alignItems:"center" }}>
              <div>
                <span style={{ color:TX2, fontSize:13 }}>{offreActive.label}</span>
                {offreActive.badge && <span style={{ marginLeft:6, background:`${AC}20`, color:AC, fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:20 }}>{offreActive.badge}</span>}
              </div>
              <span style={{ color:TX, fontSize:13, fontWeight:700 }}>{prixFinal.toLocaleString("fr-FR")} {boutique?.currency||"FCFA"}</span>
            </div>
          ) : product ? (
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ color:TX2, fontSize:13 }}>{product.name}</span>
              <span style={{ color:TX, fontSize:13, fontWeight:700 }}>{prixFinal.toLocaleString("fr-FR")} {boutique?.currency||"FCFA"}</span>
            </div>
          ) : null}
          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:`1px solid ${BORDER}` }}>
            <span style={{ color:TX, fontSize:14, fontWeight:700 }}>Total</span>
            <span style={{ color:AC, fontSize:18, fontWeight:900 }}>{prixFinal.toLocaleString("fr-FR")} {boutique?.currency||"FCFA"}</span>
          </div>
        </div>

        {error && (
          <div style={{ background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:10, padding:"10px 14px" }}>
            <p style={{ color:"#F87171", fontSize:13, margin:0 }}>⚠️ {error}</p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          style={{ width:"100%", ...btnStyle, borderRadius:12, padding:"15px", fontSize:15, fontWeight:800, cursor:submitting?"not-allowed":"pointer", opacity:submitting?0.7:1, fontFamily:FONT, transition:"all 0.2s" }}>
          {submitting ? "Envoi en cours..." : `✅ ${BTN_TEXT} · ${prixFinal.toLocaleString("fr-FR")} ${boutique?.currency||"FCFA"}`}
        </button>

        <p style={{ textAlign:"center", color:TX2, fontSize:11, margin:0 }}>
          🔒 Vos données sont sécurisées · Propulsé par{" "}
          <a href="https://shipivo.app" target="_blank" rel="noreferrer" style={{ color:AC, textDecoration:"none", fontWeight:600 }}>Shipivo</a>
        </p>
      </div>
    </div>
  )
}

export default function WidgetPage() {
  return (
    <Suspense fallback={
      <div style={{ padding:24, textAlign:"center", fontFamily:"Inter,sans-serif" }}>
        <div style={{ width:32,height:32,border:"3px solid #1E1E2E",borderTopColor:"#F59E0B",borderRadius:"50%",animation:"spin 0.7s linear infinite",margin:"0 auto" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <WidgetContent />
    </Suspense>
  )
}
