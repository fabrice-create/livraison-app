"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"
import { compressImage, formatFileSize } from "@/lib/imageUtils"

const S = {
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", info: "#60A5FA", warning: "#FB923C",
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

interface Props { tenantId: string }

const EMPTY = { name: "", price: "", description: "" }

export default function ProduitsView({ tenantId }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [imageInfo, setImageInfo] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadProducts() }, [tenantId])

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY)
    setImageFile(null)
    setImagePreview("")
    setImageInfo("")
    setError("")
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, price: String(p.price), description: p.description || "" })
    setImageFile(null)
    setImagePreview(p.image_url || "")
    setImageInfo("")
    setError("")
    setShowForm(true)
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")

    // Vérifier taille avant compression
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo trop lourde. Maximum 10 MB avant compression.")
      return
    }

    // Afficher preview immédiatement
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Compresser en arrière-plan
    setImageInfo("Compression en cours...")
    const compressed = await compressImage(file, 800, 0.82)
    setImageFile(compressed)
    setImageInfo(`✓ Optimisé : ${formatFileSize(compressed.size)} (était ${formatFileSize(file.size)})`)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true)
    const fileName = `${tenantId}/${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from("shipivo-images")
      .upload(fileName, file, { contentType: "image/jpeg", cacheControl: "3600", upsert: false })
    setUploading(false)
    if (uploadError) { setError("Erreur upload : " + uploadError.message); return null }
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
      tenant_id: tenantId,
      name: form.name.trim(),
      price: Number(form.price),
      description: form.description.trim() || null,
      image_url: imageUrl,
      is_active: true,
    }

    if (editing) {
      await supabase.from("products").update(payload).eq("id", editing.id)
      setSuccess("Produit modifié ✓")
    } else {
      await supabase.from("products").insert(payload)
      setSuccess("Produit ajouté ✓")
    }

    setSaving(false)
    setShowForm(false)
    loadProducts()
    setTimeout(() => setSuccess(""), 3000)
  }

  const toggleActive = async (p: Product) => {
    await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id)
    loadProducts()
  }

  const deleteProduct = async (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return
    await supabase.from("products").delete().eq("id", id)
    loadProducts()
  }

  const inp = {
    width: "100%", background: S.bg, border: `1px solid ${S.border}`,
    borderRadius: 8, padding: "10px 12px", color: S.text, fontSize: 13,
    outline: "none", boxSizing: "border-box" as const,
  }

  return (
    <div style={{ padding: "0 0 40px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: 0 }}>Mes produits</h2>
          <p style={{ color: S.text3, fontSize: 13, margin: "4px 0 0 0" }}>{products.length} produit{products.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={openAdd} style={{ background: `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 10, padding: "10px 16px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Ajouter
        </button>
      </div>

      {success && (
        <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: S.success, fontSize: 13 }}>
          {success}
        </div>
      )}

      {showForm && (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: S.text, fontSize: 15, fontWeight: 700, margin: "0 0 16px 0" }}>
            {editing ? "Modifier le produit" : "Nouveau produit"}
          </h3>

          {/* Zone upload photo */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
              Photo du produit
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%", height: 150, borderRadius: 12,
                border: `2px dashed ${imagePreview ? S.gold : S.border}`,
                background: S.bg, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                overflow: "hidden", transition: "border-color 0.2s",
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <span style={{ fontSize: 36, marginBottom: 8 }}>📷</span>
                  <span style={{ color: S.text2, fontSize: 13, fontWeight: 500 }}>Appuie pour choisir une photo</span>
                  <span style={{ color: S.text3, fontSize: 11, marginTop: 4 }}>JPG, PNG, WebP · Auto-compressé pour 2G/3G</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            {imageInfo && (
              <p style={{ color: S.success, fontSize: 11, margin: "6px 0 0 0" }}>{imageInfo}</p>
            )}
            {imagePreview && (
              <button
                onClick={() => { setImageFile(null); setImagePreview(""); setImageInfo("") }}
                style={{ marginTop: 6, background: "transparent", border: "none", color: S.danger, fontSize: 12, cursor: "pointer", padding: 0 }}
              >
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
              <input
                type={f.type || "text"}
                value={(form as Record<string, string>)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={inp}
                onFocus={e => e.target.style.borderColor = S.gold}
                onBlur={e => e.target.style.borderColor = S.border}
              />
            </div>
          ))}

          {error && <div style={{ color: S.danger, fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px", color: S.text2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving || uploading} style={{ flex: 2, background: (saving || uploading) ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 8, padding: "10px", color: "#000", fontSize: 13, fontWeight: 700, cursor: (saving || uploading) ? "not-allowed" : "pointer" }}>
              {uploading ? "⬆️ Upload photo..." : saving ? "Enregistrement..." : editing ? "Modifier" : "Ajouter le produit"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: S.text3, fontSize: 14, textAlign: "center", padding: "40px 0" }}>Chargement...</p>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <p style={{ color: S.text3, fontSize: 14 }}>Aucun produit. Ajoute ton premier produit !</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {products.map(p => (
            <div key={p.id} style={{ background: S.card, border: `1px solid ${p.is_active ? S.border : "#2D1500"}`, borderRadius: 14, padding: 14, opacity: p.is_active ? 1 : 0.6 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 10, background: S.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📦</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <h4 style={{ color: S.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{p.name}</h4>
                    <span style={{ color: S.gold, fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{Number(p.price).toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  {p.description && <p style={{ color: S.text3, fontSize: 12, margin: "4px 0 8px 0", lineHeight: 1.4 }}>{p.description}</p>}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 8 }}>
                    <button onClick={() => openEdit(p)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: `1px solid ${S.border}`, background: "transparent", color: S.text2, cursor: "pointer" }}>✏️ Modifier</button>
                    <button onClick={() => toggleActive(p)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "none", background: p.is_active ? "#2D1500" : "rgba(74,222,128,0.1)", color: p.is_active ? "#FB923C" : S.success, cursor: "pointer" }}>
                      {p.is_active ? "⏸ Désactiver" : "▶ Activer"}
                    </button>
                    <button onClick={() => deleteProduct(p.id)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, border: "none", background: S.dangerBg, color: S.danger, cursor: "pointer" }}>🗑 Supprimer</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
