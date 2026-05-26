"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"

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

export default function ProduitsView({ tenantId, tenantSlug }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("base")

  // Formulaire
  const [nom, setNom] = useState("")
  const [prix, setPrix] = useState("")
  const [prixBarre, setPrixBarre] = useState("")
  const [devise, setDevise] = useState("FCFA")
  const [badge, setBadge] = useState("")
  const [imagePrincipale, setImagePrincipale] = useState("")
  const [description, setDescription] = useState("")
  const [heroTitre, setHeroTitre] = useState("")
  const [heroSousTitre, setHeroSousTitre] = useState("")
  const [heroCta, setHeroCta] = useState("Commander maintenant")
  const [isActive, setIsActive] = useState(true)
  const [spActive, setSpActive] = useState(true)
  const [spNote, setSpNote] = useState("4.9")
  const [spAvisCount, setSpAvisCount] = useState("127")
  const [spClientsCount, setSpClientsCount] = useState("2000")
  const [spDerniereCommande, setSpDerniereCommande] = useState("8")
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [imagesGalerie, setImagesGalerie] = useState<string[]>([])
  const [sectionsOrdre, setSectionsOrdre] = useState<string[]>(["galerie","description","probleme","benefices","utilisation","composition","temoignages","comparaison","faq","garantie","formulaire"])
  const [sections, setSections] = useState({
    probleme: { active:false, titre:"Vous souffrez de ça ?", items:[] as {emoji:string;texte:string}[] },
    benefices: { active:false, titre:"Pourquoi choisir ce produit ?", items:[] as {emoji:string;titre:string;texte:string}[] },
    temoignages: { active:false, titre:"Ce qu'ils en disent", items:[] as {nom:string;ville:string;texte:string;note:number;photo:string}[] },
    faq: { active:false, titre:"Questions fréquentes", items:[] as {question:string;reponse:string}[] },
    garantie: { active:false, texte:"Satisfait ou remboursé 30 jours", icone:"🛡️" },
    composition: { active:false, titre:"Composition", items:[] as {nom:string;description:string}[] },
    utilisation: { active:false, titre:"Comment ça marche ?", items:[] as {etape:number;titre:string;texte:string}[] },
  })
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
      const { error } = await supabase.storage
        .from("shipivo-images")
        .upload(fileName, file, { upsert: true, contentType: file.type })
      if (error) { alert("Erreur upload: " + error.message); setUploadingImg(false); return }
      const { data: urlData } = supabase.storage.from("shipivo-images").getPublicUrl(fileName)
      setImagePrincipale(urlData.publicUrl)
    } catch (e) {
      alert("Erreur lors de l upload de l image")
    }
    setUploadingImg(false)
  }

  const uploadGalleryImage = async (file: File) => {
    setUploadingGallery(true)
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const fileName = `produits/${tenantId}/galerie-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from("shipivo-images").upload(fileName, file, { upsert: true, contentType: file.type })
      if (error) { alert("Erreur: " + error.message); setUploadingGallery(false); return }
      const { data: urlData } = supabase.storage.from("shipivo-images").getPublicUrl(fileName)
      setImagesGalerie(prev => [...prev, urlData.publicUrl])
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

  const sectionLabels: Record<string,string> = {
    galerie:"🖼️ Galerie photos", description:"📝 Description",
    probleme:"😣 Problème", benefices:"✅ Bénéfices",
    utilisation:"📋 Mode d'emploi", composition:"🧪 Composition",
    temoignages:"⭐ Témoignages", comparaison:"🏆 Comparaison",
    faq:"❓ FAQ", garantie:"🛡️ Garantie", formulaire:"🛒 Formulaire"
  }

  const resetForm = () => {
    setNom(""); setPrix(""); setPrixBarre(""); setDevise("FCFA"); setBadge("")
    setImagePrincipale(""); setDescription(""); setHeroTitre(""); setHeroSousTitre("")
    setHeroCta("Commander maintenant"); setIsActive(true); setTheme("dark")
    setSpActive(true); setSpNote("4.9"); setSpAvisCount("127"); setSpClientsCount("2000"); setSpDerniereCommande("8")
    setFont("Poppins"); setCouleurAccent("#F59E0B"); setCouleurFond("#080810")
    setImagesGalerie([]); setSectionsOrdre(["galerie","description","probleme","benefices","utilisation","composition","temoignages","comparaison","faq","garantie","formulaire"])
    setSections({ probleme:{active:false,titre:"Vous souffrez de ça ?",items:[]}, benefices:{active:false,titre:"Pourquoi choisir ce produit ?",items:[]}, temoignages:{active:false,titre:"Ce qu'ils en disent",items:[]}, faq:{active:false,titre:"Questions fréquentes",items:[]}, garantie:{active:false,texte:"Satisfait ou remboursé 30 jours",icone:"🛡️"}, composition:{active:false,titre:"Composition",items:[]}, utilisation:{active:false,titre:"Comment ça marche ?",items:[]} })
    setEditId(null); setTab("base"); setError("")
  }

  const openNew = () => { resetForm(); setShowEditor(true) }

  const openEdit = async (id: string) => {
    const { data } = await supabase.from("products").select("*").eq("id", id).single()
    if (!data) return
    setNom(data.nom || ""); setPrix(String(data.prix || "")); setPrixBarre(data.prix_barre ? String(data.prix_barre) : "")
    setDevise(data.devise || "FCFA"); setBadge(data.badge || ""); setImagePrincipale(data.image_principale || "")
    setDescription(data.description || ""); setHeroTitre(data.hero_titre || ""); setHeroSousTitre(data.hero_sous_titre || "")
    setHeroCta(data.hero_cta_texte || "Commander maintenant"); setIsActive(data.is_active !== false)
    setSpActive(data.sp_active !== false); setSpNote(String(data.sp_note || "4.9"))
    setSpAvisCount(String(data.sp_avis_count || "127")); setSpClientsCount(String(data.sp_clients_count || "2000"))
    setSpDerniereCommande(String(data.sp_derniere_commande || "8"))
    setTheme(data.theme || "dark"); setFont(data.font || "Poppins")
    setCouleurAccent(data.couleur_accent || "#F59E0B"); setCouleurFond(data.couleur_fond || "#080810")
    setImagesGalerie(data.images || [])
    try { setSectionsOrdre(data.sections_ordre ? JSON.parse(data.sections_ordre) : ["galerie","description","probleme","benefices","utilisation","composition","temoignages","comparaison","faq","garantie","formulaire"]) } catch { setSectionsOrdre(["galerie","description","probleme","benefices","utilisation","composition","temoignages","comparaison","faq","garantie","formulaire"]) }
    setSections({
      probleme: { active:data.section_probleme_active||false, titre:data.section_probleme_titre||"Vous souffrez de ça ?", items:data.section_probleme_items||[] },
      benefices: { active:data.section_benefices_active||false, titre:data.section_benefices_titre||"Pourquoi choisir ce produit ?", items:data.section_benefices_items||[] },
      temoignages: { active:data.section_temoignages_active||false, titre:data.section_temoignages_titre||"Ce qu'ils en disent", items:data.section_temoignages_items||[] },
      faq: { active:data.section_faq_active||false, titre:data.section_faq_titre||"Questions fréquentes", items:data.section_faq_items||[] },
      garantie: { active:data.section_garantie_active||false, texte:data.section_garantie_texte||"Satisfait ou remboursé 30 jours", icone:data.section_garantie_icone||"🛡️" },
      composition: { active:data.section_composition_active||false, titre:data.section_composition_titre||"Composition", items:data.section_composition_items||[] },
      utilisation: { active:data.section_utilisation_active||false, titre:data.section_utilisation_titre||"Comment ça marche ?", items:data.section_utilisation_items||[] },
    })
    setEditId(id); setShowEditor(true); setTab("base")
  }

  const handleSave = async () => {
    if (!nom.trim()) { setError("Nom requis."); return }
    if (!prix) { setError("Prix requis."); return }
    setSaving(true); setError("")
    // Slug sécurisé — gère les accents et caractères spéciaux
    const slugBase = nom.trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      || "produit"
    // Ajouter timestamp pour éviter les doublons
    const slug = editId ? slugBase : `${slugBase}-${Date.now().toString(36)}`
    const payload = {
      tenant_id: tenantId, nom: nom.trim(), slug, prix: Number(prix),
      prix_barre: prixBarre ? Number(prixBarre) : null, devise, badge, is_active: isActive,
      image_principale: imagePrincipale, images: imagesGalerie,
      description, hero_titre: heroTitre,
      hero_sous_titre: heroSousTitre, hero_cta_texte: heroCta,
      theme, font, couleur_accent: couleurAccent, couleur_fond: couleurFond,
      sp_active: spActive, sp_note: parseFloat(spNote)||4.9,
      sp_avis_count: parseInt(spAvisCount)||127,
      sp_clients_count: parseInt(spClientsCount)||2000,
      sp_derniere_commande: parseInt(spDerniereCommande)||8,
      sections_ordre: JSON.stringify(sectionsOrdre),
      section_probleme_active: sections.probleme.active,
      section_probleme_titre: sections.probleme.titre,
      section_probleme_items: sections.probleme.items,
      section_benefices_active: sections.benefices.active,
      section_benefices_titre: sections.benefices.titre,
      section_benefices_items: sections.benefices.items,
      section_temoignages_active: sections.temoignages.active,
      section_temoignages_titre: sections.temoignages.titre,
      section_temoignages_items: sections.temoignages.items,
      section_faq_active: sections.faq.active,
      section_faq_titre: sections.faq.titre,
      section_faq_items: sections.faq.items,
      section_garantie_active: sections.garantie.active,
      section_garantie_texte: sections.garantie.texte,
      section_garantie_icone: sections.garantie.icone,
      section_composition_active: sections.composition.active,
      section_composition_titre: sections.composition.titre,
      section_composition_items: sections.composition.items,
      section_utilisation_active: sections.utilisation.active,
      section_utilisation_titre: sections.utilisation.titre,
      section_utilisation_items: sections.utilisation.items,
      updated_at: new Date().toISOString()
    }
    if (editId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editId)
      if (error) { setError("Erreur: " + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from("products").insert(payload)
      if (error) { setError("Erreur: " + error.message); setSaving(false); return }
    }
    await loadProducts()
    setShowEditor(false); resetForm(); setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return
    await supabase.from("products").delete().eq("id", id)
    await loadProducts()
  }

  const inp: React.CSSProperties = {
    width: "100%", background: S.bg, border: `1px solid ${S.border}`,
    borderRadius: 8, padding: "10px 12px", color: S.white, fontSize: 13,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit"
  }

  const pageUrl = (slug: string) => `https://shipivo.app/produit/${tenantSlug}/${slug}`

  if (loading) return <p style={{ color: S.muted, textAlign: "center", padding: 32 }}>Chargement...</p>

  if (showEditor) return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => { setShowEditor(false); resetForm() }} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.muted2, fontSize: 13, cursor: "pointer" }}>
          ← Retour
        </button>
        <p style={{ color: S.white, fontSize: 15, fontWeight: 700, margin: 0, flex: 1 }}>
          {editId ? `Modifier : ${nom}` : "Nouveau produit"}
        </p>
        <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: saving ? S.muted : `linear-gradient(135deg,${S.gold},${S.goldDk})`, color: "#000", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Enregistrement..." : "✅ Enregistrer"}
        </button>
      </div>

      {error && <div style={{ background: S.dangerBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: S.danger, fontSize: 13 }}>⚠️ {error}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, marginBottom: 20, background: S.card, borderRadius: 12, padding: 4, flexWrap: "wrap" }}>
        {[["base","📦 Produit"],["galerie","🖼️ Galerie"],["sections","📋 Sections"],["ordre","↕️ Ordre"],["design","🎨 Design"],["apercu","👁️ Aperçu"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", minWidth: 70, background: tab === id ? S.gold : "transparent", color: tab === id ? "#000" : S.muted2 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "base" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 6 }}>Nom du produit *</label>
              <input value={nom} onChange={e => setNom(e.target.value)} style={inp} placeholder="Ex: THERAWOLF Baume" />
            </div>
            <div>
              <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 6 }}>Badge</label>
              <select value={badge} onChange={e => setBadge(e.target.value)} style={inp}>
                <option value="">Aucun</option>
                {["NOUVEAU","PROMO","BEST-SELLER","RUPTURE"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inp, resize: "none", height: 70 }} placeholder="Description du produit..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 6 }}>Prix *</label>
              <input type="number" value={prix} onChange={e => setPrix(e.target.value)} style={inp} placeholder="15000" />
            </div>
            <div>
              <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 6 }}>Prix barré</label>
              <input type="number" value={prixBarre} onChange={e => setPrixBarre(e.target.value)} style={inp} placeholder="20000" />
            </div>
            <div>
              <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 6 }}>Devise</label>
              <select value={devise} onChange={e => setDevise(e.target.value)} style={inp}>
                {["FCFA","XOF","XAF","USD","EUR","GHS","NGN"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 6 }}>Image principale</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImg}
                style={{ padding: "10px 16px", borderRadius: 8, border: `1px dashed ${S.gold}`, background: "rgba(245,158,11,0.05)", color: S.gold, fontSize: 13, fontWeight: 600, cursor: uploadingImg ? "not-allowed" : "pointer", flexShrink: 0 }}>
                {uploadingImg ? "⏳ Upload..." : "📁 Choisir une image"}
              </button>
              <input value={imagePrincipale} onChange={e => setImagePrincipale(e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Ou colle une URL..." />
            </div>
            {imagePrincipale && (
              <div style={{ marginTop: 8, position: "relative", display: "inline-block" }}>
                <img src={imagePrincipale} alt="" style={{ height: 100, borderRadius: 10, objectFit: "cover", border: `2px solid ${S.gold}` }} />
                <button onClick={() => setImagePrincipale("")} style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", border: "none", background: S.danger, color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            )}
          </div>

          <div style={{ background: S.card2, borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ color: S.muted2, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Textes de la page</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 4 }}>Titre accrocheur</label>
                <input value={heroTitre} onChange={e => setHeroTitre(e.target.value)} style={inp} placeholder="Ex: Dites adieu à la douleur..." />
              </div>
              <div>
                <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 4 }}>Sous-titre</label>
                <input value={heroSousTitre} onChange={e => setHeroSousTitre(e.target.value)} style={inp} placeholder="Ex: La solution naturelle..." />
              </div>
              <div>
                <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 4 }}>Texte bouton commander</label>
                <input value={heroCta} onChange={e => setHeroCta(e.target.value)} style={inp} placeholder="Commander maintenant" />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: S.muted2, fontSize: 13 }}>Produit actif</span>
            <button onClick={() => setIsActive(!isActive)} style={{ padding: "5px 14px", borderRadius: 20, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: isActive ? "rgba(74,222,128,0.15)" : S.card2, color: isActive ? S.success : S.muted }}>
              {isActive ? "✅ Actif" : "Inactif"}
            </button>
          </div>

          {/* ── Social Proof ── */}
          <div style={{ background: S.card2, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ color: S.muted2, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>⭐ Social Proof (Hero)</p>
              <button onClick={() => setSpActive(!spActive)} style={{ padding: "4px 12px", borderRadius: 20, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: spActive ? "rgba(74,222,128,0.15)" : S.card2, color: spActive ? S.success : S.muted }}>
                {spActive ? "Activé" : "Désactivé"}
              </button>
            </div>
            {spActive && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 4 }}>Note (ex: 4.9)</label>
                  <input type="number" step="0.1" min="1" max="5" value={spNote} onChange={e => setSpNote(e.target.value)} style={inp} placeholder="4.9" />
                </div>
                <div>
                  <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 4 }}>Nombre d'avis</label>
                  <input type="number" value={spAvisCount} onChange={e => setSpAvisCount(e.target.value)} style={inp} placeholder="127" />
                </div>
                <div>
                  <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 4 }}>Clients satisfaits</label>
                  <input type="number" value={spClientsCount} onChange={e => setSpClientsCount(e.target.value)} style={inp} placeholder="2000" />
                </div>
                <div>
                  <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 4 }}>Dernière commande (min)</label>
                  <input type="number" value={spDerniereCommande} onChange={e => setSpDerniereCommande(e.target.value)} style={inp} placeholder="8" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "design" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 8 }}>Thème</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[["dark","🌙 Sombre"],["light","☀️ Clair"]].map(([id, label]) => (
                <button key={id} onClick={() => { setTheme(id); setCouleurFond(id === "dark" ? "#080810" : "#FFFFFF") }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${theme === id ? S.gold : S.border}`, background: theme === id ? "rgba(245,158,11,0.08)" : "transparent", color: theme === id ? S.gold : S.muted2, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 8 }}>Police</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Inter","Poppins","Montserrat","Playfair Display","Bebas Neue"].map(f => (
                <button key={f} onClick={() => setFont(f)} style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${font === f ? S.gold : S.border}`, background: font === f ? "rgba(245,158,11,0.1)" : "transparent", color: font === f ? S.gold : S.muted2, fontSize: 13, cursor: "pointer", fontFamily: f }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 6 }}>Couleur accent</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={couleurAccent} onChange={e => setCouleurAccent(e.target.value)} style={{ width: 40, height: 36, borderRadius: 8, border: `1px solid ${S.border}`, cursor: "pointer" }} />
                <input value={couleurAccent} onChange={e => setCouleurAccent(e.target.value)} style={{ ...inp, flex: 1 }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", color: S.muted2, fontSize: 12, marginBottom: 6 }}>Couleur de fond</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={couleurFond} onChange={e => setCouleurFond(e.target.value)} style={{ width: 40, height: 36, borderRadius: 8, border: `1px solid ${S.border}`, cursor: "pointer" }} />
                <input value={couleurFond} onChange={e => setCouleurFond(e.target.value)} style={{ ...inp, flex: 1 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Galerie ── */}
      {tab === "galerie" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: S.muted2, fontSize: 13 }}>Ajoute plusieurs photos de ton produit. La galerie apparaît sur ta page de vente avec des miniatures cliquables.</p>
          <input ref={galleryInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f) uploadGalleryImage(f) }} />
          <button onClick={() => galleryInputRef.current?.click()} disabled={uploadingGallery}
            style={{ padding:"12px", borderRadius:10, border:`1px dashed ${S.gold}`, background:"rgba(245,158,11,0.05)", color:S.gold, fontSize:13, fontWeight:600, cursor:uploadingGallery?"not-allowed":"pointer" }}>
            {uploadingGallery ? "⏳ Upload..." : "📁 Ajouter une photo à la galerie"}
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
          <p style={{ color:S.muted, fontSize:11 }}>Glisse les photos pour les réordonner. La 1ère est l'image principale.</p>
        </div>
      )}

      {/* ── Tab Sections ── */}
      {tab === "sections" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: S.muted2, fontSize: 13, marginBottom: 4 }}>Active les sections et remplis le contenu. Pour changer l'ordre, va dans l'onglet ↕️ Ordre.</p>

          {/* Problème */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.probleme.active?S.gold:S.border}`, overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px" }}>
              <span style={{ color:S.white, fontSize:13, fontWeight:700 }}>😣 Section Problème</span>
              <button onClick={() => setSections(s=>({...s,probleme:{...s.probleme,active:!s.probleme.active}}))}
                style={{ padding:"4px 12px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer", background:sections.probleme.active?"rgba(74,222,128,0.15)":S.bg, color:sections.probleme.active?S.success:S.muted }}>
                {sections.probleme.active?"✅ Activée":"Activer"}
              </button>
            </div>
            {sections.probleme.active && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${S.border}` }}>
                <input value={sections.probleme.titre} onChange={e=>setSections(s=>({...s,probleme:{...s.probleme,titre:e.target.value}}))}
                  style={{...inp,marginTop:10,marginBottom:10}} placeholder="Titre de la section" />
                {sections.probleme.items.map((item,i)=>(
                  <div key={i} style={{ display:"flex",gap:8,marginBottom:8 }}>
                    <input value={item.emoji} onChange={e=>{const arr=[...sections.probleme.items];arr[i]={...arr[i],emoji:e.target.value};setSections(s=>({...s,probleme:{...s.probleme,items:arr}}))}} style={{...inp,width:60}} placeholder="😣" />
                    <input value={item.texte} onChange={e=>{const arr=[...sections.probleme.items];arr[i]={...arr[i],texte:e.target.value};setSections(s=>({...s,probleme:{...s.probleme,items:arr}}))}} style={{...inp,flex:1}} placeholder="Description du problème" />
                    <button onClick={()=>setSections(s=>({...s,probleme:{...s.probleme,items:s.probleme.items.filter((_,j)=>j!==i)}}))} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
                  </div>
                ))}
                <button onClick={()=>setSections(s=>({...s,probleme:{...s.probleme,items:[...s.probleme.items,{emoji:"😣",texte:""}]}}))}
                  style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter un problème</button>
              </div>
            )}
          </div>

          {/* Bénéfices */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.benefices.active?S.gold:S.border}`, overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px" }}>
              <span style={{ color:S.white, fontSize:13, fontWeight:700 }}>✅ Section Bénéfices</span>
              <button onClick={() => setSections(s=>({...s,benefices:{...s.benefices,active:!s.benefices.active}}))}
                style={{ padding:"4px 12px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer", background:sections.benefices.active?"rgba(74,222,128,0.15)":S.bg, color:sections.benefices.active?S.success:S.muted }}>
                {sections.benefices.active?"✅ Activée":"Activer"}
              </button>
            </div>
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
                <button onClick={()=>setSections(s=>({...s,benefices:{...s.benefices,items:[...s.benefices.items,{emoji:"✅",titre:"",texte:""}]}}))}
                  style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter un bénéfice</button>
              </div>
            )}
          </div>

          {/* Témoignages */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.temoignages.active?S.gold:S.border}`, overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px" }}>
              <span style={{ color:S.white, fontSize:13, fontWeight:700 }}>⭐ Section Témoignages</span>
              <button onClick={() => setSections(s=>({...s,temoignages:{...s.temoignages,active:!s.temoignages.active}}))}
                style={{ padding:"4px 12px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer", background:sections.temoignages.active?"rgba(74,222,128,0.15)":S.bg, color:sections.temoignages.active?S.success:S.muted }}>
                {sections.temoignages.active?"✅ Activée":"Activer"}
              </button>
            </div>
            {sections.temoignages.active && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${S.border}` }}>
                <input value={sections.temoignages.titre} onChange={e=>setSections(s=>({...s,temoignages:{...s.temoignages,titre:e.target.value}}))} style={{...inp,marginTop:10,marginBottom:10}} placeholder="Titre" />
                {sections.temoignages.items.map((item,i)=>(
                  <div key={i} style={{ background:S.bg, borderRadius:10, padding:12, marginBottom:10, border:`1px solid ${S.border}` }}>
                    <div style={{ display:"flex",gap:8,marginBottom:8 }}>
                      <input value={item.nom} onChange={e=>{const arr=[...sections.temoignages.items];arr[i]={...arr[i],nom:e.target.value};setSections(s=>({...s,temoignages:{...s.temoignages,items:arr}}))}} style={{...inp,flex:1}} placeholder="Nom" />
                      <input value={item.ville} onChange={e=>{const arr=[...sections.temoignages.items];arr[i]={...arr[i],ville:e.target.value};setSections(s=>({...s,temoignages:{...s.temoignages,items:arr}}))}} style={{...inp,flex:1}} placeholder="Ville" />
                      <select value={item.note} onChange={e=>{const arr=[...sections.temoignages.items];arr[i]={...arr[i],note:Number(e.target.value)};setSections(s=>({...s,temoignages:{...s.temoignages,items:arr}}))}} style={{...inp,width:70}}>
                        {[5,4,3,2,1].map(n=><option key={n} value={n}>{n}⭐</option>)}
                      </select>
                      <button onClick={()=>setSections(s=>({...s,temoignages:{...s.temoignages,items:s.temoignages.items.filter((_,j)=>j!==i)}}))} style={{padding:"4px 10px",borderRadius:8,border:"none",background:S.dangerBg,color:S.danger,cursor:"pointer"}}>✕</button>
                    </div>
                    <input value={item.photo||""} onChange={e=>{const arr=[...sections.temoignages.items];arr[i]={...arr[i],photo:e.target.value};setSections(s=>({...s,temoignages:{...s.temoignages,items:arr}}))}} style={{...inp,marginBottom:8}} placeholder="Photo (URL optionnel)" />
                    <textarea value={item.texte} onChange={e=>{const arr=[...sections.temoignages.items];arr[i]={...arr[i],texte:e.target.value};setSections(s=>({...s,temoignages:{...s.temoignages,items:arr}}))}} style={{...inp,resize:"none",height:70}} placeholder="Témoignage..." />
                  </div>
                ))}
                <button onClick={()=>setSections(s=>({...s,temoignages:{...s.temoignages,items:[...s.temoignages.items,{nom:"",ville:"",texte:"",note:5,photo:""}]}}))}
                  style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter un témoignage</button>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.faq.active?S.gold:S.border}`, overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px" }}>
              <span style={{ color:S.white, fontSize:13, fontWeight:700 }}>❓ Section FAQ</span>
              <button onClick={() => setSections(s=>({...s,faq:{...s.faq,active:!s.faq.active}}))}
                style={{ padding:"4px 12px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer", background:sections.faq.active?"rgba(74,222,128,0.15)":S.bg, color:sections.faq.active?S.success:S.muted }}>
                {sections.faq.active?"✅ Activée":"Activer"}
              </button>
            </div>
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
                <button onClick={()=>setSections(s=>({...s,faq:{...s.faq,items:[...s.faq.items,{question:"",reponse:""}]}}))}
                  style={{padding:"6px 14px",borderRadius:8,border:`1px dashed ${S.border}`,background:"transparent",color:S.muted2,fontSize:12,cursor:"pointer",width:"100%"}}>+ Ajouter une FAQ</button>
              </div>
            )}
          </div>

          {/* Garantie */}
          <div style={{ background:S.card2, borderRadius:12, border:`1px solid ${sections.garantie.active?S.gold:S.border}`, overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px" }}>
              <span style={{ color:S.white, fontSize:13, fontWeight:700 }}>🛡️ Garantie</span>
              <button onClick={() => setSections(s=>({...s,garantie:{...s.garantie,active:!s.garantie.active}}))}
                style={{ padding:"4px 12px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer", background:sections.garantie.active?"rgba(74,222,128,0.15)":S.bg, color:sections.garantie.active?S.success:S.muted }}>
                {sections.garantie.active?"✅ Activée":"Activer"}
              </button>
            </div>
            {sections.garantie.active && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${S.border}`, display:"flex", gap:8, marginTop:10 }}>
                <input value={sections.garantie.icone} onChange={e=>setSections(s=>({...s,garantie:{...s.garantie,icone:e.target.value}}))} style={{...inp,width:60}} placeholder="🛡️" />
                <input value={sections.garantie.texte} onChange={e=>setSections(s=>({...s,garantie:{...s.garantie,texte:e.target.value}}))} style={{...inp,flex:1}} placeholder="Satisfait ou remboursé 30 jours" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Ordre des sections ── */}
      {tab === "ordre" && (
        <div>
          <p style={{ color:S.muted2, fontSize:13, marginBottom:16 }}>
            Glisse les sections dans l'ordre que tu veux. Le formulaire peut être mis n'importe où.
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {sectionsOrdre.map((key, i) => (
              <div key={key} style={{ display:"flex", gap:10, alignItems:"center", background:S.card2, borderRadius:12, padding:"12px 14px", border:`1px solid ${S.border}` }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{sectionLabels[key]?.split(" ")[0]}</span>
                <span style={{ color:S.white, fontSize:13, flex:1, fontWeight:600 }}>{sectionLabels[key]?.split(" ").slice(1).join(" ")}</span>
                <div style={{ display:"flex", gap:4 }}>
                  <button onClick={() => moveSection(i, -1)} disabled={i===0}
                    style={{ width:30,height:30,borderRadius:8,border:`1px solid ${S.border}`,background:"transparent",color:i===0?S.muted:S.gold,fontSize:14,cursor:i===0?"default":"pointer" }}>↑</button>
                  <button onClick={() => moveSection(i, 1)} disabled={i===sectionsOrdre.length-1}
                    style={{ width:30,height:30,borderRadius:8,border:`1px solid ${S.border}`,background:"transparent",color:i===sectionsOrdre.length-1?S.muted:S.gold,fontSize:14,cursor:i===sectionsOrdre.length-1?"default":"pointer" }}>↓</button>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color:S.muted2, fontSize:11, marginTop:12 }}>N'oublie pas de cliquer sur Enregistrer pour sauvegarder l'ordre.</p>
        </div>
      )}

      {tab === "apercu" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          {editId ? (
            <>
              <a href={pageUrl(nom.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"))} target="_blank" rel="noreferrer"
                style={{ display: "inline-block", padding: "12px 24px", borderRadius: 10, background: `linear-gradient(135deg,${S.gold},${S.goldDk})`, color: "#000", fontSize: 14, fontWeight: 700, textDecoration: "none", marginBottom: 16 }}>
                👁️ Voir la page de vente
              </a>
              <p style={{ color: S.muted2, fontSize: 12 }}>
                {pageUrl(nom.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"))}
              </p>
            </>
          ) : (
            <p style={{ color: S.danger, fontSize: 13 }}>Enregistre le produit pour voir la page.</p>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ color: S.white, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>📦 Mes produits</p>
          <p style={{ color: S.muted2, fontSize: 13, margin: 0 }}>Crée et personnalise tes pages de vente.</p>
        </div>
        <button onClick={openNew} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${S.gold},${S.goldDk})`, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Nouveau produit
        </button>
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: S.card, borderRadius: 14, border: `1px solid ${S.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <p style={{ color: S.white, fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>Aucun produit créé</p>
          <p style={{ color: S.muted2, fontSize: 13, margin: "0 0 20px" }}>Crée ton premier produit et personnalise ta page de vente.</p>
          <button onClick={openNew} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${S.gold},${S.goldDk})`, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            + Créer un produit
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {products.map(p => (
            <div key={p.id} style={{ background: S.card, border: `1px solid ${p.is_active ? S.border : "rgba(248,113,113,0.2)"}`, borderRadius: 14, padding: "14px 16px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              {p.image_principale ? (
                <img src={p.image_principale} alt={p.nom} style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 10, background: S.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📦</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <p style={{ color: S.white, fontSize: 14, fontWeight: 700, margin: 0 }}>{p.nom}</p>
                  {p.badge && <span style={{ background: "rgba(245,158,11,0.15)", color: S.gold, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{p.badge}</span>}
                  {!p.is_active && <span style={{ background: S.dangerBg, color: S.danger, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Inactif</span>}
                </div>
                <p style={{ color: S.gold, fontSize: 14, fontWeight: 800, margin: "0 0 2px" }}>
                  {p.prix.toLocaleString("fr-FR")} {p.devise}
                  {p.prix_barre && <span style={{ color: S.muted, fontSize: 12, fontWeight: 400, textDecoration: "line-through", marginLeft: 8 }}>{p.prix_barre.toLocaleString("fr-FR")}</span>}
                </p>
                <p style={{ color: S.muted2, fontSize: 11, margin: 0 }}>{p.vues || 0} vues · {p.commandes || 0} commandes</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openEdit(p.id)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.gold, fontSize: 12, cursor: "pointer" }}>✏️ Éditer</button>
                <a href={pageUrl(p.slug)} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: "#60A5FA", fontSize: 12, cursor: "pointer", textDecoration: "none" }}>👁️ Voir</a>
                <button onClick={() => handleDelete(p.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: S.dangerBg, color: S.danger, fontSize: 12, cursor: "pointer" }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
