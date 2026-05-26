"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"
import dynamic from "next/dynamic"
const RichEditor = dynamic(() => import("./RichEditor"), { ssr: false, loading: () => <div style={{height:200,background:"rgba(255,255,255,0.03)",borderRadius:14,border:"1px solid rgba(255,255,255,0.1)"}} /> })

const S = {
  bg:"#0A0A0F", card:"#111118", card2:"#16161F", border:"#1E1E2E",
  gold:"#F59E0B", goldDk:"#D97706", white:"#F8F8FC",
  muted:"#55556A", muted2:"#9898B0", success:"#4ADE80",
  danger:"#F87171", dangerBg:"rgba(248,113,113,0.08)",
}

interface Props { tenantId: string; tenantSlug: string }

type Product = {
  id: string; nom: string; slug: string; prix: number
  prix_barre: number | null; devise: string; badge: string
  is_active: boolean; image_principale: string
  vues: number; commandes: number; created_at: string
}

const TABS = [
  ["produit","📦 Produit"],
  ["contenu","✍️ Contenu"],
  ["galerie","🖼️ Galerie"],
  ["sections","📋 Sections"],
  ["preuves","⭐ Preuves"],
  ["ordre","↕️ Ordre"],
  ["design","🎨 Design"],
  ["apercu","👁️ Aperçu"],
]

const sectionLabels: Record<string,string> = {
  galerie:"🖼️ Galerie", description:"📝 Description",
  probleme:"😣 Problème", benefices:"✅ Bénéfices",
  utilisation:"📋 Mode d'emploi", composition:"🧪 Composition",
  temoignages:"⭐ Témoignages", comparaison:"🏆 Comparaison",
  faq:"❓ FAQ", garantie:"🛡️ Garantie", formulaire:"🛒 Formulaire"
}

