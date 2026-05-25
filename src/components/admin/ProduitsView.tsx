"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"

const S = {
  bg:"#0A0A0F", card:"#111118", card2:"#16161F", border:"#1E1E2E",
  gold:"#F59E0B", goldDk:"#D97706", white:"#F8F8FC",
  muted:"#55556A", muted2:"#9898B0", success:"#4ADE80",
  danger:"#F87171", dangerBg:"rgba(248,113,113,0.08)", info:"#60A5FA",
}

const FONTS = ["Inter","Poppins","Montserrat","Playfair Display","Bebas Neue","Lato"]
const BADGES = ["","NOUVEAU","PROMO","BEST-SELLER","RUPTURE"]
const THEMES = [
  {id:"dark", label:"🌙 Sombre"},
  {id:"light", label:"☀️ Clair"},
]

type Product = {
  id?: string
  tenant_id?: string
  nom: string
  slug: string
  description: string
  prix: number
  prix_barre: number | null
  devise: string
  badge: string
  is_active: boolean
  image_principale: string
  images: string[]
  hero_titre: string
  hero_sous_titre: string
  hero_cta_texte: string
  section_probleme_active: boolean
  section_probleme_titre: string
  section_probleme_items: {emoji:string;texte:string}[]
  section_benefices_active: boolean
  section_benefices_titre: string
  section_benefices_items: {emoji:string;titre:string;texte:string}[]
  section_composition_active: boolean
  section_composition_titre: string
  section_composition_items: {nom:string;description:string}[]
  section_temoignages_active: boolean
  section_temoignages_titre: string
  section_temoignages_items: {nom:string;ville:string;texte:string;note:number}[]
  section_comparaison_active: boolean
  section_comparaison_titre: string
  section_comparaison_items: {critere:string;nous:boolean;concurrent:boolean}[]
  section_faq_active: boolean
  section_faq_titre: string
  section_faq_items: {question:string;reponse:string}[]
  section_garantie_active: boolean
  section_garantie_texte: string
  section_garantie_icone: string
  section_utilisation_active: boolean
  section_utilisation_titre: string
  section_utilisation_items: {etape:number;titre:string;texte:string}[]
  countdown_active: boolean
  countdown_texte: string
  countdown_end: string
  theme: string
  font: string
  couleur_fond: string
  couleur_accent: string
  couleur_texte: string
}

const EMPTY: Product = {
  nom:"", slug:"", description:"", prix:0, prix_barre:null, devise:"FCFA",
  badge:"", is_active:true, image_principale:"", images:[],
  hero_titre:"", hero_sous_titre:"", hero_cta_texte:"Commander maintenant",
  section_probleme_active:false, section_probleme_titre:"Vous souffrez de ça ?", section_probleme_items:[],
  section_benefices_active:false, section_benefices_titre:"Pourquoi choisir ce produit ?", section_benefices_items:[],
  section_composition_active:false, section_composition_titre:"Composition", section_composition_items:[],
  section_temoignages_active:false, section_temoignages_titre:"Ce qu\'ils en disent", section_temoignages_items:[],
  section_comparaison_active:false, section_comparaison_titre:"Pourquoi nous ?", section_comparaison_items:[],
  section_faq_active:false, section_faq_titre:"Questions fréquentes", section_faq_items:[],
  section_garantie_active:false, section_garantie_texte:"Satisfait ou remboursé 30 jours", section_garantie_icone:"🛡️",
  section_utilisation_active:false, section_utilisation_titre:"Comment ça marche ?", section_utilisation_items:[],
  countdown_active:false, countdown_texte:"Offre expire dans", countdown_end:"",
  theme:"dark", font:"Poppins", couleur_fond:"#080810", couleur_accent:"#F59E0B", couleur_texte:"#F8F8FC",
}

interface Props { tenantId: string; tenantSlug: string; brandColor?: string }

