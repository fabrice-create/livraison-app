"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"

const S = {
  bg:"#09090F", card:"#111118", card2:"#16161F", border:"#1E1E2E",
  gold:"#F59E0B", goldDk:"#D97706", white:"#F8F8FC",
  muted:"#55556A", muted2:"#9898B0", success:"#4ADE80",
  danger:"#F87171", dangerBg:"rgba(248,113,113,0.08)",
}

interface Props { tenantId: string; tenantSlug: string }

type Product = {
  id: string; nom: string; slug: string; prix: number
  prix_barre: number|null; devise: string; badge: string
  is_active: boolean; image_principale: string
  vues: number; commandes: number
}

// Structure JSON du contenu de la page
type PageContent = {
  // Hero
  hero_titre: string
  hero_sous_titre: string
  hero_cta: string
  hero_badges: string[] // ["🇹🇬 Disponible au Togo", "🚚 Livraison gratuite", ...]
  // Bandeau défilant
  bandeau: string[]
  // Galerie
  images: string[]
  // Chiffres clés
  chiffres: { valeur: string; label: string }[]
  // Problèmes
  problemes_titre: string
  problemes_sous_titre: string
  problemes: { emoji: string; titre: string; texte: string }[]
  // Danger
  danger_titre: string
  danger_sous_titre: string
  dangers: { titre: string; texte: string }[]
  danger_cta_texte: string
  // Solution
  solution_titre: string
  solution_sous_titre: string
  ingredients: { emoji: string; nom: string; dosage: string; description: string; tag: string }[]
  // Témoignage WhatsApp
  whatsapp_actif: boolean
  whatsapp_nom: string
  whatsapp_photo: string
  whatsapp_messages: { auteur: "client"|"vendeur"; texte: string }[]
  // Presse
  presse_actif: boolean
  presse_titre: string
  presse_logos: string[]
  // Témoignages classiques
  temoignages: { nom: string; ville: string; texte: string; note: number; photo: string }[]
  // Garantie
  garantie_texte: string
  garantie_icone: string
  // Design
  couleur: string
  fond: string
}

const defaultContent: PageContent = {
  hero_titre: "Titre accrocheur de ton produit",
  hero_sous_titre: "Sous-titre court qui explique le bénéfice principal",
  hero_cta: "Je veux commander maintenant",
  hero_badges: ["🇹🇬 Disponible au Togo", "🚚 Livraison gratuite", "💵 Paiement livraison"],
  bandeau: ["🚚 Livraison gratuite", "💵 Paiement à la livraison", "⏳ Offre limitée"],
  images: [],
  chiffres: [
    { valeur: "+1 200", label: "clients satisfaits" },
    { valeur: "4.8/5", label: "note moyenne" },
    { valeur: "100%", label: "naturel" },
  ],
  problemes_titre: "Tu te sens comme ça ?",
  problemes_sous_titre: "Ce n'est pas normal. C'est un signal.",
  problemes: [
    { emoji: "😴", titre: "Fatigue chronique", texte: "Tu te réveilles épuisé même après 8h de sommeil." },
    { emoji: "😰", titre: "Stress permanent", texte: "Une pression que tu ne sais plus gérer." },
    { emoji: "🌙", titre: "Sommeil difficile", texte: "Tu te réveilles plusieurs fois dans la nuit." },
  ],
  danger_titre: "Ignorer ces signaux peut aggraver la situation",
  danger_sous_titre: "Chaque jour sans agir, ton corps paie le prix.",
  dangers: [
    { titre: "Épuisement progressif", texte: "Ton corps puise dans ses dernières réserves." },
    { titre: "Déséquilibre hormonal", texte: "Les carences perturbent ta production d'hormones essentielles." },
    { titre: "Perte de vitalité", texte: "Tu perds ton élan, ta motivation, ton drive." },
  ],
  danger_cta_texte: "Plus tu attends… plus ton corps s'affaiblit.",
  solution_titre: "La solution que ton corps attendait",
  solution_sous_titre: "Formulé pour agir sur tous les fronts.",
  ingredients: [
    { emoji: "🧲", nom: "Ingrédient 1", dosage: "300mg", description: "Description du bénéfice principal.", tag: "HAUTE ABSORPTION" },
    { emoji: "🌿", nom: "Ingrédient 2", dosage: "300mg", description: "Description du bénéfice principal.", tag: "ANTI-STRESS" },
  ],
  whatsapp_actif: false,
  whatsapp_nom: "Client satisfait",
  whatsapp_photo: "",
  whatsapp_messages: [
    { auteur: "client", texte: "Ton produit là... 😭🙏" },
    { auteur: "vendeur", texte: "Quoi ? Dis moi 👀" },
    { auteur: "client", texte: "3 semaines et je suis un autre homme 🔥" },
  ],
  presse_actif: false,
  presse_titre: "Vu et recommandé dans",
  presse_logos: [],
  temoignages: [],
  garantie_texte: "Satisfait ou remboursé 30 jours",
  garantie_icone: "🛡️",
  couleur: "#F59E0B",
  fond: "#09090F",
}

