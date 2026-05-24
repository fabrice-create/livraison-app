"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"
import { compressImage, formatFileSize } from "@/lib/imageUtils"

const S = {
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", info: "#60A5FA",
}

interface Product {
  id: string
  name: string
  price: number
  description?: string
  image_url?: string
  is_active: boolean
  created_at: string
  images?: ProductImage[]
}

interface ProductImage {
  id: string
  image_url: string
  position: number
}

interface Props {
  tenantId: string
  tenantSlug?: string
}

const EMPTY = { name: "", price: "", description: "" }

export default function ProduitsView({ tenantId, tenantSlug }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [slug, setSlug] = useState(tenantSlug || "")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY)

  // Images multiples
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [mainImagePreview, setMainImagePreview] = useState("")
  const [mainImageInfo, setMainImageInfo] = useState("")
  const [extraImages, setExtraImages] = useState<{ file: File; preview: string }[]>([])
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [copied, setCopied] = useState<string>("")
  const mainFileRef = useRef<HTMLInputElement>(null)
  const extraFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [tenantId])

  const loadData = async () => {
    setLoading(true)
    if (!slug) {
      const { data: tenant } = await supabase
        .from("tenants").select("slug").eq("id", tenantId).single()
      if (tenant) setSlug(tenant.slug)
    }
    const { data } = await supabase
      .from("products").select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (data) {
      // Charger les images pour chaque produit
      const productIds = data.map(p => p.id)
      const { data: imgs } = await supabase
        .from("product_images")
        .select("*")
        .in("product_id", productIds)
        .order("position")

      const productsWithImages = data.map(p => ({
        ...p,
        images: imgs?.filter(i => i.product_id === p.id) || []
      }))
      setProducts(productsWithImages)
    }
    setLoading(false)
  }

  const getBaseUrl = () => {
    if (typeof window === "undefined") return "shipivo.app"
    return window.location.host
  }

  const getLienBoutique = () => `https://${getBaseUrl()}/commander/${slug}`
  const getLienProduit = (p: Product) => `https://${getBaseUrl()}/commander/${slug}?produit=${p.id}`

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(""), 2000)
    } catch { setError("Impossible de copier") }
  }

  const resetForm = () => {
    setForm(EMPTY)
    setEditing(null)
    setMainImageFile(null)
    setMainImagePreview("")
    setMainImageInfo("")
    setExtraImages([])
    setExistingImages([])
    setError("")
    setShowForm(false)
  }

  const startEdit = async (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, price: String(p.price), description: p.description || "" })
    setMainImagePreview(p.image_url || "")
    setMainImageFile(null)
    setMainImageInfo("")
    setExtraImages([])
    // Charger images existantes
    const { data: imgs } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", p.id)
      .order("position")
    setExistingImages(imgs || [])
    setShowForm(true)
  }

  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setMainImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    setMainImageInfo("Compression en cours...")
    const compressed = await compressImage(file, 800, 0.82)
    setMainImageFile(compressed)
    setMainImageInfo(`✓ Optimisé : ${formatFileSize(compressed.size)}`)
  }

  const handleExtraImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 9 - existingImages.length - extraImages.length
    const toAdd = files.slice(0, remaining)
    for (const file of toAdd) {
      // Comprimer immédiatement au moment de la sélection
      const compressed = await compressImage(file, 800, 0.82)
      const reader = new FileReader()
      reader.onload = (ev) => {
        setExtraImages(prev => [...prev, { file: compressed, preview: ev.target?.result as string }])
      }
      reader.readAsDataURL(compressed)
    }
  }

  const removeExtraImage = (index: number) => {
    setExtraImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = async (img: ProductImage) => {
    await supabase.from("product_images").delete().eq("id", img.id)
    setExistingImages(prev => prev.filter(i => i.id !== img.id))
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileName = `products/${tenantId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
    const { error: err } = await supabase.storage
      .from("shipivo-images").upload(fileName, file, { contentType: "image/jpeg", upsert: false })
    if (err) { setError("Erreur upload : " + err.message); return null }
    const { data } = supabase.storage.from("shipivo-images").getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Nom requis"); return }
    if (!form.price || isNaN(Number(form.price))) { setError("Prix invalide"); return }
    setSaving(true); setError("")

    // Upload image principale
    let imageUrl = editing?.image_url || null
    if (mainImageFile) {
      setUploading(true)
      const url = await uploadImage(mainImageFile)
      setUploading(false)
      if (!url) { setSaving(false); return }
      imageUrl = url
    }

    let productId: string | null = editing?.id || null

    if (editing) {
      const { error: err } = await supabase.from("products").update({
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || null,
        image_url: imageUrl,
      }).eq("id", editing.id)
      if (err) { setError(err.message); setSaving(false); return }
      productId = editing.id
    } else {
      // Insérer le produit et récupérer l'id généré
      const { data: inserted, error: err } = await supabase
        .from("products")
        .insert({
          tenant_id: tenantId,
          name: form.name.trim(),
          price: Number(form.price),
          description: form.description.trim() || null,
          image_url: imageUrl,
          is_active: true,
        })
        .select()
        .single()

      if (err) { setError("Erreur création produit: " + err.message); setSaving(false); return }
      if (!inserted) { setError("Produit non créé"); setSaving(false); return }
      productId = inserted.id
    }

    // Upload images supplémentaires (déjà compressées)
    if (extraImages.length > 0 && productId) {
      setUploading(true)
      for (let i = 0; i < extraImages.length; i++) {
        const url = await uploadImage(extraImages[i].file)
        if (url) {
          await supabase.from("product_images").insert({
            product_id: productId,
            tenant_id: tenantId,
            image_url: url,
            position: existingImages.length + i,
          })
        }
      }
      setUploading(false)
    }

    setSuccess(editing ? "Produit modifié ✓" : "Produit ajouté ✓")
    setTimeout(() => setSuccess(""), 3000)
    resetForm()
    loadData()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce produit ?")) return
    await supabase.from("product_images").delete().eq("product_id", id)
    await supabase.from("products").delete().eq("id", id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const inp = {
    width: "100%", background: S.bg, border: `1px solid ${S.border}`,
    borderRadius: 8, padding: "10px 12px", color: S.text, fontSize: 14,
    outline: "none", boxSizing: "border-box" as const,
  }

  if (loading) return (
    <div style={{ padding: 32, textAlign: "center", color: S.text2 }}>Chargement...</div>
  )

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: S.text }}>

      {/* Lien boutique */}
      {slug && (
        <div style={{ background: S.card2, border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div>
            <p style={{ color: S.text3, fontSize: 11, margin: "0 0 2px 0", fontWeight: 600 }}>LIEN DE TA BOUTIQUE</p>
            <p style={{ color: S.info, fontSize: 12, margin: 0, wordBreak: "break-all" }}>{getLienBoutique()}</p>
          </div>
          <button onClick={() => copyToClipboard(getLienBoutique(), "boutique")}
            style={{ background: copied === "boutique" ? S.success : S.border, border: "none", borderRadius: 6, padding: "6px 12px", color: copied === "boutique" ? "#000" : S.text, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            {copied === "boutique" ? "✓ Copié" : "📋 Copier"}
          </button>
        </div>
      )}

      {/* Messages */}
      {error && <div style={{ background: S.dangerBg, border: `1px solid rgba(248,113,113,0.2)`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: S.danger, fontSize: 13 }}>⚠️ {error}</div>}
      {success && <div style={{ background: "rgba(74,222,128,0.08)", border: `1px solid rgba(74,222,128,0.2)`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: S.success, fontSize: 13 }}>✅ {success}</div>}

      {/* Bouton ajouter */}
      {!showForm && (
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(EMPTY); setMainImagePreview(""); setExtraImages([]); setExistingImages([]) }}
          style={{ width: "100%", background: `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 10, padding: "12px", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
          + Nouveau produit
        </button>
      )}

      {/* Formulaire */}
      {showForm && (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <h3 style={{ color: S.text, fontSize: 15, fontWeight: 700, margin: "0 0 16px 0" }}>
            {editing ? "✏️ Modifier le produit" : "➕ Nouveau produit"}
          </h3>

          {/* Nom */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Nom du produit *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Crème visage hydratante" style={inp}
              onFocus={e => e.target.style.borderColor = S.gold} onBlur={e => e.target.style.borderColor = S.border} />
          </div>

          {/* Prix */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Prix *</label>
            <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="Ex: 5000" style={inp}
              onFocus={e => e.target.style.borderColor = S.gold} onBlur={e => e.target.style.borderColor = S.border} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Décris ton produit..." rows={3}
              style={{ ...inp, resize: "none", fontFamily: "Inter, sans-serif" }}
              onFocus={e => e.target.style.borderColor = S.gold} onBlur={e => e.target.style.borderColor = S.border} />
          </div>

          {/* Photo principale */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>📸 Photo principale *</label>
            <div onClick={() => mainFileRef.current?.click()} style={{ width: 120, height: 120, border: `2px dashed ${mainImagePreview ? S.gold : S.border}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: S.bg }}>
              {mainImagePreview ? (
                <img src={mainImagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 32 }}>📷</span>
              )}
            </div>
            <input ref={mainFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleMainImageChange} style={{ display: "none" }} />
            {mainImageInfo && <p style={{ color: S.success, fontSize: 11, margin: "6px 0 0 0" }}>{mainImageInfo}</p>}
          </div>

          {/* Photos supplémentaires */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
              📸 Photos supplémentaires ({existingImages.length + extraImages.length}/9)
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

              {/* Images existantes */}
              {existingImages.map(img => (
                <div key={img.id} style={{ position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
                  <img src={img.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => removeExistingImage(img)}
                    style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: S.danger, border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>×</button>
                </div>
              ))}

              {/* Nouvelles images */}
              {extraImages.map((img, i) => (
                <div key={i} style={{ position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: `1px solid ${S.gold}` }}>
                  <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => removeExtraImage(i)}
                    style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: S.danger, border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>×</button>
                </div>
              ))}

              {/* Bouton ajouter photo */}
              {existingImages.length + extraImages.length < 9 && (
                <div onClick={() => extraFileRef.current?.click()}
                  style={{ width: 72, height: 72, border: `2px dashed ${S.border}`, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: S.text3 }}>
                  +
                </div>
              )}
            </div>
            <input ref={extraFileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleExtraImagesChange} style={{ display: "none" }} />
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={resetForm} style={{ flex: 1, background: S.border, border: "none", borderRadius: 8, padding: "10px", color: S.text2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving || uploading}
              style={{ flex: 2, background: (saving || uploading) ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 8, padding: "10px", color: "#000", fontSize: 13, fontWeight: 700, cursor: (saving || uploading) ? "not-allowed" : "pointer" }}>
              {uploading ? "⬆️ Upload..." : saving ? "Enregistrement..." : editing ? "Modifier" : "Ajouter le produit"}
            </button>
          </div>
        </div>
      )}

      {/* Liste produits */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {products.length === 0 && !showForm && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: S.text3 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p>Aucun produit. Crée ton premier produit !</p>
          </div>
        )}

        {products.map(p => {
          const allImages = [p.image_url, ...(p.images?.map(i => i.image_url) || [])].filter(Boolean)
          return (
            <div key={p.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>

              {/* Photo + galerie */}
              <div style={{ flexShrink: 0 }}>
                {p.image_url ? (
                  <div style={{ position: "relative" }}>
                    <img src={p.image_url} alt={p.name} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />
                    {allImages.length > 1 && (
                      <div style={{ position: "absolute", bottom: 2, right: 2, background: "rgba(0,0,0,0.7)", borderRadius: 4, padding: "1px 5px", fontSize: 10, color: "#fff", fontWeight: 700 }}>
                        +{allImages.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ width: 80, height: 80, background: S.card2, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📦</div>
                )}
              </div>

              {/* Infos */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: S.text, fontSize: 14, fontWeight: 700, margin: "0 0 2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                <p style={{ color: S.gold, fontSize: 15, fontWeight: 800, margin: "0 0 4px 0" }}>{Number(p.price).toLocaleString("fr-FR")} FCFA</p>
                {p.description && <p style={{ color: S.text2, fontSize: 12, margin: "0 0 6px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</p>}

                {/* Lien produit */}
                {slug && (
                  <button onClick={() => copyToClipboard(getLienProduit(p), `p_${p.id}`)}
                    style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 6, padding: "3px 8px", color: copied === `p_${p.id}` ? S.success : S.info, fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                    {copied === `p_${p.id}` ? "✓ Copié" : "🔗 Lien produit"}
                  </button>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(p)}
                  style={{ background: S.border, border: "none", borderRadius: 6, padding: "6px 10px", color: S.text2, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
                  ✏️
                </button>
                <button onClick={() => handleDelete(p.id)}
                  style={{ background: S.dangerBg, border: "none", borderRadius: 6, padding: "6px 10px", color: S.danger, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