export default function ProduitsView({ tenantId, tenantSlug }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("produit")

  // ── Onglet Produit ──
  const [nom, setNom] = useState("")
  const [prix, setPrix] = useState("")
  const [prixBarre, setPrixBarre] = useState("")
  const [devise, setDevise] = useState("FCFA")
  const [badge, setBadge] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [imagePrincipale, setImagePrincipale] = useState("")
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Onglet Contenu ──
  const [heroTitre, setHeroTitre] = useState("")
  const [heroSousTitre, setHeroSousTitre] = useState("")
  const [heroCta, setHeroCta] = useState("Commander maintenant")
  const [description, setDescription] = useState("")

  // ── Onglet Galerie ──
  const [imagesGalerie, setImagesGalerie] = useState<string[]>([])
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // ── Onglet Sections ──
  const [sections, setSections] = useState({
    probleme: { active:false, titre:"Vous souffrez de ça ?", items:[] as {emoji:string;texte:string}[] },
    benefices: { active:false, titre:"Pourquoi choisir ce produit ?", items:[] as {emoji:string;titre:string;texte:string}[] },
    utilisation: { active:false, titre:"Comment ça marche ?", items:[] as {etape:number;titre:string;texte:string}[] },
    composition: { active:false, titre:"Composition", items:[] as {nom:string;description:string}[] },
    faq: { active:false, titre:"Questions fréquentes", items:[] as {question:string;reponse:string}[] },
    garantie: { active:false, texte:"Satisfait ou remboursé 30 jours", icone:"🛡️" },
    comparaison: { active:false, titre:"Pourquoi nous ?", items:[] as {critere:string;nous:boolean;concurrent:boolean}[] },
  })

  // ── Onglet Preuves ──
  const [spActive, setSpActive] = useState(true)
  const [spNote, setSpNote] = useState("4.9")
  const [spAvisCount, setSpAvisCount] = useState("127")
  const [spClientsCount, setSpClientsCount] = useState("2000")
  const [spDerniereCommande, setSpDerniereCommande] = useState("8")
  const [temoignages, setTemoignages] = useState({ active:false, titre:"Ce qu'ils en disent", items:[] as {nom:string;ville:string;texte:string;note:number;photo:string}[] })

  // ── Onglet Ordre ──
  const [sectionsOrdre, setSectionsOrdre] = useState<string[]>(["galerie","description","probleme","benefices","utilisation","composition","temoignages","comparaison","faq","garantie","formulaire"])

  // ── Onglet Design ──
  const [theme, setTheme] = useState("dark")
  const [font, setFont] = useState("Poppins")
  const [couleurAccent, setCouleurAccent] = useState("#F59E0B")
  const [couleurFond, setCouleurFond] = useState("#080810")

  useEffect(() => { loadProducts() }, [tenantId])

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from("products").select("id,nom,slug,prix,prix_barre,devise,badge,is_active,image_principale,vues,commandes,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false })
    setProducts((data || []) as Product[])
    setLoading(false)
  }

  const uploadImage = async (file: File) => {
    setUploadingImg(true)
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const fileName = `produits/${tenantId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from("shipivo-images").upload(fileName, file, { upsert: true, contentType: file.type })
      if (error) { alert("Erreur upload: " + error.message); return }
      const { data } = supabase.storage.from("shipivo-images").getPublicUrl(fileName)
      setImagePrincipale(data.publicUrl)
    } catch { alert("Erreur upload image") }
    setUploadingImg(false)
  }

  const uploadGalleryImage = async (file: File) => {
    setUploadingGallery(true)
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const fileName = `produits/${tenantId}/galerie-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from("shipivo-images").upload(fileName, file, { upsert: true, contentType: file.type })
      if (error) { alert("Erreur: " + error.message); return }
      const { data } = supabase.storage.from("shipivo-images").getPublicUrl(fileName)
      setImagesGalerie(prev => [...prev, data.publicUrl])
    } catch { alert("Erreur upload galerie") }
    setUploadingGallery(false)
  }

  const moveSection = (idx: number, dir: -1|1) => {
    const arr = [...sectionsOrdre]
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= arr.length) return
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setSectionsOrdre(arr)
  }

  const resetForm = () => {
    setNom(""); setPrix(""); setPrixBarre(""); setDevise("FCFA"); setBadge(""); setIsActive(true)
    setImagePrincipale(""); setHeroTitre(""); setHeroSousTitre(""); setHeroCta("Commander maintenant"); setDescription("")
    setImagesGalerie([])
    setSections({ probleme:{active:false,titre:"Vous souffrez de ça ?",items:[]}, benefices:{active:false,titre:"Pourquoi choisir ce produit ?",items:[]}, utilisation:{active:false,titre:"Comment ça marche ?",items:[]}, composition:{active:false,titre:"Composition",items:[]}, faq:{active:false,titre:"Questions fréquentes",items:[]}, garantie:{active:false,texte:"Satisfait ou remboursé 30 jours",icone:"🛡️"}, comparaison:{active:false,titre:"Pourquoi nous ?",items:[]} })
    setSpActive(true); setSpNote("4.9"); setSpAvisCount("127"); setSpClientsCount("2000"); setSpDerniereCommande("8")
    setTemoignages({active:false,titre:"Ce qu'ils en disent",items:[]})
    setSectionsOrdre(["galerie","description","probleme","benefices","utilisation","composition","temoignages","comparaison","faq","garantie","formulaire"])
    setTheme("dark"); setFont("Poppins"); setCouleurAccent("#F59E0B"); setCouleurFond("#080810")
    setEditId(null); setTab("produit"); setError("")
  }

  const openNew = () => { resetForm(); setShowEditor(true) }

  const openEdit = async (id: string) => {
    const { data } = await supabase.from("products").select("*").eq("id", id).single()
    if (!data) return
    // Produit
    setNom(data.nom||""); setPrix(String(data.prix||"")); setPrixBarre(data.prix_barre?String(data.prix_barre):"")
    setDevise(data.devise||"FCFA"); setBadge(data.badge||""); setIsActive(data.is_active!==false)
    setImagePrincipale(data.image_principale||"")
    // Contenu
    setHeroTitre(data.hero_titre||""); setHeroSousTitre(data.hero_sous_titre||"")
    setHeroCta(data.hero_cta_texte||"Commander maintenant"); setDescription(data.description||"")
    // Galerie
    setImagesGalerie(data.images||[])
    // Sections
    setSections({
      probleme:{active:data.section_probleme_active||false,titre:data.section_probleme_titre||"Vous souffrez de ça ?",items:data.section_probleme_items||[]},
      benefices:{active:data.section_benefices_active||false,titre:data.section_benefices_titre||"Pourquoi choisir ce produit ?",items:data.section_benefices_items||[]},
      utilisation:{active:data.section_utilisation_active||false,titre:data.section_utilisation_titre||"Comment ça marche ?",items:data.section_utilisation_items||[]},
      composition:{active:data.section_composition_active||false,titre:data.section_composition_titre||"Composition",items:data.section_composition_items||[]},
      faq:{active:data.section_faq_active||false,titre:data.section_faq_titre||"Questions fréquentes",items:data.section_faq_items||[]},
      garantie:{active:data.section_garantie_active||false,texte:data.section_garantie_texte||"Satisfait ou remboursé 30 jours",icone:data.section_garantie_icone||"🛡️"},
      comparaison:{active:data.section_comparaison_active||false,titre:data.section_comparaison_titre||"Pourquoi nous ?",items:data.section_comparaison_items||[]},
    })
    // Preuves
    setSpActive(data.sp_active!==false); setSpNote(String(data.sp_note||"4.9"))
    setSpAvisCount(String(data.sp_avis_count||"127")); setSpClientsCount(String(data.sp_clients_count||"2000"))
    setSpDerniereCommande(String(data.sp_derniere_commande||"8"))
    setTemoignages({active:data.section_temoignages_active||false,titre:data.section_temoignages_titre||"Ce qu'ils en disent",items:data.section_temoignages_items||[]})
    // Ordre
    try { setSectionsOrdre(data.sections_ordre?JSON.parse(data.sections_ordre):["galerie","description","probleme","benefices","utilisation","composition","temoignages","comparaison","faq","garantie","formulaire"]) }
    catch { setSectionsOrdre(["galerie","description","probleme","benefices","utilisation","composition","temoignages","comparaison","faq","garantie","formulaire"]) }
    // Design
    setTheme(data.theme||"dark"); setFont(data.font||"Poppins")
    setCouleurAccent(data.couleur_accent||"#F59E0B"); setCouleurFond(data.couleur_fond||"#080810")
    setEditId(id); setShowEditor(true); setTab("produit")
  }

  const handleSave = async () => {
    if (!nom.trim()) { setError("Nom requis."); return }
    if (!prix) { setError("Prix requis."); return }
    setSaving(true); setError("")
    const slugBase = nom.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "produit"
    const slug = editId ? slugBase : `${slugBase}-${Date.now().toString(36)}`
    const payload = {
      tenant_id:tenantId, nom:nom.trim(), slug, prix:Number(prix),
      prix_barre:prixBarre?Number(prixBarre):null, devise, badge, is_active:isActive,
      image_principale:imagePrincipale, images:imagesGalerie,
      description, hero_titre:heroTitre, hero_sous_titre:heroSousTitre, hero_cta_texte:heroCta,
      sp_active:spActive, sp_note:parseFloat(spNote)||4.9,
      sp_avis_count:parseInt(spAvisCount)||127, sp_clients_count:parseInt(spClientsCount)||2000,
      sp_derniere_commande:parseInt(spDerniereCommande)||8,
      section_temoignages_active:temoignages.active, section_temoignages_titre:temoignages.titre, section_temoignages_items:temoignages.items,
      section_probleme_active:sections.probleme.active, section_probleme_titre:sections.probleme.titre, section_probleme_items:sections.probleme.items,
      section_benefices_active:sections.benefices.active, section_benefices_titre:sections.benefices.titre, section_benefices_items:sections.benefices.items,
      section_utilisation_active:sections.utilisation.active, section_utilisation_titre:sections.utilisation.titre, section_utilisation_items:sections.utilisation.items,
      section_composition_active:sections.composition.active, section_composition_titre:sections.composition.titre, section_composition_items:sections.composition.items,
      section_faq_active:sections.faq.active, section_faq_titre:sections.faq.titre, section_faq_items:sections.faq.items,
      section_garantie_active:sections.garantie.active, section_garantie_texte:sections.garantie.texte, section_garantie_icone:sections.garantie.icone,
      section_comparaison_active:sections.comparaison.active, section_comparaison_titre:sections.comparaison.titre, section_comparaison_items:sections.comparaison.items,
      theme, font, couleur_accent:couleurAccent, couleur_fond:couleurFond,
      sections_ordre:JSON.stringify(sectionsOrdre),
      updated_at:new Date().toISOString()
    }
    if (editId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editId)
      if (error) { setError("Erreur: "+error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from("products").insert(payload)
      if (error) { setError("Erreur: "+error.message); setSaving(false); return }
    }
    await loadProducts(); setShowEditor(false); resetForm(); setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return
    await supabase.from("products").delete().eq("id", id)
    await loadProducts()
  }

  const inp: React.CSSProperties = {
    width:"100%", background:S.bg, border:`1px solid ${S.border}`,
    borderRadius:8, padding:"10px 12px", color:S.white, fontSize:13,
    outline:"none", boxSizing:"border-box", fontFamily:"inherit"
  }

  const pageUrl = (slug: string) => `https://shipivo.app/produit/${tenantSlug}/${slug}`

  // ── Section toggle helper ──
  const SectionHeader = ({ label, active, onToggle }: { label:string; active:boolean; onToggle:()=>void }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px" }}>
      <span style={{ color:S.white, fontSize:13, fontWeight:700 }}>{label}</span>
      <button onClick={onToggle} style={{ padding:"4px 12px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer", background:active?"rgba(74,222,128,0.15)":S.bg, color:active?S.success:S.muted }}>
        {active?"✅ Activée":"Activer"}
      </button>
    </div>
  )

  if (loading) return <p style={{ color:S.muted, textAlign:"center", padding:32 }}>Chargement...</p>

  if (showEditor) return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:20, flexWrap:"wrap" }}>
        <button onClick={() => { setShowEditor(false); resetForm() }} style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${S.border}`, background:"transparent", color:S.muted2, fontSize:13, cursor:"pointer" }}>
          ← Retour
        </button>
        <p style={{ color:S.white, fontSize:15, fontWeight:700, margin:0, flex:1 }}>
          {editId ? `Modifier : ${nom}` : "Nouveau produit"}
        </p>
        <button onClick={handleSave} disabled={saving} style={{ padding:"8px 20px", borderRadius:8, border:"none", background:saving?S.muted:`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:"#000", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
          {saving ? "Enregistrement..." : "✅ Enregistrer"}
        </button>
      </div>

      {error && <div style={{ background:S.dangerBg, border:"1px solid rgba(248,113,113,0.2)", borderRadius:8, padding:"10px 14px", marginBottom:14, color:S.danger, fontSize:13 }}>⚠️ {error}</div>}

      {/* ── Tabs ── */}
      <div style={{ display:"flex", gap:3, marginBottom:20, background:S.card, borderRadius:12, padding:4, flexWrap:"wrap" }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex:1, padding:"8px 6px", borderRadius:9, border:"none", fontSize:11, fontWeight:600, cursor:"pointer", minWidth:60, background:tab===id?S.gold:"transparent", color:tab===id?"#000":S.muted2, whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          📦 ONGLET PRODUIT
      ══════════════════════════════════════════ */}
      {tab === "produit" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Nom + Badge */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Nom du produit *</label>
              <input value={nom} onChange={e => setNom(e.target.value)} style={inp} placeholder="Ex: THERAWOLF Baume" />
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Badge</label>
              <select value={badge} onChange={e => setBadge(e.target.value)} style={inp}>
                <option value="">Aucun</option>
                {["NOUVEAU","PROMO","BEST-SELLER","RUPTURE"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Prix */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Prix *</label>
              <input type="number" value={prix} onChange={e => setPrix(e.target.value)} style={inp} placeholder="15000" />
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Prix barré</label>
              <input type="number" value={prixBarre} onChange={e => setPrixBarre(e.target.value)} style={inp} placeholder="20000" />
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Devise</label>
              <select value={devise} onChange={e => setDevise(e.target.value)} style={inp}>
                {["FCFA","XOF","XAF","USD","EUR","GHS","NGN"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Image principale */}
          <div>
            <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Image principale</label>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f) uploadImage(f) }} />
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImg}
                style={{ padding:"10px 16px", borderRadius:8, border:`1px dashed ${S.gold}`, background:"rgba(245,158,11,0.05)", color:S.gold, fontSize:13, fontWeight:600, cursor:uploadingImg?"not-allowed":"pointer", flexShrink:0 }}>
                {uploadingImg ? "⏳ Upload..." : "📁 Choisir"}
              </button>
              <input value={imagePrincipale} onChange={e => setImagePrincipale(e.target.value)} style={{ ...inp, flex:1 }} placeholder="Ou colle une URL..." />
            </div>
            {imagePrincipale && (
              <div style={{ marginTop:8, position:"relative", display:"inline-block" }}>
                <img src={imagePrincipale} alt="" style={{ height:100, borderRadius:10, objectFit:"cover", border:`2px solid ${S.gold}` }} />
                <button onClick={() => setImagePrincipale("")} style={{ position:"absolute", top:-8, right:-8, width:22, height:22, borderRadius:"50%", border:"none", background:S.danger, color:"#fff", fontSize:12, cursor:"pointer" }}>×</button>
              </div>
            )}
          </div>

          {/* Statut */}
          <div style={{ display:"flex", alignItems:"center", gap:12, background:S.card2, borderRadius:10, padding:"12px 14px" }}>
            <span style={{ color:S.muted2, fontSize:13, flex:1 }}>Statut du produit</span>
            <button onClick={() => setIsActive(!isActive)} style={{ padding:"6px 16px", borderRadius:20, border:"none", fontSize:13, fontWeight:700, cursor:"pointer", background:isActive?"rgba(74,222,128,0.15)":S.dangerBg, color:isActive?S.success:S.danger }}>
              {isActive ? "✅ Actif" : "❌ Inactif"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ✍️ ONGLET CONTENU
      ══════════════════════════════════════════ */}
      {tab === "contenu" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:S.card2, borderRadius:12, padding:"14px 16px" }}>
            <p style={{ color:S.muted2, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>🎯 Textes du Hero (partie haute de la page)</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div>
                <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Titre accrocheur — affiché en gros sur la page</label>
                <input value={heroTitre} onChange={e => setHeroTitre(e.target.value)} style={inp} placeholder="Ex: Dites adieu à la douleur neuropathique..." />
              </div>
              <div>
                <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Sous-titre — phrase courte sous le titre</label>
                <input value={heroSousTitre} onChange={e => setHeroSousTitre(e.target.value)} style={inp} placeholder="Ex: La formule naturelle qui soulage en 15 minutes..." />
              </div>
              <div>
                <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Texte du bouton Commander</label>
                <input value={heroCta} onChange={e => setHeroCta(e.target.value)} style={inp} placeholder="Commander maintenant" />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:8 }}>
              📝 Description du produit — texte riche avec images, titres, listes
            </label>
            <RichEditor value={description} onChange={setDescription} tenantId={tenantId} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          🖼️ ONGLET GALERIE
      ══════════════════════════════════════════ */}
      {tab === "galerie" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <p style={{ color:S.muted2, fontSize:13 }}>Ajoute plusieurs photos. Elles apparaissent en galerie avec miniatures cliquables sur ta page de vente.</p>
          <input ref={galleryInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f) uploadGalleryImage(f) }} />
          <button onClick={() => galleryInputRef.current?.click()} disabled={uploadingGallery}
            style={{ padding:"14px", borderRadius:10, border:`1px dashed ${S.gold}`, background:"rgba(245,158,11,0.05)", color:S.gold, fontSize:13, fontWeight:600, cursor:uploadingGallery?"not-allowed":"pointer" }}>
            {uploadingGallery ? "⏳ Upload en cours..." : "📁 Ajouter une photo à la galerie"}
          </button>
          {imagesGalerie.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {imagesGalerie.map((img, i) => (
                <div key={i} style={{ position:"relative" }}>
                  <img src={img} alt="" style={{ width:90, height:90, borderRadius:10, objectFit:"cover", border:`2px solid ${S.border}` }} />
                  <button onClick={() => setImagesGalerie(prev => prev.filter((_,j)=>j!==i))}
                    style={{ position:"absolute", top:-8, right:-8, width:22, height:22, borderRadius:"50%", border:"none", background:S.danger, color:"#fff", fontSize:12, cursor:"pointer" }}>×</button>
                  {i > 0 && <button onClick={() => { const arr=[...imagesGalerie]; [arr[i],arr[i-1]]=[arr[i-1],arr[i]]; setImagesGalerie(arr) }}
                    style={{ position:"absolute", bottom:-8, left:-8, width:22, height:22, borderRadius:"50%", border:"none", background:S.gold, color:"#000", fontSize:12, cursor:"pointer" }}>←</button>}
                </div>
              ))}
            </div>
          )}
          {imagesGalerie.length === 0 && <p style={{ color:S.muted, fontSize:12, textAlign:"center", padding:"20px 0" }}>Aucune photo ajoutée</p>}
        </div>
      )}

      {/* ══════════════════════════════════════════
          📋 ONGLET SECTIONS
      ══════════════════════════════════════════ */}
      {tab === "sections" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <p style={{ color:S.muted2, fontSize:13, marginBottom:4 }}>Active les sections que tu veux afficher. Pour changer l'ordre → ↕️ Ordre.</p>

          {/* Problème */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.probleme.active?S.gold:S.border}`, overflow:"hidden" }}>
            <SectionHeader label="😣 Problème — ce dont souffre ton client" active={sections.probleme.active} onToggle={() => setSections(s=>({...s,probleme:{...s.probleme,active:!s.probleme.active}}))} />
            {sections.probleme.active && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${S.border}` }}>
                <input value={sections.probleme.titre} onChange={e=>setSections(s=>({...s,probleme:{...s.probleme,titre:e.target.value}}))} style={{...inp,marginTop:10,marginBottom:10}} placeholder="Titre de la section" />
                {sections.probleme.items.map((item,i)=>(
                  <div key={i} style={{ display:"flex",gap:8,marginBottom:8 }}>
                    <input value={item.emoji} onChange={e=>{const arr=[...sections.probleme.items];arr[i]={...arr[i],emoji:e.target.value};setSections(s=>({...s,probleme:{...s.probleme,items:arr}}))}} style={{...inp,width:60}} placeholder="😣" />
                    <input value={item.texte} onChange={e=>{const arr=[...sections.probleme.items];arr[i]={...arr[i],texte:e.target.value};setSections(s=>({...s,probleme:{...s.probleme,items:arr}}))}} style={{...inp,flex:1}} placeholder="Description du problème" />
                    <button onClick={()=>setSections(s=>({...s,probleme:{...s.probleme,items:s.probleme.items.filter((_,j)=>j!==i)}}))} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
                  </div>
                ))}
                <button onClick={()=>setSections(s=>({...s,probleme:{...s.probleme,items:[...s.probleme.items,{emoji:"😣",texte:""}]}}))} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter</button>
              </div>
            )}
          </div>

          {/* Bénéfices */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.benefices.active?S.gold:S.border}`, overflow:"hidden" }}>
            <SectionHeader label="✅ Bénéfices — pourquoi choisir ton produit" active={sections.benefices.active} onToggle={() => setSections(s=>({...s,benefices:{...s.benefices,active:!s.benefices.active}}))} />
            {sections.benefices.active && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${S.border}` }}>
                <input value={sections.benefices.titre} onChange={e=>setSections(s=>({...s,benefices:{...s.benefices,titre:e.target.value}}))} style={{...inp,marginTop:10,marginBottom:10}} placeholder="Titre" />
                {sections.benefices.items.map((item,i)=>(
                  <div key={i} style={{ background:S.bg, borderRadius:8, padding:10, marginBottom:8, border:`1px solid ${S.border}` }}>
                    <div style={{ display:"flex",gap:8,marginBottom:6 }}>
                      <input value={item.emoji} onChange={e=>{const arr=[...sections.benefices.items];arr[i]={...arr[i],emoji:e.target.value};setSections(s=>({...s,benefices:{...s.benefices,items:arr}}))}} style={{...inp,width:60}} placeholder="✅" />
                      <input value={item.titre} onChange={e=>{const arr=[...sections.benefices.items];arr[i]={...arr[i],titre:e.target.value};setSections(s=>({...s,benefices:{...s.benefices,items:arr}}))}} style={{...inp,flex:1}} placeholder="Titre du bénéfice" />
                      <button onClick={()=>setSections(s=>({...s,benefices:{...s.benefices,items:s.benefices.items.filter((_,j)=>j!==i)}}))} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
                    </div>
                    <input value={item.texte} onChange={e=>{const arr=[...sections.benefices.items];arr[i]={...arr[i],texte:e.target.value};setSections(s=>({...s,benefices:{...s.benefices,items:arr}}))}} style={inp} placeholder="Description" />
                  </div>
                ))}
                <button onClick={()=>setSections(s=>({...s,benefices:{...s.benefices,items:[...s.benefices.items,{emoji:"✅",titre:"",texte:""}]}}))} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter</button>
              </div>
            )}
          </div>

          {/* Mode d'emploi */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.utilisation.active?S.gold:S.border}`, overflow:"hidden" }}>
            <SectionHeader label="📋 Mode d'emploi — comment utiliser le produit" active={sections.utilisation.active} onToggle={() => setSections(s=>({...s,utilisation:{...s.utilisation,active:!s.utilisation.active}}))} />
            {sections.utilisation.active && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${S.border}` }}>
                <input value={sections.utilisation.titre} onChange={e=>setSections(s=>({...s,utilisation:{...s.utilisation,titre:e.target.value}}))} style={{...inp,marginTop:10,marginBottom:10}} placeholder="Titre" />
                {sections.utilisation.items.map((item,i)=>(
                  <div key={i} style={{ background:S.bg, borderRadius:8, padding:10, marginBottom:8, border:`1px solid ${S.border}` }}>
                    <div style={{ display:"flex",gap:8,marginBottom:6 }}>
                      <div style={{ width:36,height:36,borderRadius:"50%",background:S.gold,color:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,flexShrink:0 }}>{i+1}</div>
                      <input value={item.titre} onChange={e=>{const arr=[...sections.utilisation.items];arr[i]={...arr[i],titre:e.target.value};setSections(s=>({...s,utilisation:{...s.utilisation,items:arr}}))}} style={{...inp,flex:1}} placeholder="Titre de l'étape" />
                      <button onClick={()=>setSections(s=>({...s,utilisation:{...s.utilisation,items:s.utilisation.items.filter((_,j)=>j!==i)}}))} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
                    </div>
                    <input value={item.texte} onChange={e=>{const arr=[...sections.utilisation.items];arr[i]={...arr[i],texte:e.target.value};setSections(s=>({...s,utilisation:{...s.utilisation,items:arr}}))}} style={inp} placeholder="Description de l'étape" />
                  </div>
                ))}
                <button onClick={()=>setSections(s=>({...s,utilisation:{...s.utilisation,items:[...s.utilisation.items,{etape:s.utilisation.items.length+1,titre:"",texte:""}]}}))} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter une étape</button>
              </div>
            )}
          </div>

          {/* Composition */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.composition.active?S.gold:S.border}`, overflow:"hidden" }}>
            <SectionHeader label="🧪 Composition — ingrédients / composants" active={sections.composition.active} onToggle={() => setSections(s=>({...s,composition:{...s.composition,active:!s.composition.active}}))} />
            {sections.composition.active && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${S.border}` }}>
                <input value={sections.composition.titre} onChange={e=>setSections(s=>({...s,composition:{...s.composition,titre:e.target.value}}))} style={{...inp,marginTop:10,marginBottom:10}} placeholder="Titre" />
                {sections.composition.items.map((item,i)=>(
                  <div key={i} style={{ display:"flex",gap:8,marginBottom:8 }}>
                    <input value={item.nom} onChange={e=>{const arr=[...sections.composition.items];arr[i]={...arr[i],nom:e.target.value};setSections(s=>({...s,composition:{...s.composition,items:arr}}))}} style={{...inp,flex:1}} placeholder="Nom ingrédient" />
                    <input value={item.description} onChange={e=>{const arr=[...sections.composition.items];arr[i]={...arr[i],description:e.target.value};setSections(s=>({...s,composition:{...s.composition,items:arr}}))}} style={{...inp,flex:2}} placeholder="Description / rôle" />
                    <button onClick={()=>setSections(s=>({...s,composition:{...s.composition,items:s.composition.items.filter((_,j)=>j!==i)}}))} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
                  </div>
                ))}
                <button onClick={()=>setSections(s=>({...s,composition:{...s.composition,items:[...s.composition.items,{nom:"",description:""}]}}))} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter un ingrédient</button>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.faq.active?S.gold:S.border}`, overflow:"hidden" }}>
            <SectionHeader label="❓ FAQ — questions fréquentes" active={sections.faq.active} onToggle={() => setSections(s=>({...s,faq:{...s.faq,active:!s.faq.active}}))} />
            {sections.faq.active && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${S.border}` }}>
                <input value={sections.faq.titre} onChange={e=>setSections(s=>({...s,faq:{...s.faq,titre:e.target.value}}))} style={{...inp,marginTop:10,marginBottom:10}} placeholder="Titre" />
                {sections.faq.items.map((item,i)=>(
                  <div key={i} style={{ background:S.bg, borderRadius:8, padding:10, marginBottom:8, border:`1px solid ${S.border}` }}>
                    <div style={{ display:"flex",gap:8,marginBottom:6 }}>
                      <input value={item.question} onChange={e=>{const arr=[...sections.faq.items];arr[i]={...arr[i],question:e.target.value};setSections(s=>({...s,faq:{...s.faq,items:arr}}))}} style={{...inp,flex:1}} placeholder="Question ?" />
                      <button onClick={()=>setSections(s=>({...s,faq:{...s.faq,items:s.faq.items.filter((_,j)=>j!==i)}}))} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
                    </div>
                    <textarea value={item.reponse} onChange={e=>{const arr=[...sections.faq.items];arr[i]={...arr[i],reponse:e.target.value};setSections(s=>({...s,faq:{...s.faq,items:arr}}))}} style={{...inp,resize:"none",height:60}} placeholder="Réponse..." />
                  </div>
                ))}
                <button onClick={()=>setSections(s=>({...s,faq:{...s.faq,items:[...s.faq.items,{question:"",reponse:""}]}}))} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter une question</button>
              </div>
            )}
          </div>

          {/* Garantie */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.garantie.active?S.gold:S.border}`, overflow:"hidden" }}>
            <SectionHeader label="🛡️ Garantie — rassure le client" active={sections.garantie.active} onToggle={() => setSections(s=>({...s,garantie:{...s.garantie,active:!s.garantie.active}}))} />
            {sections.garantie.active && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${S.border}`, display:"flex", gap:8, marginTop:10 }}>
                <input value={sections.garantie.icone} onChange={e=>setSections(s=>({...s,garantie:{...s.garantie,icone:e.target.value}}))} style={{...inp,width:60}} placeholder="🛡️" />
                <input value={sections.garantie.texte} onChange={e=>setSections(s=>({...s,garantie:{...s.garantie,texte:e.target.value}}))} style={{...inp,flex:1}} placeholder="Satisfait ou remboursé 30 jours" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ⭐ ONGLET PREUVES SOCIALES
      ══════════════════════════════════════════ */}
      {tab === "preuves" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Social proof chiffres */}
          <div style={{ background:S.card2, borderRadius:12, padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p style={{ color:S.muted2, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>⭐ Chiffres clés — affichés sous le prix</p>
              <button onClick={() => setSpActive(!spActive)} style={{ padding:"4px 12px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer", background:spActive?"rgba(74,222,128,0.15)":S.card, color:spActive?S.success:S.muted }}>
                {spActive ? "Activé" : "Désactivé"}
              </button>
            </div>
            {spActive && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Note sur 5 (ex: 4.9)</label>
                  <input type="number" step="0.1" min="1" max="5" value={spNote} onChange={e => setSpNote(e.target.value)} style={inp} placeholder="4.9" />
                </div>
                <div>
                  <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Nombre d'avis</label>
                  <input type="number" value={spAvisCount} onChange={e => setSpAvisCount(e.target.value)} style={inp} placeholder="127" />
                </div>
                <div>
                  <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Clients satisfaits</label>
                  <input type="number" value={spClientsCount} onChange={e => setSpClientsCount(e.target.value)} style={inp} placeholder="2000" />
                </div>
                <div>
                  <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Dernière commande (min)</label>
                  <input type="number" value={spDerniereCommande} onChange={e => setSpDerniereCommande(e.target.value)} style={inp} placeholder="8" />
                </div>
              </div>
            )}
          </div>

          {/* Témoignages */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${temoignages.active?S.gold:S.border}`, overflow:"hidden" }}>
            <SectionHeader label="💬 Témoignages clients — avis avec photo" active={temoignages.active} onToggle={() => setTemoignages(t=>({...t,active:!t.active}))} />
            {temoignages.active && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${S.border}` }}>
                <input value={temoignages.titre} onChange={e=>setTemoignages(t=>({...t,titre:e.target.value}))} style={{...inp,marginTop:10,marginBottom:10}} placeholder="Titre de la section" />
                {temoignages.items.map((item,i)=>(
                  <div key={i} style={{ background:S.bg, borderRadius:10, padding:12, marginBottom:10, border:`1px solid ${S.border}` }}>
                    <div style={{ display:"flex",gap:8,marginBottom:8 }}>
                      <input value={item.nom} onChange={e=>{const arr=[...temoignages.items];arr[i]={...arr[i],nom:e.target.value};setTemoignages(t=>({...t,items:arr}))}} style={{...inp,flex:1}} placeholder="Prénom Nom" />
                      <input value={item.ville} onChange={e=>{const arr=[...temoignages.items];arr[i]={...arr[i],ville:e.target.value};setTemoignages(t=>({...t,items:arr}))}} style={{...inp,flex:1}} placeholder="Ville" />
                      <select value={item.note} onChange={e=>{const arr=[...temoignages.items];arr[i]={...arr[i],note:Number(e.target.value)};setTemoignages(t=>({...t,items:arr}))}} style={{...inp,width:70}}>
                        {[5,4,3,2,1].map(n=><option key={n} value={n}>{n}⭐</option>)}
                      </select>
                      <button onClick={()=>setTemoignages(t=>({...t,items:t.items.filter((_,j)=>j!==i)}))} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
                    </div>
                    <input value={item.photo||""} onChange={e=>{const arr=[...temoignages.items];arr[i]={...arr[i],photo:e.target.value};setTemoignages(t=>({...t,items:arr}))}} style={{...inp,marginBottom:8}} placeholder="Photo URL (optionnel)" />
                    <textarea value={item.texte} onChange={e=>{const arr=[...temoignages.items];arr[i]={...arr[i],texte:e.target.value};setTemoignages(t=>({...t,items:arr}))}} style={{...inp,resize:"none",height:70}} placeholder="Témoignage..." />
                  </div>
                ))}
                <button onClick={()=>setTemoignages(t=>({...t,items:[...t.items,{nom:"",ville:"",texte:"",note:5,photo:""}]}))} style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter un témoignage</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ↕️ ONGLET ORDRE
      ══════════════════════════════════════════ */}
      {tab === "ordre" && (
        <div>
          <p style={{ color:S.muted2, fontSize:13, marginBottom:16 }}>Déplace les sections dans l'ordre que tu veux sur ta page de vente.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {sectionsOrdre.map((key, i) => (
              <div key={key} style={{ display:"flex", gap:10, alignItems:"center", background:S.card2, borderRadius:12, padding:"12px 14px", border:`1px solid ${S.border}` }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{sectionLabels[key]?.split(" ")[0]}</span>
                <span style={{ color:S.white, fontSize:13, flex:1, fontWeight:600 }}>{sectionLabels[key]?.split(" ").slice(1).join(" ")}</span>
                <div style={{ display:"flex", gap:4 }}>
                  <button onClick={() => moveSection(i,-1)} disabled={i===0}
                    style={{ width:30,height:30,borderRadius:8,border:`1px solid ${S.border}`,background:"transparent",color:i===0?S.muted:S.gold,fontSize:14,cursor:i===0?"default":"pointer" }}>↑</button>
                  <button onClick={() => moveSection(i,1)} disabled={i===sectionsOrdre.length-1}
                    style={{ width:30,height:30,borderRadius:8,border:`1px solid ${S.border}`,background:"transparent",color:i===sectionsOrdre.length-1?S.muted:S.gold,fontSize:14,cursor:i===sectionsOrdre.length-1?"default":"pointer" }}>↓</button>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color:S.muted2, fontSize:11, marginTop:12 }}>N'oublie pas de cliquer sur Enregistrer.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════
          🎨 ONGLET DESIGN
      ══════════════════════════════════════════ */}
      {tab === "design" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:8 }}>Thème de couleur</label>
            <div style={{ display:"flex", gap:8 }}>
              {[["dark","🌙 Sombre"],["light","☀️ Clair"]].map(([id, label]) => (
                <button key={id} onClick={() => { setTheme(id); setCouleurFond(id==="dark"?"#080810":"#FFFFFF") }}
                  style={{ flex:1, padding:"12px", borderRadius:10, border:`2px solid ${theme===id?S.gold:S.border}`, background:theme===id?"rgba(245,158,11,0.08)":"transparent", color:theme===id?S.gold:S.muted2, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:8 }}>Police du texte</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["Inter","Poppins","Montserrat","Playfair Display","Bebas Neue"].map(f => (
                <button key={f} onClick={() => setFont(f)}
                  style={{ padding:"8px 16px", borderRadius:20, border:`1px solid ${font===f?S.gold:S.border}`, background:font===f?"rgba(245,158,11,0.1)":"transparent", color:font===f?S.gold:S.muted2, fontSize:13, cursor:"pointer", fontFamily:f }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Couleur principale</label>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="color" value={couleurAccent} onChange={e => setCouleurAccent(e.target.value)} style={{ width:40, height:36, borderRadius:8, border:`1px solid ${S.border}`, cursor:"pointer" }} />
                <input value={couleurAccent} onChange={e => setCouleurAccent(e.target.value)} style={{ ...inp, flex:1 }} />
              </div>
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Couleur de fond</label>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="color" value={couleurFond} onChange={e => setCouleurFond(e.target.value)} style={{ width:40, height:36, borderRadius:8, border:`1px solid ${S.border}`, cursor:"pointer" }} />
                <input value={couleurFond} onChange={e => setCouleurFond(e.target.value)} style={{ ...inp, flex:1 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          👁️ ONGLET APERÇU
      ══════════════════════════════════════════ */}
      {tab === "apercu" && (
        <div style={{ textAlign:"center", padding:"20px 0" }}>
          {editId ? (
            <>
              <p style={{ color:S.muted2, fontSize:13, marginBottom:16 }}>
                La page s'ouvre dans un nouvel onglet avec tes dernières modifications enregistrées.
              </p>
              <a href={pageUrl(nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""))} target="_blank" rel="noreferrer"
                style={{ display:"inline-block", padding:"14px 28px", borderRadius:12, background:`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:"#000", fontSize:14, fontWeight:700, textDecoration:"none", marginBottom:16 }}>
                👁️ Voir ma page de vente
              </a>
              <p style={{ color:S.muted, fontSize:11 }}>
                {pageUrl(nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""))}
              </p>
            </>
          ) : (
            <div style={{ background:S.card2, borderRadius:14, padding:"32px 20px" }}>
              <p style={{ color:S.danger, fontSize:13, marginBottom:8 }}>⚠️ Enregistre le produit d'abord</p>
              <p style={{ color:S.muted2, fontSize:12 }}>Clique sur Enregistrer en haut pour voir ta page.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ── Liste des produits ──
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <p style={{ color:S.white, fontSize:15, fontWeight:700, margin:"0 0 4px" }}>📦 Mes produits</p>
          <p style={{ color:S.muted2, fontSize:13, margin:0 }}>Crée et personnalise tes pages de vente.</p>
        </div>
        <button onClick={openNew} style={{ padding:"9px 18px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:"#000", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          + Nouveau produit
        </button>
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", background:S.card, borderRadius:14, border:`1px solid ${S.border}` }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📦</div>
          <p style={{ color:S.white, fontSize:15, fontWeight:700, margin:"0 0 8px" }}>Aucun produit créé</p>
          <p style={{ color:S.muted2, fontSize:13, margin:"0 0 20px" }}>Crée ton premier produit et personnalise ta page de vente.</p>
          <button onClick={openNew} style={{ padding:"10px 24px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:"#000", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            + Créer un produit
          </button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {products.map(p => (
            <div key={p.id} style={{ background:S.card, border:`1px solid ${p.is_active?S.border:"rgba(248,113,113,0.2)"}`, borderRadius:14, padding:"14px 16px", display:"flex", gap:14, alignItems:"center", flexWrap:"wrap" }}>
              {p.image_principale ? (
                <img src={p.image_principale} alt={p.nom} style={{ width:56, height:56, borderRadius:10, objectFit:"cover", flexShrink:0 }} />
              ) : (
                <div style={{ width:56, height:56, borderRadius:10, background:S.card2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>📦</div>
              )}
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <p style={{ color:S.white, fontSize:14, fontWeight:700, margin:0 }}>{p.nom}</p>
                  {p.badge && <span style={{ background:"rgba(245,158,11,0.15)", color:S.gold, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{p.badge}</span>}
                  {!p.is_active && <span style={{ background:S.dangerBg, color:S.danger, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>Inactif</span>}
                </div>
                <p style={{ color:S.gold, fontSize:14, fontWeight:800, margin:"0 0 2px" }}>
                  {p.prix.toLocaleString("fr-FR")} {p.devise}
                  {p.prix_barre && <span style={{ color:S.muted, fontSize:12, fontWeight:400, textDecoration:"line-through", marginLeft:8 }}>{p.prix_barre.toLocaleString("fr-FR")}</span>}
                </p>
                <p style={{ color:S.muted2, fontSize:11, margin:0 }}>{p.vues||0} vues · {p.commandes||0} commandes</p>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => openEdit(p.id)} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${S.border}`, background:"transparent", color:S.gold, fontSize:12, cursor:"pointer" }}>✏️ Éditer</button>
                <a href={pageUrl(p.slug)} target="_blank" rel="noreferrer" style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${S.border}`, background:"transparent", color:"#60A5FA", fontSize:12, cursor:"pointer", textDecoration:"none" }}>👁️ Voir</a>
                <button onClick={() => handleDelete(p.id)} style={{ padding:"6px 12px", borderRadius:8, border:"none", background:S.dangerBg, color:S.danger, fontSize:12, cursor:"pointer" }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
