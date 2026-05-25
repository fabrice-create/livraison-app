"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"
import type { Zone, Profile } from "@/types"

const S = {
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  gold: "#F59E0B", goldDk: "#D97706", goldDim: "#92610A",
  white: "#F8F8FC", muted: "#55556A", muted2: "#9898B0",
  success: "#4ADE80", danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  info: "#60A5FA",
}

const DEVISES = ["FCFA","XOF","XAF","USD","EUR","GHS","NGN","MAD"]
const PAYS_PRESETS = [
  // ── Afrique de l'Ouest ──
  { nom:"Togo", pays:"Togo", emoji:"🇹🇬", devise:"FCFA" },
  { nom:"Sénégal", pays:"Sénégal", emoji:"🇸🇳", devise:"FCFA" },
  { nom:"Mali", pays:"Mali", emoji:"🇲🇱", devise:"FCFA" },
  { nom:"Côte d'Ivoire", pays:"Côte d'Ivoire", emoji:"🇨🇮", devise:"FCFA" },
  { nom:"Bénin", pays:"Bénin", emoji:"🇧🇯", devise:"FCFA" },
  { nom:"Burkina Faso", pays:"Burkina Faso", emoji:"🇧🇫", devise:"FCFA" },
  { nom:"Niger", pays:"Niger", emoji:"🇳🇪", devise:"FCFA" },
  { nom:"Guinée", pays:"Guinée", emoji:"🇬🇳", devise:"GNF" },
  { nom:"Guinée-Bissau", pays:"Guinée-Bissau", emoji:"🇬🇼", devise:"FCFA" },
  { nom:"Sierra Leone", pays:"Sierra Leone", emoji:"🇸🇱", devise:"SLL" },
  { nom:"Liberia", pays:"Liberia", emoji:"🇱🇷", devise:"LRD" },
  { nom:"Ghana", pays:"Ghana", emoji:"🇬🇭", devise:"GHS" },
  { nom:"Nigeria", pays:"Nigeria", emoji:"🇳🇬", devise:"NGN" },
  { nom:"Cap-Vert", pays:"Cap-Vert", emoji:"🇨🇻", devise:"CVE" },
  { nom:"Gambie", pays:"Gambie", emoji:"🇬🇲", devise:"GMD" },
  { nom:"Mauritanie", pays:"Mauritanie", emoji:"🇲🇷", devise:"MRU" },
  // ── Afrique Centrale ──
  { nom:"Cameroun", pays:"Cameroun", emoji:"🇨🇲", devise:"XAF" },
  { nom:"Gabon", pays:"Gabon", emoji:"🇬🇦", devise:"XAF" },
  { nom:"Congo-Brazzaville", pays:"Congo", emoji:"🇨🇬", devise:"XAF" },
  { nom:"RD Congo", pays:"RD Congo", emoji:"🇨🇩", devise:"CDF" },
  { nom:"Tchad", pays:"Tchad", emoji:"🇹🇩", devise:"XAF" },
  { nom:"Centrafrique", pays:"Centrafrique", emoji:"🇨🇫", devise:"XAF" },
  { nom:"Guinée Équatoriale", pays:"Guinée Équatoriale", emoji:"🇬🇶", devise:"XAF" },
  { nom:"São Tomé", pays:"São Tomé", emoji:"🇸🇹", devise:"STN" },
  // ── Afrique de l'Est ──
  { nom:"Éthiopie", pays:"Éthiopie", emoji:"🇪🇹", devise:"ETB" },
  { nom:"Kenya", pays:"Kenya", emoji:"🇰🇪", devise:"KES" },
  { nom:"Tanzanie", pays:"Tanzanie", emoji:"🇹🇿", devise:"TZS" },
  { nom:"Ouganda", pays:"Ouganda", emoji:"🇺🇬", devise:"UGX" },
  { nom:"Rwanda", pays:"Rwanda", emoji:"🇷🇼", devise:"RWF" },
  { nom:"Burundi", pays:"Burundi", emoji:"🇧🇮", devise:"BIF" },
  { nom:"Somalie", pays:"Somalie", emoji:"🇸🇴", devise:"SOS" },
  { nom:"Djibouti", pays:"Djibouti", emoji:"🇩🇯", devise:"DJF" },
  { nom:"Érythrée", pays:"Érythrée", emoji:"🇪🇷", devise:"ERN" },
  { nom:"Soudan", pays:"Soudan", emoji:"🇸🇩", devise:"SDG" },
  { nom:"Soudan du Sud", pays:"Soudan du Sud", emoji:"🇸🇸", devise:"SSP" },
  // ── Afrique du Nord ──
  { nom:"Maroc", pays:"Maroc", emoji:"🇲🇦", devise:"MAD" },
  { nom:"Algérie", pays:"Algérie", emoji:"🇩🇿", devise:"DZD" },
  { nom:"Tunisie", pays:"Tunisie", emoji:"🇹🇳", devise:"TND" },
  { nom:"Libye", pays:"Libye", emoji:"🇱🇾", devise:"LYD" },
  { nom:"Égypte", pays:"Égypte", emoji:"🇪🇬", devise:"EGP" },
  // ── Afrique du Sud & Australe ──
  { nom:"Afrique du Sud", pays:"Afrique du Sud", emoji:"🇿🇦", devise:"ZAR" },
  { nom:"Angola", pays:"Angola", emoji:"🇦🇴", devise:"AOA" },
  { nom:"Mozambique", pays:"Mozambique", emoji:"🇲🇿", devise:"MZN" },
  { nom:"Zimbabwe", pays:"Zimbabwe", emoji:"🇿🇼", devise:"ZWL" },
  { nom:"Zambie", pays:"Zambie", emoji:"🇿🇲", devise:"ZMW" },
  { nom:"Malawi", pays:"Malawi", emoji:"🇲🇼", devise:"MWK" },
  { nom:"Madagascar", pays:"Madagascar", emoji:"🇲🇬", devise:"MGA" },
  { nom:"Namibie", pays:"Namibie", emoji:"🇳🇦", devise:"NAD" },
  { nom:"Botswana", pays:"Botswana", emoji:"🇧🇼", devise:"BWP" },
  { nom:"Lesotho", pays:"Lesotho", emoji:"🇱🇸", devise:"LSL" },
  { nom:"Eswatini", pays:"Eswatini", emoji:"🇸🇿", devise:"SZL" },
  { nom:"Comores", pays:"Comores", emoji:"🇰🇲", devise:"KMF" },
  { nom:"Maurice", pays:"Maurice", emoji:"🇲🇺", devise:"MUR" },
  { nom:"Seychelles", pays:"Seychelles", emoji:"🇸🇨", devise:"SCR" },
  // ── Europe ──
  { nom:"France", pays:"France", emoji:"🇫🇷", devise:"EUR" },
  { nom:"Belgique", pays:"Belgique", emoji:"🇧🇪", devise:"EUR" },
  { nom:"Suisse", pays:"Suisse", emoji:"🇨🇭", devise:"CHF" },
  { nom:"Canada", pays:"Canada", emoji:"🇨🇦", devise:"CAD" },
  { nom:"États-Unis", pays:"États-Unis", emoji:"🇺🇸", devise:"USD" },
]

