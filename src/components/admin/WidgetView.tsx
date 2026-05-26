"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"

const S = {
  bg:"#09090F", card:"#111118", card2:"#16161F", border:"#1E1E2E",
  gold:"#F59E0B", goldDk:"#D97706", white:"#F8F8FC",
  muted:"#55556A", muted2:"#9898B0", success:"#4ADE80",
}

interface Props { tenantId: string; tenantSlug: string }

const FONTS = ["Inter","Poppins","Montserrat","Roboto","Lato","Nunito","Raleway","Playfair Display","Bebas Neue","DM Sans"]
const BTN_STYLES = [
  { value:"full", label:"Plein" },
  { value:"gradient", label:"Dégradé" },
  { value:"outline", label:"Contour" },
]

export default function WidgetView({ tenantId, tenantSlug }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [couleur, setCouleur] = useState("#F59E0B")
  const [fond, setFond] = useState("dark")
  const [police, setPolice] = useState("Inter")
  const [btnText, setBtnText] = useState("Commander — Paiement à la livraison")
  const [btnStyle, setBtnStyle] = useState("full")
  const [titre, setTitre] = useState("Commander maintenant")
  const [sousTitre, setSousTitre] = useState("Paiement à la livraison · Livraison rapide")
  const [copied, setCopied] = useState(false)
  const [activeCode, setActiveCode] = useState<"produit"|"boutique">("produit")

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("tenants").select("widget_couleur,widget_fond,widget_police,widget_btn_text,widget_btn_style,widget_titre,widget_sous_titre").eq("id", tenantId).single()
      if (data) {
        if (data.widget_couleur) setCouleur(data.widget_couleur)
        if (data.widget_fond) setFond(data.widget_fond)
        if (data.widget_police) setPolice(data.widget_police)
        if (data.widget_btn_text) setBtnText(data.widget_btn_text)
        if (data.widget_btn_style) setBtnStyle(data.widget_btn_style)
        if (data.widget_titre) setTitre(data.widget_titre)
        if (data.widget_sous_titre) setSousTitre(data.widget_sous_titre)
      }
    }
    load()
  }, [tenantId])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from("tenants").update({
      widget_couleur: couleur, widget_fond: fond, widget_police: police,
      widget_btn_text: btnText, widget_btn_style: btnStyle,
      widget_titre: titre, widget_sous_titre: sousTitre,
    }).eq("id", tenantId)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const previewUrl = `https://shipivo.app/widget?boutique=${tenantSlug}&produit_nom=Mon+Produit&produit_prix=15000&mode=full`

  const codesProduit = `<iframe 
  src="https://shipivo.app/widget?boutique=${tenantSlug}&produit_nom=NOM_PRODUIT&produit_prix=PRIX&mode=full" 
  width="100%" height="620" frameborder="0" 
  style="border-radius:12px;border:none;">
</iframe>
<script>
  // Resize automatique
  window.addEventListener('message', function(e) {
    if(e.data.type === 'shipivo-resize') {
      document.querySelector('iframe').style.height = e.data.height + 'px';
    }
  });
</script>`

  const codesBoutique = `<iframe 
  src="https://shipivo.app/widget?boutique=${tenantSlug}" 
  width="100%" height="520" frameborder="0"
  style="border-radius:12px;border:none;">
</iframe>
<script>
  window.addEventListener('message', function(e) {
    if(e.data.type === 'shipivo-resize') {
      document.querySelector('iframe').style.height = e.data.height + 'px';
    }
  });
</script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode === "produit" ? codesProduit : codesBoutique)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inp: React.CSSProperties = {
    width:"100%", background:S.bg, border:`1px solid ${S.border}`,
    borderRadius:8, padding:"9px 12px", color:S.white, fontSize:13,
    outline:"none", boxSizing:"border-box", fontFamily:"inherit"
  }

  // Preview styles
  const isDark = fond === "dark"
  const PBG = isDark ? "#09090F" : "#FFFFFF"
  const PCARD = isDark ? "#111118" : "#F8F9FA"
  const PBORDER = isDark ? "#1E1E2E" : "#E5E7EB"
  const PTX = isDark ? "#F8F8FC" : "#111118"
  const PTX2 = isDark ? "#9898B0" : "#6B7280"
  const btnPreviewStyle = btnStyle === "outline"
    ? { background:"transparent", border:`2px solid ${couleur}`, color:couleur }
    : btnStyle === "gradient"
    ? { background:`linear-gradient(135deg, ${couleur}, ${couleur}CC)`, border:"none", color:"#000" }
    : { background:couleur, border:"none", color:"#000" }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <p style={{ color:S.white, fontSize:15, fontWeight:700, margin:"0 0 4px" }}>🎛️ Mon Widget de commande</p>
        <p style={{ color:S.muted2, fontSize:13, margin:0 }}>Personnalise ton formulaire et intègre-le sur ton site WordPress, Shopify ou autre.</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:20, alignItems:"start" }}>

        {/* ── PANNEAU PARAMÈTRES ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Couleur */}
          <div style={{ background:S.card, borderRadius:12, padding:"14px 16px", border:`1px solid ${S.border}` }}>
            <p style={{ color:S.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 12px" }}>🎨 Couleur principale</p>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="color" value={couleur} onChange={e=>setCouleur(e.target.value)}
                style={{ width:48, height:40, borderRadius:8, border:`1px solid ${S.border}`, cursor:"pointer", flexShrink:0 }} />
              <input value={couleur} onChange={e=>setCouleur(e.target.value)} style={{...inp,flex:1}} />
            </div>
            {/* Couleurs prédéfinies */}
            <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
              {["#F59E0B","#EF4444","#8B5CF6","#3B82F6","#10B981","#F97316","#EC4899","#000000"].map(c=>(
                <div key={c} onClick={()=>setCouleur(c)}
                  style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border:couleur===c?`3px solid ${S.white}`:`2px solid transparent`, transition:"border 0.15s" }} />
              ))}
            </div>
          </div>

          {/* Thème */}
          <div style={{ background:S.card, borderRadius:12, padding:"14px 16px", border:`1px solid ${S.border}` }}>
            <p style={{ color:S.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 12px" }}>🌙 Thème</p>
            <div style={{ display:"flex", gap:8 }}>
              {[["dark","🌙 Sombre"],["light","☀️ Clair"]].map(([id,label])=>(
                <button key={id} onClick={()=>setFond(id)}
                  style={{ flex:1, padding:"10px", borderRadius:10, border:`2px solid ${fond===id?couleur:S.border}`, background:fond===id?`${couleur}15`:"transparent", color:fond===id?couleur:S.muted2, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Police */}
          <div style={{ background:S.card, borderRadius:12, padding:"14px 16px", border:`1px solid ${S.border}` }}>
            <p style={{ color:S.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 12px" }}>🔤 Police</p>
            <select value={police} onChange={e=>setPolice(e.target.value)} style={{...inp,fontFamily:police}}>
              {FONTS.map(f=><option key={f} value={f} style={{fontFamily:f}}>{f}</option>)}
            </select>
          </div>

          {/* Textes */}
          <div style={{ background:S.card, borderRadius:12, padding:"14px 16px", border:`1px solid ${S.border}` }}>
            <p style={{ color:S.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 12px" }}>✍️ Textes</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div>
                <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Titre</label>
                <input value={titre} onChange={e=>setTitre(e.target.value)} style={inp} placeholder="Commander maintenant" />
              </div>
              <div>
                <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Sous-titre</label>
                <input value={sousTitre} onChange={e=>setSousTitre(e.target.value)} style={inp} placeholder="Paiement à la livraison..." />
              </div>
              <div>
                <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Texte du bouton</label>
                <input value={btnText} onChange={e=>setBtnText(e.target.value)} style={inp} placeholder="Commander — Paiement à la livraison" />
              </div>
            </div>
          </div>

          {/* Style bouton */}
          <div style={{ background:S.card, borderRadius:12, padding:"14px 16px", border:`1px solid ${S.border}` }}>
            <p style={{ color:S.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 12px" }}>🔘 Style du bouton</p>
            <div style={{ display:"flex", gap:8 }}>
              {BTN_STYLES.map(b=>(
                <button key={b.value} onClick={()=>setBtnStyle(b.value)}
                  style={{ flex:1, padding:"8px", borderRadius:8, border:`2px solid ${btnStyle===b.value?couleur:S.border}`, background:btnStyle===b.value?`${couleur}15`:"transparent", color:btnStyle===b.value?couleur:S.muted2, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bouton sauvegarder */}
          <button onClick={handleSave} disabled={saving}
            style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:saved?"rgba(74,222,128,0.15)":`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:saved?S.success:"#000", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            {saved ? "✅ Sauvegardé !" : saving ? "Sauvegarde..." : "💾 Sauvegarder"}
          </button>
        </div>

        {/* ── APERÇU + CODE ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Aperçu live */}
          <div style={{ background:S.card, borderRadius:14, padding:16, border:`1px solid ${S.border}` }}>
            <p style={{ color:S.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 14px" }}>👁️ Aperçu en direct</p>
            <div style={{ background:PBG, borderRadius:12, padding:20, fontFamily:police }}>
              <style>{`@import url('https://fonts.googleapis.com/css2?family=${police.replace(/ /g,"+")}:wght@400;600;700;800&display=swap');`}</style>

              {/* Header preview */}
              <div style={{ marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${PBORDER}` }}>
                <h3 style={{ color:PTX, fontSize:16, fontWeight:800, margin:"0 0 4px", fontFamily:police }}>{titre}</h3>
                <p style={{ color:PTX2, fontSize:12, margin:0 }}>{sousTitre}</p>
              </div>

              {/* Champs preview */}
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
                {["Prénom et nom *","Téléphone WhatsApp *","Ville *","Adresse / Quartier"].map((label,i)=>(
                  <div key={i}>
                    <p style={{ color:PTX2, fontSize:11, fontWeight:600, margin:"0 0 5px", fontFamily:police }}>{label}</p>
                    <div style={{ background:PCARD, border:`1.5px solid ${PBORDER}`, borderRadius:8, padding:"10px 12px", color:PTX2, fontSize:13 }}>
                      {i===0?"Ex: Kofi Mensah":i===1?"+228 · 90 00 00 00":i===2?"Ex: Lomé, Abidjan...":"Ex: Adidogomé..."}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bouton preview */}
              <div style={{ ...btnPreviewStyle, borderRadius:10, padding:"13px", fontSize:14, fontWeight:800, textAlign:"center", fontFamily:police }}>
                ✅ {btnText}
              </div>
              <p style={{ textAlign:"center", color:PTX2, fontSize:10, marginTop:8 }}>🔒 Sécurisé · Propulsé par Shipivo</p>
            </div>
          </div>

          {/* Code à copier */}
          <div style={{ background:S.card, borderRadius:14, padding:16, border:`1px solid ${S.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <p style={{ color:S.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>📋 Code à copier</p>
              <div style={{ display:"flex", gap:8 }}>
                {[["produit","Produit spécifique"],["boutique","Boutique générale"]].map(([id,label])=>(
                  <button key={id} onClick={()=>setActiveCode(id as any)}
                    style={{ padding:"4px 12px", borderRadius:20, border:`1px solid ${activeCode===id?S.gold:S.border}`, background:activeCode===id?"rgba(245,158,11,0.1)":"transparent", color:activeCode===id?S.gold:S.muted2, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activeCode === "produit" && (
              <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"6px 10px", marginBottom:10 }}>
                <p style={{ color:"#4ADE80", fontSize:11, margin:0 }}>
                  💡 Remplace <strong>NOM_PRODUIT</strong> et <strong>PRIX</strong> par les valeurs de ton produit WordPress/Shopify.
                </p>
              </div>
            )}

            <pre style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:8, padding:"12px 14px", color:"#60A5FA", fontSize:11, lineHeight:1.7, overflow:"auto", margin:"0 0 12px", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
              {activeCode === "produit" ? codesProduit : codesBoutique}
            </pre>

            <button onClick={handleCopy}
              style={{ width:"100%", padding:"11px", borderRadius:8, border:`1px solid ${copied?"#4ADE80":S.gold}`, background:copied?"rgba(74,222,128,0.1)":"rgba(245,158,11,0.08)", color:copied?"#4ADE80":S.gold, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {copied ? "✅ Copié !" : "📋 Copier le code"}
            </button>

            <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(255,255,255,0.03)", borderRadius:8, border:`1px solid ${S.border}` }}>
              <p style={{ color:S.muted2, fontSize:11, margin:"0 0 6px", fontWeight:600 }}>📌 Comment intégrer sur WordPress :</p>
              <ol style={{ color:S.muted2, fontSize:11, paddingLeft:16, margin:0, lineHeight:1.8 }}>
                <li>Va dans ta page produit WordPress</li>
                <li>Ajoute un bloc <strong style={{color:S.white}}>HTML personnalisé</strong></li>
                <li>Colle le code ci-dessus</li>
                <li>Remplace NOM_PRODUIT et PRIX</li>
                <li>Publie ta page</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
