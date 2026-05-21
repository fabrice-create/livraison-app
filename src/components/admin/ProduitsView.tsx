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
  id: number
  name: string
  price: number
  description?: string
  image_url?: string
  is_active: boolean
  created_at: string
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [imageInfo, setImageInfo] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [copied, setCopied] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [tenantId])

  const loadData = async () => {
    setLoading(true)
    // Charger slug si pas fourni
    if (!slug) {
      const { data: tenant } = await supabase
        .from("tenants").select("slug").eq("id", tenantId).single()
      if (tenant) setSlug(tenant.slug)
    }
    const { data } = await supabase
      .from("products").select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
    setProducts(data || [])
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
    } catch {
      // fallback
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(key)
      setTimeout(() => setCopied(""), 2000)
    }
  }

  const openAdd = () => {
    setEditing(null); setForm(EMPTY)
    setImageFile(null); setImagePreview(""); setImageInfo("")
    setError(""); setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, price: String(p.price), description: p.description || "" })
    setImageFile(null); setImagePreview(p.image_url || ""); setImageInfo("")
    setError(""); setShowForm(true)
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")
    if (file.size > 10 * 1024 * 1024) { setError("Photo trop lourde. Max 10 MB."); return }
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    setImageInfo("Compression en cours...")
    const compressed = await compressImage(file, 800, 0.82)
    setImageFile(compressed)
    setImageInfo(`✓ Optimisé : ${formatFileSize(compressed.size)} (était ${formatFileSize(file.size)})`)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true)
    const fileName = `${tenantId}/${Date.now()}.jpg`
    const { error: err } = await supabase.storage
      .from("shipivo-images").upload(fileName, file, { contentType: "image/jpeg", upsert: false })
    setUploading(false)
    if (err) { setError("Erreur upload : " + err.message); return null }
    const { data } = supabase.storage.from("shipivo-images").getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Le nom est requis"); return }
    if (!form.price || isNaN(Number(form.price))) { setError("Le prix est requis"); return }
    setError(""); setSaving(true)
    let imageUrl = editing?.image_url || null
    if (imageFile) {
      const url = await uploadImage(imageFile)
      if (!url) { setSaving(false); return }
      imageUrl = url
    }
    const payload = {
      tenant_id: tenantId, name: form.name.trim(),
      price: Number(form.price), description: form.description.trim() || null,
      image_url: imageUrl, is_active: true,
    }
    if (editing) {
      await supabase.from("products").update(payload).eq("id", editing.id)
      setSuccess("Produit modifié ✓")
    } else {
      await supabase.from("products").insert(payload)
      setSuccess("Produit ajouté ✓")
    }
    setSaving(false); setShowForm(false); loadData()
    setTimeout(() => setSuccess(""), 3000)
  }

  const toggleActive = async (p: Product) => {
    await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id)
    loadData()
  }

  const deleteProduct = async (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return
    await supabase.from("products").delete().eq("id", id)
    loadData()
  }

  const inp = { width: "100%", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 12px", color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const }

  return (
    <div style={{ padding: "0 0 40px 0" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: 0 }}>Mes produits</h2>
          <p style={{ color: S.text3, fontSize: 13, margin: "4px 0 0 0" }}>{products.length} produit{products.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={openAdd} style={{ background: `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 10, padding: "10px 16px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Ajouter
        </button>
      </div>

      {/* Lien boutique */}
      {slug && (
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
          <p style={{ color: S.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 6px 0" }}>🔗 Lien de ta boutique</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ color: S.gold, fontSize: 13, fontWeight: 600, margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {getLienBoutique()}
            </p>
            <button onClick={() => copyToClipboard(getLienBoutique(), "boutique")}
              style={{ background: copied === "boutique" ? "rgba(74,222,128,0.1)" : S.card2, border: `1px solid ${S.border}`, borderRadius: 6, padding: "6px 10px", color: copied === "boutique" ? S.success : S.text2, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
              {copied === "boutique" ? "✓ Copié !" : "📋 Copier"}
            </button>
          </div>
        </div>
      )}

      {success && <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: S.success, fontSize: 13 }}>{success}</div>}

      {/* Formulaire */}
      {showForm && (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: S.text, fontSize: 15, fontWeight: 700, margin: "0 0 16px 0" }}>
            {editing ? "Modifier le produit" : "Nouveau produit"}
          </h3>

          {/* Upload photo */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Photo du produit (format carré 1:1)</label>
            <div onClick={() => fileInputRef.current?.click()} style={{
              width: "100%", height: 160, borderRadius: 12,
              border: `2px dashed ${imagePreview ? S.gold : S.border}`,
              background: S.bg, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {imagePreview ? (
                <img src={imagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <span style={{ fontSize: 36, marginBottom: 8 }}>📷</span>
                  <span style={{ color: S.text2, fontSize: 13, fontWeight: 500 }}>Appuie pour choisir une photo</span>
                  <span style={{ color: S.text3, fontSize: 11, marginTop: 4 }}>Format carré · Auto-compressé · 2G/3G compatible</span>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: "none" }} />
            {imageInfo && <p style={{ color: S.success, fontSize: 11, margin: "6px 0 0 0" }}>{imageInfo}</p>}
            {imagePreview && (
              <button onClick={() => { setImageFile(null); setImagePreview(""); setImageInfo("") }}
                style={{ marginTop: 6, background: "transparent", border: "none", color: S.danger, fontSize: 12, cursor: "pointer", padding: 0 }}>
                ✕ Supprimer la photo
              </button>
            )}
          </div>

          {[
            { label: "Nom du produit *", key: "name", placeholder: "Ex: THERAWOLF Balm 50ml" },
            { label: "Prix (FCFA) *", key: "price", placeholder: "Ex: 15000", type: "number" },
            { label: "Description", key: "description", placeholder: "Description courte du produit" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{f.label}</label>
              <input type={f.type || "text"} value={(form as Record<string, string>)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder} style={inp}
                onFocus={e => e.target.style.borderColor = S.gold}
                onBlur={e => e.target.style.borderColor = S.border} />
            </div>
          ))}

          {error && <div style={{ color: S.danger, fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px", color: S.text2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
            <button onClick={handleSave} disabled={saving || uploading} style={{ flex: 2, background: (saving || uploading) ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 8, padding: "10px", color: "#000", fontSize: 13, fontWeight: 700, cursor: (saving || uploading) ? "not-allowed" : "pointer" }}>
              {uploading ? "⬆️ Upload..." : saving ? "Enregistrement..." : editing ? "Modifier" : "Ajouter le produit"}
            </button>
          </div>
        </div>
      )}

      {/* Liste produits */}
      {loading ? (
        <p style={{ color: S.text3, fontSize: 14, textAlign: "center", padding: "40px 0" }}>Chargement...</p>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <p style={{ color: S.text3, fontSize: 14 }}>Aucun produit. Ajoute ton premier produit !</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {products.map(p => (
            <div key={p.id} style={{ background: S.card, border: `1px solid ${p.is_active ? S.border : "#2D1500"}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 0 }}>
                {/* Photo carré */}
                <div style={{ width: 90, height: 90, flexShrink: 0 }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} style={{ width: 90, height: 90, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 90, height: 90, background: S.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📦</div>
                  )}
                </div>
                {/* Infos */}
                <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <h4 style={{ color: p.is_active ? S.text : S.text3, fontSize: 14, fontWeight: 700, margin: 0 }}>{p.name}</h4>
                    <span style={{ color: S.gold, fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{Number(p.price).toLocaleString("fr-FR")} F</span>
                  </div>
                  {p.description && <p style={{ color: S.text3, fontSize: 12, margin: "4px 0 0 0", lineHeight: 1.4 }}>{p.description}</p>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ borderTop: `1px solid ${S.border}`, padding: "10px 14px", display: "flex", gap: 6, flexWrap: "wrap" as const, background: S.card2 }}>
                <button onClick={() => openEdit(p)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `1px solid ${S.border}`, background: "transparent", color: S.text2, cursor: "pointer" }}>
                  ✏️ Modifier
                </button>
                <button onClick={() => toggleActive(p)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "none", background: p.is_active ? "#2D1500" : "rgba(74,222,128,0.1)", color: p.is_active ? "#FB923C" : S.success, cursor: "pointer" }}>
                  {p.is_active ? "⏸ Dépublier" : "▶ Publier"}
                </button>
                {slug && (
                  <>
                    <button onClick={() => copyToClipboard(getLienBoutique(), `boutique-${p.id}`)}
                      style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "none", background: copied === `boutique-${p.id}` ? "rgba(74,222,128,0.1)" : "rgba(96,165,250,0.1)", color: copied === `boutique-${p.id}` ? S.success : S.info, cursor: "pointer" }}>
                      {copied === `boutique-${p.id}` ? "✓ Copié !" : "🔗 Lien boutique"}
                    </button>
                    <button onClick={() => copyToClipboard(getLienProduit(p), `produit-${p.id}`)}
                      style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "none", background: copied === `produit-${p.id}` ? "rgba(74,222,128,0.1)" : "rgba(245,158,11,0.1)", color: copied === `produit-${p.id}` ? S.success : S.gold, cursor: "pointer" }}>
                      {copied === `produit-${p.id}` ? "✓ Copié !" : "🛒 Lien produit"}
                    </button>
                  </>
                )}
                <button onClick={() => deleteProduct(p.id)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "none", background: S.dangerBg, color: S.danger, cursor: "pointer" }}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