interface Props {
  tenantId: string
  tenantSlug: string
}

export default function ZonesView({ tenantId, tenantSlug }: Props) {
  const [zones, setZones] = useState<Zone[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState("")
  const [error, setError] = useState("")
  const [editZone, setEditZone] = useState<Zone | null>(null)
  const [assignModal, setAssignModal] = useState<Zone | null>(null)
  const [filteredPays, setFilteredPays] = useState(PAYS_PRESETS)
  const [products, setProducts] = useState<{id:string;nom:string;slug:string}[]>([])
  const [showProducts, setShowProducts] = useState<string | null>(null)

  const [form, setForm] = useState({
    nom: "", pays: "", emoji: "🌍", frais_livraison: 0, devise: "FCFA"
  })

  useEffect(() => { loadData() }, [tenantId])

  const loadData = async () => {
    setLoading(true)
    const [zonesRes, profilesRes] = await Promise.all([
      supabase.from("zones").select("*").eq("tenant_id", tenantId).order("created_at"),
      supabase.from("profiles").select("id, full_name, role, zone_id, zone_nom, is_active")
        .eq("tenant_id", tenantId).eq("is_active", true)
        .in("role", ["livreur","Livreur","closureuse","Closureuse"])
    ])
    setZones((zonesRes.data || []) as Zone[])
    setProfiles((profilesRes.data || []) as Profile[])
    // Charger les produits actifs
    const { data: prods } = await supabase
      .from("products").select("id, nom, slug")
      .eq("tenant_id", tenantId).eq("is_active", true).not("slug", "is", null)
    setProducts((prods || []) as {id:string;nom:string;slug:string}[])
    setLoading(false)
  }

  const applyPreset = (preset: typeof PAYS_PRESETS[0]) => {
    setForm(f => ({ ...f, nom: preset.nom, pays: preset.pays, emoji: preset.emoji, devise: preset.devise }))
  }

  const handleSave = async () => {
    if (!form.nom || !form.pays) { setError("Nom et pays requis."); return }
    setSaving(true); setError("")

    if (editZone) {
      const { error: err } = await supabase.from("zones").update({
        nom: form.nom, pays: form.pays, emoji: form.emoji,
        frais_livraison: form.frais_livraison, devise: form.devise,
      }).eq("id", editZone.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from("zones").insert({
        tenant_id: tenantId, nom: form.nom, pays: form.pays,
        emoji: form.emoji, frais_livraison: form.frais_livraison, devise: form.devise,
      })
      if (err) { setError(err.message); setSaving(false); return }
    }

    setForm({ nom:"", pays:"", emoji:"🌍", frais_livraison:0, devise:"FCFA" })
    setShowForm(false); setEditZone(null)
    await loadData()
    setSaving(false)
  }

  const handleDelete = async (zone: Zone) => {
    if (!confirm(`Supprimer la zone ${zone.emoji} ${zone.nom} ?`)) return
    await supabase.from("zones").delete().eq("id", zone.id)
    await loadData()
  }

  const handleAssignMember = async (profileId: string, zone: Zone | null) => {
    await supabase.from("profiles").update({
      zone_id: zone?.id || null,
      zone_nom: zone?.nom || null,
    }).eq("id", profileId)
    await loadData()
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(""), 2000)
  }

  const boutiquBase = `https://shipivo.app/commander/${tenantSlug}`

  const inp: React.CSSProperties = {
    width:"100%", background:S.bg, border:`1px solid ${S.border}`,
    borderRadius:8, padding:"10px 12px", color:S.white, fontSize:13,
    outline:"none", boxSizing:"border-box" as const,
  }

  if (loading) return <p style={{ color:S.muted, textAlign:"center", padding:32 }}>Chargement...</p>

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <p style={{ color:S.white, fontSize:15, fontWeight:700, margin:"0 0 4px" }}>🌍 Zones de vente</p>
          <p style={{ color:S.muted2, fontSize:13, margin:0 }}>Gérez vos pays et assignez votre équipe par zone.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditZone(null); setForm({ nom:"", pays:"", emoji:"🌍", frais_livraison:0, devise:"FCFA" }) }}
          style={{ padding:"9px 18px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:"#000", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          {showForm ? "✕ Fermer" : "+ Ajouter une zone"}
        </button>
      </div>

      {error && <div style={{ background:S.dangerBg, border:"1px solid rgba(248,113,113,0.2)", borderRadius:8, padding:"10px 14px", marginBottom:14, color:S.danger, fontSize:13 }}>⚠️ {error}</div>}

      {/* Formulaire ajout/édition zone */}
      {showForm && (
        <div style={{ background:S.card2, border:`1px solid ${S.border}`, borderRadius:14, padding:"18px 16px", marginBottom:20 }}>
          <p style={{ color:S.muted2, fontSize:12, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:12 }}>
            {editZone ? "Modifier la zone" : "Nouvelle zone"}
          </p>

          {/* Pays presets avec recherche */}
          {!editZone && (
            <div style={{ marginBottom:14 }}>
              <p style={{ color:S.muted2, fontSize:12, marginBottom:8 }}>Sélection rapide :</p>
              <input
                placeholder="🔍 Rechercher un pays..."
                style={{ ...inp, marginBottom:8 }}
                onChange={e => {
                  const val = e.target.value.toLowerCase()
                  const filtered = PAYS_PRESETS.filter(p =>
                    p.nom.toLowerCase().includes(val) || p.pays.toLowerCase().includes(val)
                  )
                  setFilteredPays(val ? filtered : PAYS_PRESETS)
                }}
              />
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, maxHeight:160, overflowY:"auto" as const, padding:4 }}>
                {filteredPays.map(p => (
                  <button key={p.pays} onClick={() => applyPreset(p)} style={{
                    padding:"5px 10px", borderRadius:20, border:`1px solid ${form.pays===p.pays?S.gold:S.border}`,
                    background: form.pays===p.pays?"rgba(245,158,11,0.1)":"transparent",
                    color: form.pays===p.pays?S.gold:S.muted2, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" as const,
                  }}>
                    {p.emoji} {p.nom}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Nom de la zone *</label>
              <input value={form.nom} onChange={e => setForm(f=>({...f,nom:e.target.value}))} placeholder="Ex: Togo, Dakar, Paris..." style={inp} />
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Pays *</label>
              <input value={form.pays} onChange={e => setForm(f=>({...f,pays:e.target.value}))} placeholder="Ex: Togo" style={inp} />
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Frais de livraison</label>
              <input type="number" value={form.frais_livraison} onChange={e => setForm(f=>({...f,frais_livraison:Number(e.target.value)}))} min="0" style={inp} />
            </div>
            <div>
              <label style={{ display:"block", color:S.muted2, fontSize:12, marginBottom:6 }}>Devise</label>
              <select value={form.devise} onChange={e => setForm(f=>({...f,devise:e.target.value}))} style={inp}>
                {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => { setShowForm(false); setEditZone(null) }}
              style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${S.border}`, background:"transparent", color:S.muted2, fontSize:13, cursor:"pointer" }}>
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:2, padding:"10px", borderRadius:10, border:"none", background:saving?S.goldDim:`linear-gradient(135deg,${S.gold},${S.goldDk})`, color:"#000", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
              {saving ? "Enregistrement..." : editZone ? "✅ Modifier" : "✅ Créer la zone"}
            </button>
          </div>
        </div>
      )}

      {/* Liste des zones */}
      {zones.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", background:S.card, borderRadius:14, border:`1px solid ${S.border}` }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🌍</div>
          <p style={{ color:S.white, fontSize:15, fontWeight:700, margin:"0 0 8px" }}>Aucune zone créée</p>
          <p style={{ color:S.muted2, fontSize:13, margin:0 }}>Crée ta première zone pour commencer à vendre dans plusieurs pays.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {zones.map(zone => {
            const members = profiles.filter(p => p.zone_id === zone.id)
            const livreurs = members.filter(p => ["livreur","Livreur"].includes(p.role))
            const closeurs = members.filter(p => ["closureuse","Closureuse"].includes(p.role))

            return (
              <div key={zone.id} style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:16, overflow:"hidden" }}>
                {/* Header zone */}
                <div style={{ padding:"16px 18px", borderBottom:`1px solid ${S.border}`, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <span style={{ fontSize:28 }}>{zone.emoji}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ color:S.white, fontSize:16, fontWeight:700, margin:"0 0 2px" }}>{zone.nom}</p>
                    <p style={{ color:S.muted2, fontSize:12, margin:0 }}>
                      {zone.pays} · {zone.frais_livraison === 0 ? "Livraison gratuite" : `${zone.frais_livraison.toLocaleString("fr-FR")} ${zone.devise}`}
                    </p>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => { setAssignModal(zone) }}
                      style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${S.border}`, background:"transparent", color:S.muted2, fontSize:12, cursor:"pointer" }}>
                      👥 Équipe
                    </button>
                    <button onClick={() => { setEditZone(zone); setForm({ nom:zone.nom, pays:zone.pays, emoji:zone.emoji, frais_livraison:zone.frais_livraison, devise:zone.devise }); setShowForm(true) }}
                      style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${S.border}`, background:"transparent", color:S.gold, fontSize:12, cursor:"pointer" }}>
                      ✏️ Modifier
                    </button>
                    <button onClick={() => handleDelete(zone)}
                      style={{ padding:"6px 12px", borderRadius:8, border:"none", background:S.dangerBg, color:S.danger, fontSize:12, cursor:"pointer" }}>
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Équipe */}
                <div style={{ padding:"12px 18px", borderBottom:`1px solid ${S.border}` }}>
                  <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
                    <div>
                      <p style={{ color:S.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em", margin:"0 0 6px" }}>Livreurs ({livreurs.length})</p>
                      {livreurs.length === 0
                        ? <p style={{ color:S.muted, fontSize:12, margin:0 }}>Aucun assigné</p>
                        : livreurs.map(l => <span key={l.id} style={{ display:"inline-block", background:"rgba(74,222,128,0.1)", color:"#4ADE80", padding:"3px 10px", borderRadius:20, fontSize:12, marginRight:6 }}>🛵 {l.full_name}</span>)
                      }
                    </div>
                    <div>
                      <p style={{ color:S.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em", margin:"0 0 6px" }}>Closeurs ({closeurs.length})</p>
                      {closeurs.length === 0
                        ? <p style={{ color:S.muted, fontSize:12, margin:0 }}>Aucun assigné</p>
                        : closeurs.map(c => <span key={c.id} style={{ display:"inline-block", background:"rgba(96,165,250,0.1)", color:S.info, padding:"3px 10px", borderRadius:20, fontSize:12, marginRight:6 }}>📞 {c.full_name}</span>)
                      }
                    </div>
                  </div>
                </div>

                {/* Liens */}
                <div style={{ padding:"12px 18px" }}>
                  <p style={{ color:S.muted2, fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em", margin:"0 0 10px" }}>🔗 Liens de vente</p>
                  
                  {/* Liens catalogue par source */}
                  <p style={{ color:S.muted2, fontSize:11, margin:"0 0 6px", fontWeight:600 }}>📦 Catalogue — tous les produits</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
                    {[
                      { label:"Facebook", url:`${boutiquBase}?zone=${encodeURIComponent(zone.nom.toLowerCase())}&src=facebook`, color:"#1877F2" },
                      { label:"TikTok", url:`${boutiquBase}?zone=${encodeURIComponent(zone.nom.toLowerCase())}&src=tiktok`, color:"#FF0050" },
                      { label:"WhatsApp", url:`${boutiquBase}?zone=${encodeURIComponent(zone.nom.toLowerCase())}&src=whatsapp`, color:"#25D366" },
                    ].map(l => (
                      <div key={l.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ color:l.color, fontSize:11, width:70, flexShrink:0, fontWeight:600 }}>{l.label}</span>
                        <div style={{ flex:1, background:S.bg, border:`1px solid ${S.border}`, borderRadius:6, padding:"5px 8px", fontFamily:"monospace", fontSize:10, color:S.muted2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                          {l.url}
                        </div>
                        <button onClick={() => copy(l.url, `${zone.id}-cat-${l.label}`)}
                          style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${copied===`${zone.id}-cat-${l.label}`?"#4ADE80":S.border}`, background:"transparent", color:copied===`${zone.id}-cat-${l.label}`?"#4ADE80":S.muted2, fontSize:11, cursor:"pointer", flexShrink:0 }}>
                          {copied===`${zone.id}-cat-${l.label}` ? "✓" : "Copier"}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Liens pages de vente par produit */}
                  {products.length > 0 && (
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <p style={{ color:S.muted2, fontSize:11, margin:0, fontWeight:600 }}>🎯 Pages de vente — par produit</p>
                        <button onClick={() => setShowProducts(showProducts === zone.id ? null : zone.id)}
                          style={{ padding:"3px 10px", borderRadius:20, border:`1px solid ${S.border}`, background:"transparent", color:S.muted2, fontSize:11, cursor:"pointer" }}>
                          {showProducts === zone.id ? "Masquer" : "Afficher"}
                        </button>
                      </div>
                      {showProducts === zone.id && (
                        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                          {products.map(p => (
                            <div key={p.id} style={{ background:S.bg, borderRadius:8, padding:"10px 12px", border:`1px solid ${S.border}` }}>
                              <p style={{ color:S.white, fontSize:12, fontWeight:700, margin:"0 0 8px" }}>📄 {p.nom}</p>
                              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                                {[
                                  { label:"Facebook", url:`https://shipivo.app/produit/${tenantSlug}/${p.slug}?zone=${encodeURIComponent(zone.nom.toLowerCase())}&src=facebook`, color:"#1877F2" },
                                  { label:"TikTok", url:`https://shipivo.app/produit/${tenantSlug}/${p.slug}?zone=${encodeURIComponent(zone.nom.toLowerCase())}&src=tiktok`, color:"#FF0050" },
                                  { label:"WhatsApp", url:`https://shipivo.app/produit/${tenantSlug}/${p.slug}?zone=${encodeURIComponent(zone.nom.toLowerCase())}&src=whatsapp`, color:"#25D366" },
                                ].map(l => (
                                  <div key={l.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{ color:l.color, fontSize:10, width:65, flexShrink:0, fontWeight:600 }}>{l.label}</span>
                                    <div style={{ flex:1, background:S.card, border:`1px solid ${S.border}`, borderRadius:5, padding:"4px 8px", fontFamily:"monospace", fontSize:9, color:S.muted2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                                      {l.url}
                                    </div>
                                    <button onClick={() => copy(l.url, `${zone.id}-${p.id}-${l.label}`)}
                                      style={{ padding:"4px 8px", borderRadius:5, border:`1px solid ${copied===`${zone.id}-${p.id}-${l.label}`?"#4ADE80":S.border}`, background:"transparent", color:copied===`${zone.id}-${p.id}-${l.label}`?"#4ADE80":S.muted2, fontSize:10, cursor:"pointer", flexShrink:0 }}>
                                      {copied===`${zone.id}-${p.id}-${l.label}` ? "✓" : "Copier"}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal assignation équipe */}
      {assignModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:18, padding:24, width:"100%", maxWidth:480, maxHeight:"80vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <h3 style={{ color:S.white, fontSize:16, fontWeight:700, margin:0 }}>{assignModal.emoji} {assignModal.nom} — Équipe</h3>
                <p style={{ color:S.muted2, fontSize:12, margin:"4px 0 0" }}>Assigne les membres à cette zone</p>
              </div>
              <button onClick={() => setAssignModal(null)} style={{ background:"transparent", border:"none", color:S.muted, fontSize:20, cursor:"pointer" }}>×</button>
            </div>

            {profiles.length === 0 ? (
              <p style={{ color:S.muted, fontSize:13, textAlign:"center" }}>Aucun membre dans l'équipe.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {profiles.map(p => {
                  const isAssigned = p.zone_id === assignModal.id
                  const isOtherZone = p.zone_id && p.zone_id !== assignModal.id
                  const otherZone = zones.find(z => z.id === p.zone_id)
                  return (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, background:S.card2, borderRadius:10, padding:"12px 14px", border:`1px solid ${isAssigned?"rgba(245,158,11,0.3)":S.border}` }}>
                      <div style={{ flex:1 }}>
                        <p style={{ color:S.white, fontSize:14, fontWeight:600, margin:"0 0 2px" }}>{p.full_name}</p>
                        <p style={{ color:S.muted2, fontSize:12, margin:0 }}>
                          {["livreur","Livreur"].includes(p.role) ? "🛵 Livreur" : "📞 Closeur"}
                          {isOtherZone && <span style={{ color:S.danger, marginLeft:8 }}>· Zone: {otherZone?.emoji} {otherZone?.nom}</span>}
                        </p>
                      </div>
                      <button onClick={() => handleAssignMember(p.id, isAssigned ? null : assignModal)}
                        style={{ padding:"7px 14px", borderRadius:8, border:"none", fontSize:12, fontWeight:700, cursor:"pointer",
                          background: isAssigned ? S.dangerBg : "rgba(245,158,11,0.1)",
                          color: isAssigned ? S.danger : S.gold }}>
                        {isAssigned ? "Retirer" : "Assigner"}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
