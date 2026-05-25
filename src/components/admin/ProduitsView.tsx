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
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true, contentType: file.type })
      if (error) {
        // Fallback: essayer le bucket "images" existant
        const { data: d2, error: e2 } = await supabase.storage
          .from("images")
          .upload(fileName, file, { upsert: true, contentType: file.type })
        if (e2) { alert("Erreur upload: " + e2.message); setUploadingImg(false); return }
        const { data: url2 } = supabase.storage.from("images").getPublicUrl(fileName)
        setImagePrincipale(url2.publicUrl)
      } else {
        const { data: url } = supabase.storage.from("product-images").getPublicUrl(fileName)
        setImagePrincipale(url.publicUrl)
      }
    } catch (e) {
      alert("Erreur lors de l upload de l image")
    }
    setUploadingImg(false)
  }

  const resetForm = () => {
    setNom(""); setPrix(""); setPrixBarre(""); setDevise("FCFA"); setBadge("")
    setImagePrincipale(""); setDescription(""); setHeroTitre(""); setHeroSousTitre("")
    setHeroCta("Commander maintenant"); setIsActive(true); setTheme("dark")
    setFont("Poppins"); setCouleurAccent("#F59E0B"); setCouleurFond("#080810")
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
    setTheme(data.theme || "dark"); setFont(data.font || "Poppins")
    setCouleurAccent(data.couleur_accent || "#F59E0B"); setCouleurFond(data.couleur_fond || "#080810")
    setEditId(id); setShowEditor(true); setTab("base")
  }

  const handleSave = async () => {
    if (!nom.trim()) { setError("Nom requis."); return }
    if (!prix) { setError("Prix requis."); return }
    setSaving(true); setError("")
    const slug = nom.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")
    const payload = {
      tenant_id: tenantId, nom: nom.trim(), slug, prix: Number(prix),
      prix_barre: prixBarre ? Number(prixBarre) : null, devise, badge, is_active: isActive,
      image_principale: imagePrincipale, description, hero_titre: heroTitre,
      hero_sous_titre: heroSousTitre, hero_cta_texte: heroCta,
      theme, font, couleur_accent: couleurAccent, couleur_fond: couleurFond,
      updated_at: new Date().toISOString()
    }
    if (editId) {
      await supabase.from("products").update(payload).eq("id", editId)
    } else {
      await supabase.from("products").insert(payload)
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
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: S.card, borderRadius: 12, padding: 4 }}>
        {[["base","📦 Produit"],["design","🎨 Design"],["apercu","👁️ Aperçu"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: tab === id ? S.gold : "transparent", color: tab === id ? "#000" : S.muted2 }}>
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