export default function ProduitsView({ tenantId, tenantSlug, brandColor }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<"base"|"design"|"sections"|"apercu">("base")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")

  useEffect(() => { loadProducts() }, [tenantId])

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from("products").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false })
    setProducts((data || []) as Product[])
    setLoading(false)
  }

  const startNew = () => {
    setEditing({ ...EMPTY, couleur_accent: brandColor || "#F59E0B" })
    setTab("base")
    setError("")
  }

  const startEdit = (p: Product) => {
    setEditing({ ...p })
    setTab("base")
    setError("")
  }

  const handleSave = async () => {
    if (!editing) return
    if (!editing.nom) { setError("Nom du produit requis."); return }
    if (!editing.prix) { setError("Prix requis."); return }
    setSaving(true); setError("")

    const slug = editing.slug || editing.nom.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")
    const payload = { ...editing, slug, tenant_id: tenantId, updated_at: new Date().toISOString() }

    let err
    if (editing.id) {
      const res = await supabase.from("products").update(payload).eq("id", editing.id)
      err = res.error
    } else {
      const res = await supabase.from("products").insert({ ...payload })
      err = res.error
    }

    if (err) { setError(err.message); setSaving(false); return }
    await loadProducts()
    setEditing(null)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return
    await supabase.from("products").delete().eq("id", id)
    await loadProducts()
  }

  const toggleActive = async (p: Product) => {
    await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id!)
    await loadProducts()
  }

  const inp: React.CSSProperties = {
    width:"100%", background:S.bg, border:`1px solid ${S.border}`, borderRadius:8,
    padding:"10px 12px", color:S.white, fontSize:13, outline:"none", boxSizing:"border-box" as const, fontFamily:"inherit"
  }

  const sectionToggle = (key: keyof Product) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:S.card2, borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${(editing as any)[key]?S.gold:S.border}` }}>
      <span style={{ color:S.white, fontSize:13, fontWeight:600 }}>{sectionLabel(key as string)}</span>
      <button onClick={() => setEditing(e => e ? {...e, [key]: !(e as any)[key]} : e)}
        style={{ padding:"4px 12px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer",
          background:(editing as any)[key]?"rgba(74,222,128,0.15)":S.bg,
          color:(editing as any)[key]?S.success:S.muted }}>
        {(editing as any)[key] ? "✅ Activée" : "Activer"}
      </button>
    </div>
  )

  const sectionLabel = (key: string) => ({
    section_probleme_active:"😣 Section Problème",
    section_benefices_active:"✅ Section Bénéfices",
    section_composition_active:"🧪 Section Composition",
    section_temoignages_active:"⭐ Section Témoignages",
    section_comparaison_active:"🏆 Section Comparaison",
    section_faq_active:"❓ Section FAQ",
    section_garantie_active:"🛡️ Section Garantie",
    section_utilisation_active:"📋 Section Mode d\'emploi",
    countdown_active:"⏰ Compte à rebours",
  }[key] || key)

  const addItem = (key: keyof Product, template: object) =>
    setEditing(e => e ? {...e, [key]: [...((e as any)[key] || []), template]} : e)

  const removeItem = (key: keyof Product, idx: number) =>
    setEditing(e => e ? {...e, [key]: ((e as any)[key] || []).filter((_: unknown, i: number) => i !== idx)} : e)

  const updateItem = (key: keyof Product, idx: number, field: string, value: string | number | boolean) =>
    setEditing(e => {
      if (!e) return e
      const arr = [...((e as any)[key] || [])]
      arr[idx] = { ...arr[idx], [field]: value }
      return { ...e, [key]: arr }
    })

  const pageUrl = editing?.id
    ? `https://shipivo.app/produit/${tenantSlug}/${editing.slug}`
    : null

  if (loading) return <p style={{ color:S.muted, textAlign:"center", padding:32 }}>Chargement...</p>

  // ── Éditeur ouvert ──
  if (editing) return (
    <div>
      {/* Header éditeur */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:20, flexWrap:"wrap" }}>
        <button onClick={() => setEditing(null)} style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${S.border}`, background:"transparent", color:S.muted2, fontSize:13, cursor:"pointer" }}>
          ← Retour
        </button>
        <p style={{ color:S.white, fontSize:15, fontWeight:700, margin:0, flex:1 }}>
          {editing.id ? `✏️ ${editing.nom}` : "➕ Nouveau produit"}
        </p>
        {pageUrl && (
          <button onClick={() => { navigator.clipboard.writeText(pageUrl); setCopied("url"); setTimeout(()=>setCopied(""),2000) }}
            style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${copied==="url"?S.success:S.border}`, background:"transparent", color:copied==="url"?S.success:S.muted2, fontSize:12, cursor:"pointer" }}>
            {copied==="url" ? "✓ Lien copié !" : "🔗 Copier le lien"}
          </button>
        )}
        <button onClick={handleSave} disabled={saving}
          style={{ padding:"8px 20px", borderRadius:8, border:"none", background:saving?S.muted:`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:"#000", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
          {saving ? "Enregistrement..." : "✅ Enregistrer"}
        </button>
      </div>

      {error && <div style={{ background:S.dangerBg, border:"1px solid rgba(248,113,113,0.2)", borderRadius:8, padding:"10px 14px", marginBottom:14, color:S.danger, fontSize:13 }}>⚠️ {error}</div>}

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20, background:S.card, borderRadius:12, padding:4, flexWrap:"wrap" }}>
        {([["base","📦 Produit"],["design","🎨 Design"],["sections","📋 Sections"],["apercu","👁️ Aperçu"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1, padding:"9px 12px", borderRadius:9, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", minWidth:80,
              background:tab===id?S.gold:"transparent", color:tab===id?"#000":S.muted2 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Base ── */}
      {tab === "base" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Nom du produit *</label>
              <input value={editing.nom} onChange={e => setEditing(p => p ? {...p, nom:e.target.value, slug:e.target.value.toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-")} : p)} style={inp} placeholder="Ex: THERAWOLF Baume 50ml" />
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Badge</label>
              <select value={editing.badge} onChange={e => setEditing(p => p?{...p,badge:e.target.value}:p)} style={inp}>
                {BADGES.map(b => <option key={b} value={b}>{b || "Aucun"}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Description courte</label>
            <textarea value={editing.description} onChange={e => setEditing(p => p?{...p,description:e.target.value}:p)} style={{...inp, resize:"none", height:80}} placeholder="Description du produit..." />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Prix * ({editing.devise})</label>
              <input type="number" value={editing.prix} onChange={e => setEditing(p => p?{...p,prix:Number(e.target.value)}:p)} style={inp} />
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Prix barré</label>
              <input type="number" value={editing.prix_barre || ""} onChange={e => setEditing(p => p?{...p,prix_barre:e.target.value?Number(e.target.value):null}:p)} style={inp} placeholder="0" />
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Devise</label>
              <select value={editing.devise} onChange={e => setEditing(p => p?{...p,devise:e.target.value}:p)} style={inp}>
                {["FCFA","XOF","XAF","USD","EUR","GHS","NGN"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Image principale (URL)</label>
            <input value={editing.image_principale} onChange={e => setEditing(p => p?{...p,image_principale:e.target.value}:p)} style={inp} placeholder="https://..." />
            {editing.image_principale && <img src={editing.image_principale} alt="" style={{ marginTop:8, height:80, borderRadius:8, objectFit:"cover" }} />}
          </div>

          <div>
            <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Images supplémentaires (URLs, une par ligne)</label>
            <textarea value={editing.images.join("\n")} onChange={e => setEditing(p => p?{...p,images:e.target.value.split("\n").filter(u=>u.trim())}:p)} style={{...inp, resize:"none", height:80}} placeholder="https://image1.jpg&#10;https://image2.jpg" />
          </div>

          <div style={{ background:S.card2, borderRadius:12, padding:"14px 16px" }}>
            <p style={{ color:S.muted2, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>✍️ Textes Hero</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div>
                <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Titre accrocheur</label>
                <input value={editing.hero_titre} onChange={e => setEditing(p => p?{...p,hero_titre:e.target.value}:p)} style={inp} placeholder="Ex: Dites adieu à la douleur chronique" />
              </div>
              <div>
                <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Sous-titre</label>
                <input value={editing.hero_sous_titre} onChange={e => setEditing(p => p?{...p,hero_sous_titre:e.target.value}:p)} style={inp} placeholder="Ex: La solution naturelle que des milliers de personnes utilisent" />
              </div>
              <div>
                <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Texte du bouton commander</label>
                <input value={editing.hero_cta_texte} onChange={e => setEditing(p => p?{...p,hero_cta_texte:e.target.value}:p)} style={inp} placeholder="Commander maintenant" />
              </div>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ color:S.muted2, fontSize:13 }}>Produit actif</span>
            <button onClick={() => setEditing(p => p?{...p,is_active:!p.is_active}:p)}
              style={{ padding:"5px 14px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer",
                background:editing.is_active?"rgba(74,222,128,0.15)":S.card2, color:editing.is_active?S.success:S.muted }}>
              {editing.is_active ? "✅ Actif" : "Inactif"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab Design ── */}
      {tab === "design" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:8 }}>Thème</label>
            <div style={{ display:"flex", gap:8 }}>
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setEditing(p => p?{...p,theme:t.id,couleur_fond:t.id==="dark"?"#080810":"#FFFFFF",couleur_texte:t.id==="dark"?"#F8F8FC":"#111118"}:p)}
                  style={{ flex:1, padding:"10px", borderRadius:10, border:`2px solid ${editing.theme===t.id?S.gold:S.border}`, background:editing.theme===t.id?"rgba(245,158,11,0.08)":"transparent", color:editing.theme===t.id?S.gold:S.muted2, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:8 }}>Police</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {FONTS.map(f => (
                <button key={f} onClick={() => setEditing(p => p?{...p,font:f}:p)}
                  style={{ padding:"7px 14px", borderRadius:20, border:`1px solid ${editing.font===f?S.gold:S.border}`, background:editing.font===f?"rgba(245,158,11,0.1)":"transparent", color:editing.font===f?S.gold:S.muted2, fontSize:13, cursor:"pointer", fontFamily:f }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Couleur de fond</label>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="color" value={editing.couleur_fond} onChange={e => setEditing(p => p?{...p,couleur_fond:e.target.value}:p)} style={{ width:40, height:36, borderRadius:8, border:`1px solid ${S.border}`, cursor:"pointer", background:"none" }} />
                <input value={editing.couleur_fond} onChange={e => setEditing(p => p?{...p,couleur_fond:e.target.value}:p)} style={{...inp, flex:1}} />
              </div>
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Couleur accent</label>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="color" value={editing.couleur_accent} onChange={e => setEditing(p => p?{...p,couleur_accent:e.target.value}:p)} style={{ width:40, height:36, borderRadius:8, border:`1px solid ${S.border}`, cursor:"pointer", background:"none" }} />
                <input value={editing.couleur_accent} onChange={e => setEditing(p => p?{...p,couleur_accent:e.target.value}:p)} style={{...inp, flex:1}} />
              </div>
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Couleur texte</label>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="color" value={editing.couleur_texte} onChange={e => setEditing(p => p?{...p,couleur_texte:e.target.value}:p)} style={{ width:40, height:36, borderRadius:8, border:`1px solid ${S.border}`, cursor:"pointer", background:"none" }} />
                <input value={editing.couleur_texte} onChange={e => setEditing(p => p?{...p,couleur_texte:e.target.value}:p)} style={{...inp, flex:1}} />
              </div>
            </div>
          </div>

          {/* Compte à rebours */}
          <div style={{ background:S.card2, borderRadius:12, padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p style={{ color:S.white, fontSize:13, fontWeight:700, margin:0 }}>⏰ Compte à rebours</p>
              <button onClick={() => setEditing(p => p?{...p,countdown_active:!p.countdown_active}:p)}
                style={{ padding:"4px 12px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer",
                  background:editing.countdown_active?"rgba(74,222,128,0.15)":S.bg, color:editing.countdown_active?S.success:S.muted }}>
                {editing.countdown_active ? "✅ Activé" : "Activer"}
              </button>
            </div>
            {editing.countdown_active && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div>
                  <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Texte</label>
                  <input value={editing.countdown_texte} onChange={e => setEditing(p => p?{...p,countdown_texte:e.target.value}:p)} style={inp} placeholder="Offre expire dans" />
                </div>
                <div>
                  <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:4 }}>Date/heure de fin</label>
                  <input type="datetime-local" value={editing.countdown_end?.slice(0,16)||""} onChange={e => setEditing(p => p?{...p,countdown_end:e.target.value}:p)} style={inp} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Sections ── */}
      {tab === "sections" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <p style={{ color:S.muted2, fontSize:13, marginBottom:4 }}>Active les sections que tu veux afficher sur ta page de vente :</p>

          {/* Problème */}
          {sectionToggle("section_probleme_active")}
          {editing.section_probleme_active && (
            <div style={{ background:S.card2, borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${S.border}` }}>
              <input value={editing.section_probleme_titre} onChange={e => setEditing(p => p?{...p,section_probleme_titre:e.target.value}:p)} style={{...inp, marginBottom:10}} placeholder="Titre de la section" />
              {editing.section_probleme_items.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <input value={item.emoji} onChange={e => updateItem("section_probleme_items",i,"emoji",e.target.value)} style={{...inp, width:60}} placeholder="😣" />
                  <input value={item.texte} onChange={e => updateItem("section_probleme_items",i,"texte",e.target.value)} style={{...inp, flex:1}} placeholder="Description du problème" />
                  <button onClick={() => removeItem("section_probleme_items",i)} style={{ padding:"4px 10px", borderRadius:8, border:"none", background:S.dangerBg, color:S.danger, cursor:"pointer" }}>✕</button>
                </div>
              ))}
              <button onClick={() => addItem("section_probleme_items",{emoji:"😣",texte:""})} style={{ padding:"6px 14px", borderRadius:8, border:`1px dashed ${S.border}`, background:"transparent", color:S.muted2, fontSize:12, cursor:"pointer", width:"100%" }}>+ Ajouter un problème</button>
            </div>
          )}

          {/* Bénéfices */}
          {sectionToggle("section_benefices_active")}
          {editing.section_benefices_active && (
            <div style={{ background:S.card2, borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${S.border}` }}>
              <input value={editing.section_benefices_titre} onChange={e => setEditing(p => p?{...p,section_benefices_titre:e.target.value}:p)} style={{...inp, marginBottom:10}} placeholder="Titre de la section" />
              {editing.section_benefices_items.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                  <input value={item.emoji} onChange={e => updateItem("section_benefices_items",i,"emoji",e.target.value)} style={{...inp, width:60}} placeholder="✅" />
                  <input value={item.titre} onChange={e => updateItem("section_benefices_items",i,"titre",e.target.value)} style={{...inp, flex:1, minWidth:120}} placeholder="Titre du bénéfice" />
                  <input value={item.texte} onChange={e => updateItem("section_benefices_items",i,"texte",e.target.value)} style={{...inp, flex:2, minWidth:200}} placeholder="Description" />
                  <button onClick={() => removeItem("section_benefices_items",i)} style={{ padding:"4px 10px", borderRadius:8, border:"none", background:S.dangerBg, color:S.danger, cursor:"pointer" }}>✕</button>
                </div>
              ))}
              <button onClick={() => addItem("section_benefices_items",{emoji:"✅",titre:"",texte:""})} style={{ padding:"6px 14px", borderRadius:8, border:`1px dashed ${S.border}`, background:"transparent", color:S.muted2, fontSize:12, cursor:"pointer", width:"100%" }}>+ Ajouter un bénéfice</button>
            </div>
          )}

          {/* Témoignages */}
          {sectionToggle("section_temoignages_active")}
          {editing.section_temoignages_active && (
            <div style={{ background:S.card2, borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${S.border}` }}>
              <input value={editing.section_temoignages_titre} onChange={e => setEditing(p => p?{...p,section_temoignages_titre:e.target.value}:p)} style={{...inp, marginBottom:10}} placeholder="Titre de la section" />
              {editing.section_temoignages_items.map((item, i) => (
                <div key={i} style={{ background:S.bg, borderRadius:8, padding:10, marginBottom:10, border:`1px solid ${S.border}` }}>
                  <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                    <input value={item.nom} onChange={e => updateItem("section_temoignages_items",i,"nom",e.target.value)} style={{...inp, flex:1}} placeholder="Nom" />
                    <input value={item.ville} onChange={e => updateItem("section_temoignages_items",i,"ville",e.target.value)} style={{...inp, flex:1}} placeholder="Ville" />
                    <select value={item.note} onChange={e => updateItem("section_temoignages_items",i,"note",Number(e.target.value))} style={{...inp, width:70}}>
                      {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}⭐</option>)}
                    </select>
                    <button onClick={() => removeItem("section_temoignages_items",i)} style={{ padding:"4px 10px", borderRadius:8, border:"none", background:S.dangerBg, color:S.danger, cursor:"pointer" }}>✕</button>
                  </div>
                  <textarea value={item.texte} onChange={e => updateItem("section_temoignages_items",i,"texte",e.target.value)} style={{...inp, resize:"none", height:60}} placeholder="Témoignage..." />
                </div>
              ))}
              <button onClick={() => addItem("section_temoignages_items",{nom:"",ville:"",texte:"",note:5})} style={{ padding:"6px 14px", borderRadius:8, border:`1px dashed ${S.border}`, background:"transparent", color:S.muted2, fontSize:12, cursor:"pointer", width:"100%" }}>+ Ajouter un témoignage</button>
            </div>
          )}

          {/* FAQ */}
          {sectionToggle("section_faq_active")}
          {editing.section_faq_active && (
            <div style={{ background:S.card2, borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${S.border}` }}>
              <input value={editing.section_faq_titre} onChange={e => setEditing(p => p?{...p,section_faq_titre:e.target.value}:p)} style={{...inp, marginBottom:10}} placeholder="Titre de la section" />
              {editing.section_faq_items.map((item, i) => (
                <div key={i} style={{ background:S.bg, borderRadius:8, padding:10, marginBottom:8, border:`1px solid ${S.border}` }}>
                  <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                    <input value={item.question} onChange={e => updateItem("section_faq_items",i,"question",e.target.value)} style={{...inp, flex:1}} placeholder="Question ?" />
                    <button onClick={() => removeItem("section_faq_items",i)} style={{ padding:"4px 10px", borderRadius:8, border:"none", background:S.dangerBg, color:S.danger, cursor:"pointer" }}>✕</button>
                  </div>
                  <textarea value={item.reponse} onChange={e => updateItem("section_faq_items",i,"reponse",e.target.value)} style={{...inp, resize:"none", height:60}} placeholder="Réponse..." />
                </div>
              ))}
              <button onClick={() => addItem("section_faq_items",{question:"",reponse:""})} style={{ padding:"6px 14px", borderRadius:8, border:`1px dashed ${S.border}`, background:"transparent", color:S.muted2, fontSize:12, cursor:"pointer", width:"100%" }}>+ Ajouter une FAQ</button>
            </div>
          )}

          {/* Garantie */}
          {sectionToggle("section_garantie_active")}
          {editing.section_garantie_active && (
            <div style={{ background:S.card2, borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${S.border}` }}>
              <div style={{ display:"flex", gap:8 }}>
                <input value={editing.section_garantie_icone} onChange={e => setEditing(p => p?{...p,section_garantie_icone:e.target.value}:p)} style={{...inp, width:60}} placeholder="🛡️" />
                <input value={editing.section_garantie_texte} onChange={e => setEditing(p => p?{...p,section_garantie_texte:e.target.value}:p)} style={{...inp, flex:1}} placeholder="Satisfait ou remboursé 30 jours" />
              </div>
            </div>
          )}

          {/* Composition */}
          {sectionToggle("section_composition_active")}
          {editing.section_composition_active && (
            <div style={{ background:S.card2, borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${S.border}` }}>
              <input value={editing.section_composition_titre} onChange={e => setEditing(p => p?{...p,section_composition_titre:e.target.value}:p)} style={{...inp, marginBottom:10}} placeholder="Composition, Ingrédients, Matières..." />
              {editing.section_composition_items.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <input value={item.nom} onChange={e => updateItem("section_composition_items",i,"nom",e.target.value)} style={{...inp, flex:1}} placeholder="Nom de l'ingrédient" />
                  <input value={item.description} onChange={e => updateItem("section_composition_items",i,"description",e.target.value)} style={{...inp, flex:2}} placeholder="Description / bienfaits" />
                  <button onClick={() => removeItem("section_composition_items",i)} style={{ padding:"4px 10px", borderRadius:8, border:"none", background:S.dangerBg, color:S.danger, cursor:"pointer" }}>✕</button>
                </div>
              ))}
              <button onClick={() => addItem("section_composition_items",{nom:"",description:""})} style={{ padding:"6px 14px", borderRadius:8, border:`1px dashed ${S.border}`, background:"transparent", color:S.muted2, fontSize:12, cursor:"pointer", width:"100%" }}>+ Ajouter un ingrédient</button>
            </div>
          )}

          {/* Mode d'emploi */}
          {sectionToggle("section_utilisation_active")}
          {editing.section_utilisation_active && (
            <div style={{ background:S.card2, borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${S.border}` }}>
              <input value={editing.section_utilisation_titre} onChange={e => setEditing(p => p?{...p,section_utilisation_titre:e.target.value}:p)} style={{...inp, marginBottom:10}} placeholder="Comment ça marche ?" />
              {editing.section_utilisation_items.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <span style={{ color:S.gold, fontSize:18, fontWeight:800, flexShrink:0, paddingTop:8 }}>{i+1}</span>
                  <input value={item.titre} onChange={e => updateItem("section_utilisation_items",i,"titre",e.target.value)} style={{...inp, flex:1}} placeholder="Titre de l'étape" />
                  <input value={item.texte} onChange={e => updateItem("section_utilisation_items",i,"texte",e.target.value)} style={{...inp, flex:2}} placeholder="Description" />
                  <button onClick={() => removeItem("section_utilisation_items",i)} style={{ padding:"4px 10px", borderRadius:8, border:"none", background:S.dangerBg, color:S.danger, cursor:"pointer" }}>✕</button>
                </div>
              ))}
              <button onClick={() => addItem("section_utilisation_items",{etape:editing.section_utilisation_items.length+1,titre:"",texte:""})} style={{ padding:"6px 14px", borderRadius:8, border:`1px dashed ${S.border}`, background:"transparent", color:S.muted2, fontSize:12, cursor:"pointer", width:"100%" }}>+ Ajouter une étape</button>
            </div>
          )}

          {/* Comparaison */}
          {sectionToggle("section_comparaison_active")}
          {editing.section_comparaison_active && (
            <div style={{ background:S.card2, borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${S.border}` }}>
              <input value={editing.section_comparaison_titre} onChange={e => setEditing(p => p?{...p,section_comparaison_titre:e.target.value}:p)} style={{...inp, marginBottom:10}} placeholder="Pourquoi nous ?" />
              {editing.section_comparaison_items.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                  <input value={item.critere} onChange={e => updateItem("section_comparaison_items",i,"critere",e.target.value)} style={{...inp, flex:2}} placeholder="Critère" />
                  <button onClick={() => updateItem("section_comparaison_items",i,"nous",!item.nous)}
                    style={{ padding:"6px 12px", borderRadius:8, border:"none", fontSize:12, cursor:"pointer", background:item.nous?"rgba(74,222,128,0.15)":S.bg, color:item.nous?S.success:S.muted }}>
                    Nous: {item.nous ? "✅" : "❌"}
                  </button>
                  <button onClick={() => updateItem("section_comparaison_items",i,"concurrent",!item.concurrent)}
                    style={{ padding:"6px 12px", borderRadius:8, border:"none", fontSize:12, cursor:"pointer", background:item.concurrent?"rgba(74,222,128,0.15)":S.bg, color:item.concurrent?S.success:S.muted }}>
                    Conc: {item.concurrent ? "✅" : "❌"}
                  </button>
                  <button onClick={() => removeItem("section_comparaison_items",i)} style={{ padding:"4px 10px", borderRadius:8, border:"none", background:S.dangerBg, color:S.danger, cursor:"pointer" }}>✕</button>
                </div>
              ))}
              <button onClick={() => addItem("section_comparaison_items",{critere:"",nous:true,concurrent:false})} style={{ padding:"6px 14px", borderRadius:8, border:`1px dashed ${S.border}`, background:"transparent", color:S.muted2, fontSize:12, cursor:"pointer", width:"100%" }}>+ Ajouter un critère</button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Aperçu ── */}
      {tab === "apercu" && (
        <div style={{ textAlign:"center" }}>
          <p style={{ color:S.muted2, fontSize:13, marginBottom:16 }}>Voici comment apparaîtra ta page de vente :</p>
          {pageUrl ? (
            <a href={pageUrl} target="_blank" rel="noreferrer"
              style={{ display:"inline-block", padding:"12px 24px", borderRadius:10, background:`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:"#000", fontSize:14, fontWeight:700, textDecoration:"none", marginBottom:16 }}>
              👁️ Voir la page de vente
            </a>
          ) : (
            <p style={{ color:S.danger, fontSize:13 }}>Enregistre d\'abord le produit pour voir l\'aperçu.</p>
          )}
          <div style={{ background:S.card, borderRadius:12, padding:16, textAlign:"left" }}>
            <p style={{ color:S.muted2, fontSize:12, fontWeight:700, marginBottom:8 }}>Lien à partager :</p>
            {pageUrl ? (
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1, background:S.bg, borderRadius:8, padding:"8px 12px", fontFamily:"monospace", fontSize:11, color:S.info, wordBreak:"break-all" }}>{pageUrl}</div>
                <button onClick={() => { navigator.clipboard.writeText(pageUrl); setCopied("url2"); setTimeout(()=>setCopied(""),2000) }}
                  style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${copied==="url2"?S.success:S.border}`, background:"transparent", color:copied==="url2"?S.success:S.muted2, fontSize:12, cursor:"pointer" }}>
                  {copied==="url2" ? "✓" : "Copier"}
                </button>
              </div>
            ) : <p style={{ color:S.muted, fontSize:13 }}>Disponible après enregistrement.</p>}
          </div>
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
        <button onClick={startNew}
          style={{ padding:"9px 18px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:"#000", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          + Nouveau produit
        </button>
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", background:S.card, borderRadius:14, border:`1px solid ${S.border}` }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📦</div>
          <p style={{ color:S.white, fontSize:15, fontWeight:700, margin:"0 0 8px" }}>Aucun produit créé</p>
          <p style={{ color:S.muted2, fontSize:13, margin:"0 0 20px" }}>Crée ton premier produit et personnalise ta page de vente.</p>
          <button onClick={startNew} style={{ padding:"10px 24px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:"#000", fontSize:14, fontWeight:700, cursor:"pointer" }}>
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
                <p style={{ color:S.muted2, fontSize:11, margin:0 }}>/{tenantSlug}/{p.slug}</p>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button onClick={() => toggleActive(p)} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${S.border}`, background:"transparent", color:p.is_active?S.success:S.muted, fontSize:12, cursor:"pointer" }}>
                  {p.is_active ? "✅ Actif" : "Inactif"}
                </button>
                <button onClick={() => startEdit(p)} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${S.border}`, background:"transparent", color:S.gold, fontSize:12, cursor:"pointer" }}>
                  ✏️ Éditer
                </button>
                <a href={`https://shipivo.app/produit/${tenantSlug}/${p.slug}`} target="_blank" rel="noreferrer"
                  style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${S.border}`, background:"transparent", color:S.info, fontSize:12, cursor:"pointer", textDecoration:"none" }}>
                  👁️ Voir
                </a>
                <button onClick={() => handleDelete(p.id!)} style={{ padding:"6px 12px", borderRadius:8, border:"none", background:S.dangerBg, color:S.danger, fontSize:12, cursor:"pointer" }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