const TABS = [
  ["base","📦 Produit"],
  ["hero","🎯 Hero"],
  ["medias","🖼️ Médias"],
  ["problemes","😣 Problèmes"],
  ["solution","💊 Solution"],
  ["preuves","⭐ Preuves"],
  ["design","🎨 Design"],
  ["apercu","👁️ Aperçu"],
]

export default function ProduitsView({ tenantId, tenantSlug }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("base")

  // Onglet base
  const [nom, setNom] = useState("")
  const [prix, setPrix] = useState("")
  const [prixBarre, setPrixBarre] = useState("")
  const [devise, setDevise] = useState("FCFA")
  const [badge, setBadge] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [imagePrincipale, setImagePrincipale] = useState("")
  const [uploadingMain, setUploadingMain] = useState(false)
  const mainImgRef = useRef<HTMLInputElement>(null)

  // Contenu page
  const [content, setContent] = useState<PageContent>(defaultContent)

  // Upload galerie
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Upload presse
  const pressRef = useRef<HTMLInputElement>(null)
  const [uploadingPress, setUploadingPress] = useState(false)

  useEffect(() => { loadProducts() }, [tenantId])

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from("products")
      .select("id,nom,slug,prix,prix_barre,devise,badge,is_active,image_principale,vues,commandes")
      .eq("tenant_id", tenantId).order("created_at", { ascending: false })
    setProducts((data||[]) as Product[])
    setLoading(false)
  }

  const upload = async (file: File, path: string): Promise<string|null> => {
    const ext = file.name.split(".").pop()?.toLowerCase()||"jpg"
    const fileName = `${path}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("shipivo-images").upload(fileName, file, { upsert:true, contentType:file.type })
    if (error) { alert("Erreur: "+error.message); return null }
    return supabase.storage.from("shipivo-images").getPublicUrl(fileName).data.publicUrl
  }

  const resetForm = () => {
    setNom(""); setPrix(""); setPrixBarre(""); setDevise("FCFA"); setBadge("")
    setIsActive(true); setImagePrincipale(""); setContent(defaultContent)
    setEditId(null); setTab("base"); setError("")
  }

  const openNew = () => { resetForm(); setShowEditor(true) }

  const openEdit = async (id: string) => {
    const { data } = await supabase.from("products").select("*").eq("id", id).single()
    if (!data) return
    setNom(data.nom||""); setPrix(String(data.prix||""))
    setPrixBarre(data.prix_barre?String(data.prix_barre):"")
    setDevise(data.devise||"FCFA"); setBadge(data.badge||"")
    setIsActive(data.is_active!==false); setImagePrincipale(data.image_principale||"")
    try {
      const parsed = data.page_content ? JSON.parse(data.page_content) : defaultContent
      setContent({ ...defaultContent, ...parsed })
    } catch { setContent(defaultContent) }
    setEditId(id); setShowEditor(true); setTab("base")
  }

  const handleSave = async () => {
    if (!nom.trim()) { setError("Nom requis."); return }
    if (!prix) { setError("Prix requis."); return }
    setSaving(true); setError("")
    const slugBase = nom.trim().toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"produit"
    const slug = editId ? slugBase : `${slugBase}-${Date.now().toString(36)}`
    const payload = {
      tenant_id:tenantId, nom:nom.trim(), slug,
      prix:Number(prix), prix_barre:prixBarre?Number(prixBarre):null,
      devise, badge, is_active:isActive, image_principale:imagePrincipale,
      page_content: JSON.stringify(content),
      updated_at: new Date().toISOString()
    }
    const { error:err } = editId
      ? await supabase.from("products").update(payload).eq("id", editId)
      : await supabase.from("products").insert(payload)
    if (err) { setError("Erreur: "+err.message); setSaving(false); return }
    await loadProducts(); setShowEditor(false); resetForm(); setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return
    await supabase.from("products").delete().eq("id", id)
    await loadProducts()
  }

  const upContent = (patch: Partial<PageContent>) => setContent(c => ({...c, ...patch}))

  const inp: React.CSSProperties = {
    width:"100%", background:S.bg, border:`1px solid ${S.border}`,
    borderRadius:8, padding:"10px 12px", color:S.white, fontSize:13,
    outline:"none", boxSizing:"border-box", fontFamily:"inherit"
  }

  const pageUrl = `https://shipivo.app/produit/${tenantSlug}/${nom.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}`

  if (loading) return <p style={{color:S.muted,textAlign:"center",padding:32}}>Chargement...</p>

  if (!showEditor) return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <p style={{color:S.white,fontSize:15,fontWeight:700,margin:"0 0 4px"}}>📦 Mes produits</p>
          <p style={{color:S.muted2,fontSize:13,margin:0}}>Crée et personnalise tes pages de vente.</p>
        </div>
        <button onClick={openNew} style={{padding:"9px 18px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${S.gold},${S.goldDk})`,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          + Nouveau produit
        </button>
      </div>
      {products.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 20px",background:S.card,borderRadius:14,border:`1px solid ${S.border}`}}>
          <div style={{fontSize:48,marginBottom:12}}>📦</div>
          <p style={{color:S.white,fontSize:15,fontWeight:700,margin:"0 0 8px"}}>Aucun produit</p>
          <p style={{color:S.muted2,fontSize:13,margin:"0 0 20px"}}>Crée ton premier produit maintenant.</p>
          <button onClick={openNew} style={{padding:"10px 24px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${S.gold},${S.goldDk})`,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer"}}>
            + Créer un produit
          </button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {products.map(p => (
            <div key={p.id} style={{background:S.card,border:`1px solid ${S.border}`,borderRadius:14,padding:"14px 16px",display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
              {p.image_principale
                ? <img src={p.image_principale} alt="" style={{width:56,height:56,borderRadius:10,objectFit:"cover",flexShrink:0}} />
                : <div style={{width:56,height:56,borderRadius:10,background:S.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>📦</div>
              }
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <p style={{color:S.white,fontSize:14,fontWeight:700,margin:0}}>{p.nom}</p>
                  {p.badge && <span style={{background:"rgba(245,158,11,0.15)",color:S.gold,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{p.badge}</span>}
                  {!p.is_active && <span style={{background:S.dangerBg,color:S.danger,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>Inactif</span>}
                </div>
                <p style={{color:S.gold,fontSize:14,fontWeight:800,margin:"0 0 2px"}}>
                  {p.prix.toLocaleString("fr-FR")} {p.devise}
                  {p.prix_barre && <span style={{color:S.muted,fontSize:12,fontWeight:400,textDecoration:"line-through",marginLeft:8}}>{p.prix_barre.toLocaleString("fr-FR")}</span>}
                </p>
                <p style={{color:S.muted2,fontSize:11,margin:0}}>{p.vues||0} vues · {p.commandes||0} commandes</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={() => openEdit(p.id)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${S.border}`,background:"transparent",color:S.gold,fontSize:12,cursor:"pointer"}}>✏️ Éditer</button>
                <a href={`https://shipivo.app/produit/${tenantSlug}/${p.slug}`} target="_blank" rel="noreferrer" style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${S.border}`,background:"transparent",color:"#60A5FA",fontSize:12,textDecoration:"none"}}>👁️ Voir</a>
                <button onClick={() => handleDelete(p.id)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,fontSize:12,cursor:"pointer"}}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={() => { setShowEditor(false); resetForm() }} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${S.border}`,background:"transparent",color:S.muted2,fontSize:13,cursor:"pointer"}}>
          ← Retour
        </button>
        <p style={{color:S.white,fontSize:15,fontWeight:700,margin:0,flex:1}}>{editId?`Modifier : ${nom}`:"Nouveau produit"}</p>
        <button onClick={handleSave} disabled={saving} style={{padding:"8px 20px",borderRadius:8,border:"none",background:saving?S.muted:`linear-gradient(135deg,${S.gold},${S.goldDk})`,color:"#000",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
          {saving?"Enregistrement...":"✅ Enregistrer"}
        </button>
      </div>

      {error && <div style={{background:S.dangerBg,border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:14,color:S.danger,fontSize:13}}>⚠️ {error}</div>}

      {/* Tabs */}
      <div style={{display:"flex",gap:3,marginBottom:20,background:S.card,borderRadius:12,padding:4,flexWrap:"wrap"}}>
        {TABS.map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{flex:1,padding:"8px 6px",borderRadius:9,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",minWidth:60,background:tab===id?S.gold:"transparent",color:tab===id?"#000":S.muted2,whiteSpace:"nowrap"}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PRODUIT ── */}
      {tab === "base" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:6}}>Nom du produit *</label>
              <input value={nom} onChange={e=>setNom(e.target.value)} style={inp} placeholder="Ex: DeepCalm Magnésium 15en1" />
            </div>
            <div>
              <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:6}}>Badge</label>
              <select value={badge} onChange={e=>setBadge(e.target.value)} style={inp}>
                <option value="">Aucun</option>
                {["NOUVEAU","PROMO","BEST-SELLER","RUPTURE"].map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div>
              <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:6}}>Prix *</label>
              <input type="number" value={prix} onChange={e=>setPrix(e.target.value)} style={inp} placeholder="19900" />
            </div>
            <div>
              <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:6}}>Prix barré</label>
              <input type="number" value={prixBarre} onChange={e=>setPrixBarre(e.target.value)} style={inp} placeholder="29900" />
            </div>
            <div>
              <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:6}}>Devise</label>
              <select value={devise} onChange={e=>setDevise(e.target.value)} style={inp}>
                {["FCFA","XOF","XAF","USD","EUR","GHS","NGN"].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:6}}>Image principale</label>
            <input ref={mainImgRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setUploadingMain(true);const url=await upload(f,`produits/${tenantId}`);if(url)setImagePrincipale(url);setUploadingMain(false)}} />
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>mainImgRef.current?.click()} disabled={uploadingMain} style={{padding:"10px 16px",borderRadius:8,border:`1px dashed ${S.gold}`,background:"rgba(245,158,11,0.05)",color:S.gold,fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                {uploadingMain?"⏳...":"📁 Upload"}
              </button>
              <input value={imagePrincipale} onChange={e=>setImagePrincipale(e.target.value)} style={{...inp,flex:1}} placeholder="Ou colle une URL..." />
            </div>
            {imagePrincipale && <img src={imagePrincipale} alt="" style={{marginTop:8,height:80,borderRadius:8,objectFit:"cover"}} />}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,background:S.card2,borderRadius:10,padding:"12px 14px"}}>
            <span style={{color:S.muted2,fontSize:13,flex:1}}>Statut</span>
            <button onClick={()=>setIsActive(!isActive)} style={{padding:"6px 16px",borderRadius:20,border:"none",fontSize:13,fontWeight:700,cursor:"pointer",background:isActive?"rgba(74,222,128,0.15)":S.dangerBg,color:isActive?S.success:S.danger}}>
              {isActive?"✅ Actif":"❌ Inactif"}
            </button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      {tab === "hero" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:S.card2,borderRadius:12,padding:"14px 16px"}}>
            <p style={{color:S.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>🎯 Textes principaux</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:4}}>Titre accrocheur (affiché en gros)</label>
                <textarea value={content.hero_titre} onChange={e=>upContent({hero_titre:e.target.value})} style={{...inp,resize:"vertical",height:70}} placeholder="Tu te sens fatigué, sans énergie, sans drive ?" />
              </div>
              <div>
                <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:4}}>Sous-titre</label>
                <input value={content.hero_sous_titre} onChange={e=>upContent({hero_sous_titre:e.target.value})} style={inp} placeholder="Ce n'est pas la vieillesse. C'est ton corps qui..." />
              </div>
              <div>
                <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:4}}>Texte bouton Commander</label>
                <input value={content.hero_cta} onChange={e=>upContent({hero_cta:e.target.value})} style={inp} placeholder="Je veux commander maintenant" />
              </div>
            </div>
          </div>

          <div style={{background:S.card2,borderRadius:12,padding:"14px 16px"}}>
            <p style={{color:S.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>📢 Bandeau défilant</p>
            {content.bandeau.map((item,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                <input value={item} onChange={e=>{const arr=[...content.bandeau];arr[i]=e.target.value;upContent({bandeau:arr})}} style={{...inp,flex:1}} placeholder="🚚 Livraison gratuite" />
                <button onClick={()=>upContent({bandeau:content.bandeau.filter((_,j)=>j!==i)})} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
              </div>
            ))}
            <button onClick={()=>upContent({bandeau:[...content.bandeau,""]})} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter</button>
          </div>

          <div style={{background:S.card2,borderRadius:12,padding:"14px 16px"}}>
            <p style={{color:S.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>🏅 Badges hero (sous le titre)</p>
            {content.hero_badges.map((item,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                <input value={item} onChange={e=>{const arr=[...content.hero_badges];arr[i]=e.target.value;upContent({hero_badges:arr})}} style={{...inp,flex:1}} placeholder="🇹🇬 Disponible au Togo" />
                <button onClick={()=>upContent({hero_badges:content.hero_badges.filter((_,j)=>j!==i)})} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
              </div>
            ))}
            <button onClick={()=>upContent({hero_badges:[...content.hero_badges,""]})} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter</button>
          </div>

          <div style={{background:S.card2,borderRadius:12,padding:"14px 16px"}}>
            <p style={{color:S.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>📊 Chiffres clés</p>
            {content.chiffres.map((item,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                <input value={item.valeur} onChange={e=>{const arr=[...content.chiffres];arr[i]={...arr[i],valeur:e.target.value};upContent({chiffres:arr})}} style={{...inp,width:120}} placeholder="+1 200" />
                <input value={item.label} onChange={e=>{const arr=[...content.chiffres];arr[i]={...arr[i],label:e.target.value};upContent({chiffres:arr})}} style={{...inp,flex:1}} placeholder="clients satisfaits" />
                <button onClick={()=>upContent({chiffres:content.chiffres.filter((_,j)=>j!==i)})} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
              </div>
            ))}
            <button onClick={()=>upContent({chiffres:[...content.chiffres,{valeur:"",label:""}]})} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter</button>
          </div>

          <div style={{background:S.card2,borderRadius:12,padding:"14px 16px"}}>
            <p style={{color:S.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>🛡️ Garantie</p>
            <div style={{display:"flex",gap:8}}>
              <input value={content.garantie_icone} onChange={e=>upContent({garantie_icone:e.target.value})} style={{...inp,width:60}} placeholder="🛡️" />
              <input value={content.garantie_texte} onChange={e=>upContent({garantie_texte:e.target.value})} style={{...inp,flex:1}} placeholder="Satisfait ou remboursé 30 jours" />
            </div>
          </div>
        </div>
      )}

      {/* ── MÉDIAS ── */}
      {tab === "medias" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <p style={{color:S.muted2,fontSize:13}}>Ces photos apparaissent dans la galerie du hero — comme sur forako.shop.</p>
          <input ref={galleryRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setUploadingGallery(true);const url=await upload(f,`produits/${tenantId}/galerie`);if(url)upContent({images:[...content.images,url]});setUploadingGallery(false);e.target.value=""}} />
          <button onClick={()=>galleryRef.current?.click()} disabled={uploadingGallery} style={{padding:"14px",borderRadius:10,border:`1px dashed ${S.gold}`,background:"rgba(245,158,11,0.05)",color:S.gold,fontSize:13,fontWeight:600,cursor:"pointer"}}>
            {uploadingGallery?"⏳ Upload en cours...":"📁 Ajouter une photo"}
          </button>
          {content.images.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {content.images.map((img,i)=>(
                <div key={i} style={{position:"relative"}}>
                  <img src={img} alt="" style={{width:90,height:90,borderRadius:10,objectFit:"cover",border:`2px solid ${S.border}`}} />
                  <button onClick={()=>upContent({images:content.images.filter((_,j)=>j!==i)})} style={{position:"absolute",top:-8,right:-8,width:22,height:22,borderRadius:"50%",border:"none",background:S.danger,color:"#fff",fontSize:12,cursor:"pointer"}}>×</button>
                  {i>0&&<button onClick={()=>{const arr=[...content.images];[arr[i],arr[i-1]]=[arr[i-1],arr[i]];upContent({images:arr})}} style={{position:"absolute",bottom:-8,left:-8,width:22,height:22,borderRadius:"50%",border:"none",background:S.gold,color:"#000",fontSize:12,cursor:"pointer"}}>←</button>}
                </div>
              ))}
            </div>
          )}

          <div style={{background:S.card2,borderRadius:12,padding:"14px 16px",marginTop:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <p style={{color:S.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",margin:0}}>📰 Logos presse</p>
              <button onClick={()=>upContent({presse_actif:!content.presse_actif})} style={{padding:"4px 12px",borderRadius:20,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:content.presse_actif?"rgba(74,222,128,0.15)":S.card,color:content.presse_actif?S.success:S.muted}}>
                {content.presse_actif?"Activé":"Désactivé"}
              </button>
            </div>
            {content.presse_actif && (
              <>
                <input value={content.presse_titre} onChange={e=>upContent({presse_titre:e.target.value})} style={{...inp,marginBottom:10}} placeholder="Vu et recommandé dans" />
                <input ref={pressRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setUploadingPress(true);const url=await upload(f,`produits/${tenantId}/presse`);if(url)upContent({presse_logos:[...content.presse_logos,url]});setUploadingPress(false);e.target.value=""}} />
                <button onClick={()=>pressRef.current?.click()} disabled={uploadingPress} style={{padding:"8px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%",marginBottom:8}}>
                  {uploadingPress?"⏳...":"+ Ajouter un logo presse"}
                </button>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {content.presse_logos.map((logo,i)=>(
                    <div key={i} style={{position:"relative"}}>
                      <img src={logo} alt="" style={{height:40,borderRadius:6,objectFit:"contain",background:"rgba(255,255,255,0.08)",padding:"4px 8px"}} />
                      <button onClick={()=>upContent({presse_logos:content.presse_logos.filter((_,j)=>j!==i)})} style={{position:"absolute",top:-8,right:-8,width:18,height:18,borderRadius:"50%",border:"none",background:S.danger,color:"#fff",fontSize:10,cursor:"pointer"}}>×</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PROBLÈMES ── */}
      {tab === "problemes" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:S.card2,borderRadius:12,padding:"14px 16px"}}>
            <p style={{color:S.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>😣 Section Problèmes</p>
            <input value={content.problemes_titre} onChange={e=>upContent({problemes_titre:e.target.value})} style={{...inp,marginBottom:8}} placeholder="Tu te sens comme ça ?" />
            <input value={content.problemes_sous_titre} onChange={e=>upContent({problemes_sous_titre:e.target.value})} style={inp} placeholder="Ce n'est pas normal. C'est un signal." />
          </div>
          {content.problemes.map((item,i)=>(
            <div key={i} style={{background:S.card2,borderRadius:10,padding:12,border:`1px solid ${S.border}`}}>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <input value={item.emoji} onChange={e=>{const arr=[...content.problemes];arr[i]={...arr[i],emoji:e.target.value};upContent({problemes:arr})}} style={{...inp,width:60}} placeholder="😴" />
                <input value={item.titre} onChange={e=>{const arr=[...content.problemes];arr[i]={...arr[i],titre:e.target.value};upContent({problemes:arr})}} style={{...inp,flex:1}} placeholder="Titre du problème" />
                <button onClick={()=>upContent({problemes:content.problemes.filter((_,j)=>j!==i)})} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
              </div>
              <input value={item.texte} onChange={e=>{const arr=[...content.problemes];arr[i]={...arr[i],texte:e.target.value};upContent({problemes:arr})}} style={inp} placeholder="Description courte..." />
            </div>
          ))}
          <button onClick={()=>upContent({problemes:[...content.problemes,{emoji:"😰",titre:"",texte:""}]})} style={{padding:"10px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer"}}>+ Ajouter un problème</button>

          <div style={{background:S.card2,borderRadius:12,padding:"14px 16px",marginTop:4}}>
            <p style={{color:S.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>🔥 Section Danger (aggravation)</p>
            <input value={content.danger_titre} onChange={e=>upContent({danger_titre:e.target.value})} style={{...inp,marginBottom:8}} placeholder="Ignorer ces signaux peut aggraver..." />
            <input value={content.danger_sous_titre} onChange={e=>upContent({danger_sous_titre:e.target.value})} style={{...inp,marginBottom:10}} placeholder="Chaque jour sans agir..." />
            {content.dangers.map((item,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:S.gold,color:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,flexShrink:0,marginTop:6}}>{i+1}</div>
                <div style={{flex:1}}>
                  <input value={item.titre} onChange={e=>{const arr=[...content.dangers];arr[i]={...arr[i],titre:e.target.value};upContent({dangers:arr})}} style={{...inp,marginBottom:6}} placeholder="Titre" />
                  <input value={item.texte} onChange={e=>{const arr=[...content.dangers];arr[i]={...arr[i],texte:e.target.value};upContent({dangers:arr})}} style={inp} placeholder="Description" />
                </div>
                <button onClick={()=>upContent({dangers:content.dangers.filter((_,j)=>j!==i)})} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer",alignSelf:"flex-start",marginTop:6}}>✕</button>
              </div>
            ))}
            <button onClick={()=>upContent({dangers:[...content.dangers,{titre:"",texte:""}]})} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%",marginTop:4}}>+ Ajouter</button>
            <input value={content.danger_cta_texte} onChange={e=>upContent({danger_cta_texte:e.target.value})} style={{...inp,marginTop:10}} placeholder="Plus tu attends… plus ton corps s'affaiblit." />
          </div>
        </div>
      )}

      {/* ── SOLUTION ── */}
      {tab === "solution" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:S.card2,borderRadius:12,padding:"14px 16px"}}>
            <p style={{color:S.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>💊 Section Solution</p>
            <input value={content.solution_titre} onChange={e=>upContent({solution_titre:e.target.value})} style={{...inp,marginBottom:8}} placeholder="La solution que ton corps attendait" />
            <input value={content.solution_sous_titre} onChange={e=>upContent({solution_sous_titre:e.target.value})} style={inp} placeholder="Formulé pour agir sur tous les fronts." />
          </div>
          {content.ingredients.map((item,i)=>(
            <div key={i} style={{background:S.card2,borderRadius:10,padding:12,border:`1px solid ${S.border}`}}>
              <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                <input value={item.emoji} onChange={e=>{const arr=[...content.ingredients];arr[i]={...arr[i],emoji:e.target.value};upContent({ingredients:arr})}} style={{...inp,width:60}} placeholder="🧲" />
                <input value={item.nom} onChange={e=>{const arr=[...content.ingredients];arr[i]={...arr[i],nom:e.target.value};upContent({ingredients:arr})}} style={{...inp,flex:2}} placeholder="Nom ingrédient" />
                <input value={item.dosage} onChange={e=>{const arr=[...content.ingredients];arr[i]={...arr[i],dosage:e.target.value};upContent({ingredients:arr})}} style={{...inp,width:100}} placeholder="300mg" />
                <button onClick={()=>upContent({ingredients:content.ingredients.filter((_,j)=>j!==i)})} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
              </div>
              <input value={item.description} onChange={e=>{const arr=[...content.ingredients];arr[i]={...arr[i],description:e.target.value};upContent({ingredients:arr})}} style={{...inp,marginBottom:6}} placeholder="Description du bénéfice" />
              <input value={item.tag} onChange={e=>{const arr=[...content.ingredients];arr[i]={...arr[i],tag:e.target.value};upContent({ingredients:arr})}} style={inp} placeholder="HAUTE ABSORPTION" />
            </div>
          ))}
          <button onClick={()=>upContent({ingredients:[...content.ingredients,{emoji:"✨",nom:"",dosage:"",description:"",tag:""}]})} style={{padding:"10px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer"}}>+ Ajouter un ingrédient / bénéfice</button>
        </div>
      )}

      {/* ── PREUVES ── */}
      {tab === "preuves" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Témoignage WhatsApp */}
          <div style={{background:S.card2,borderRadius:12,border:`1px solid ${content.whatsapp_actif?S.gold:S.border}`,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px"}}>
              <p style={{color:S.white,fontSize:13,fontWeight:700,margin:0}}>💬 Témoignage style WhatsApp</p>
              <button onClick={()=>upContent({whatsapp_actif:!content.whatsapp_actif})} style={{padding:"4px 12px",borderRadius:20,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",background:content.whatsapp_actif?"rgba(74,222,128,0.15)":S.card,color:content.whatsapp_actif?S.success:S.muted}}>
                {content.whatsapp_actif?"Activé":"Désactivé"}
              </button>
            </div>
            {content.whatsapp_actif && (
              <div style={{padding:"0 14px 14px",borderTop:`1px solid ${S.border}`}}>
                <div style={{display:"flex",gap:8,marginTop:10,marginBottom:10}}>
                  <input value={content.whatsapp_nom} onChange={e=>upContent({whatsapp_nom:e.target.value})} style={{...inp,flex:1}} placeholder="Nom du client" />
                  <input value={content.whatsapp_photo} onChange={e=>upContent({whatsapp_photo:e.target.value})} style={{...inp,flex:2}} placeholder="URL photo profil" />
                </div>
                {content.whatsapp_messages.map((msg,i)=>(
                  <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                    <select value={msg.auteur} onChange={e=>{const arr=[...content.whatsapp_messages];arr[i]={...arr[i],auteur:e.target.value as "client"|"vendeur"};upContent({whatsapp_messages:arr})}} style={{...inp,width:110}}>
                      <option value="client">Client</option>
                      <option value="vendeur">Moi</option>
                    </select>
                    <input value={msg.texte} onChange={e=>{const arr=[...content.whatsapp_messages];arr[i]={...arr[i],texte:e.target.value};upContent({whatsapp_messages:arr})}} style={{...inp,flex:1}} placeholder="Message..." />
                    <button onClick={()=>upContent({whatsapp_messages:content.whatsapp_messages.filter((_,j)=>j!==i)})} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
                  </div>
                ))}
                <button onClick={()=>upContent({whatsapp_messages:[...content.whatsapp_messages,{auteur:"client",texte:""}]})} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Message</button>
              </div>
            )}
          </div>

          {/* Témoignages classiques */}
          <div>
            <p style={{color:S.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>⭐ Avis clients</p>
            {content.temoignages.map((item,i)=>(
              <div key={i} style={{background:S.card2,borderRadius:10,padding:12,marginBottom:10,border:`1px solid ${S.border}`}}>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <input value={item.nom} onChange={e=>{const arr=[...content.temoignages];arr[i]={...arr[i],nom:e.target.value};upContent({temoignages:arr})}} style={{...inp,flex:1}} placeholder="Prénom Nom" />
                  <input value={item.ville} onChange={e=>{const arr=[...content.temoignages];arr[i]={...arr[i],ville:e.target.value};upContent({temoignages:arr})}} style={{...inp,flex:1}} placeholder="Ville" />
                  <select value={item.note} onChange={e=>{const arr=[...content.temoignages];arr[i]={...arr[i],note:Number(e.target.value)};upContent({temoignages:arr})}} style={{...inp,width:70}}>
                    {[5,4,3,2,1].map(n=><option key={n} value={n}>{n}⭐</option>)}
                  </select>
                  <button onClick={()=>upContent({temoignages:content.temoignages.filter((_,j)=>j!==i)})} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
                </div>
                <input value={item.photo||""} onChange={e=>{const arr=[...content.temoignages];arr[i]={...arr[i],photo:e.target.value};upContent({temoignages:arr})}} style={{...inp,marginBottom:8}} placeholder="URL photo (optionnel)" />
                <textarea value={item.texte} onChange={e=>{const arr=[...content.temoignages];arr[i]={...arr[i],texte:e.target.value};upContent({temoignages:arr})}} style={{...inp,resize:"none",height:70}} placeholder="Témoignage..." />
              </div>
            ))}
            <button onClick={()=>upContent({temoignages:[...content.temoignages,{nom:"",ville:"",texte:"",note:5,photo:""}]})} style={{padding:"10px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter un avis</button>
          </div>
        </div>
      )}

      {/* ── DESIGN ── */}
      {tab === "design" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:6}}>Couleur principale</label>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="color" value={content.couleur} onChange={e=>upContent({couleur:e.target.value})} style={{width:40,height:36,borderRadius:8,border:`1px solid ${S.border}`,cursor:"pointer"}} />
                <input value={content.couleur} onChange={e=>upContent({couleur:e.target.value})} style={{...inp,flex:1}} />
              </div>
            </div>
            <div>
              <label style={{display:"block",color:S.muted2,fontSize:12,marginBottom:6}}>Couleur de fond</label>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="color" value={content.fond} onChange={e=>upContent({fond:e.target.value})} style={{width:40,height:36,borderRadius:8,border:`1px solid ${S.border}`,cursor:"pointer"}} />
                <input value={content.fond} onChange={e=>upContent({fond:e.target.value})} style={{...inp,flex:1}} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── APERÇU ── */}
      {tab === "apercu" && (
        <div style={{textAlign:"center",padding:"20px 0"}}>
          {editId ? (
            <>
              <p style={{color:S.muted2,fontSize:13,marginBottom:16}}>Enregistre d'abord, puis clique pour voir ta page.</p>
              <a href={pageUrl} target="_blank" rel="noreferrer"
                style={{display:"inline-block",padding:"14px 28px",borderRadius:12,background:`linear-gradient(135deg,${S.gold},${S.goldDk})`,color:"#000",fontSize:14,fontWeight:700,textDecoration:"none"}}>
                👁️ Voir ma page de vente
              </a>
              <p style={{color:S.muted,fontSize:11,marginTop:12}}>{pageUrl}</p>
            </>
          ) : (
            <div style={{background:S.card2,borderRadius:14,padding:"32px 20px"}}>
              <p style={{color:S.danger,fontSize:13}}>⚠️ Enregistre le produit d'abord</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
