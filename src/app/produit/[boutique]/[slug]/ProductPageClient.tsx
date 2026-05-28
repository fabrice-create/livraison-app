"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/lib/supabase"
import { useParams, useSearchParams } from "next/navigation"

// ─── TYPES ──────────────────────────────────────────────────────────────────

type Offre = { quantite: number; label: string; prix: number; populaire: boolean; badge: string }

type Section = {
  id: string
  label: string
  actif: boolean
  ordre: number
}

type PageContent = {
  // Hero
  hero_titre: string
  hero_sous_titre: string
  hero_cta: string
  hero_badges: string[]
  // Bandeau
  bandeau: string[]
  // Galerie
  images: string[]
  // Description riche
  description_html: string
  // Offres
  offres_actif: boolean
  offres_titre: string
  offres: Offre[]
  // Garantie
  garantie_texte: string
  // Pied de page
  footer_texte: string
  // Design
  couleur: string
  fond: string
  police: string
  // Sections organisateur
  sections: Section[]
}

type Product = {
  id: string; nom: string; slug: string; prix: number
  prix_barre: number | null; devise: string; badge: string
  is_active: boolean; image_principale: string
  page_content: string; tenant_id: string
  vues?: number; commandes?: number
}

type Tenant = { id: string; name: string; slug: string; phone: string }

// ─── SECTIONS PAR DÉFAUT ─────────────────────────────────────────────────────

const DEFAULT_SECTIONS: Section[] = [
  { id: "bandeau",     label: "Bande déroulante", actif: true,  ordre: 1 },
  { id: "hero",        label: "Hero",              actif: true,  ordre: 2 },
  { id: "description", label: "Description",       actif: true,  ordre: 3 },
  { id: "offres",      label: "Offres groupées",   actif: true,  ordre: 4 },
  { id: "formulaire",  label: "Formulaire",        actif: true,  ordre: 5 },
  { id: "footer",      label: "Pied de page",      actif: true,  ordre: 6 },
]

const defaultContent: PageContent = {
  hero_titre: "", hero_sous_titre: "", hero_cta: "Commander maintenant",
  hero_badges: [], bandeau: [], images: [],
  description_html: "",
  offres_actif: false, offres_titre: "Choisissez votre offre", offres: [],
  garantie_texte: "Satisfait ou remboursé — Paiement à la livraison",
  footer_texte: "",
  couleur: "#F59E0B", fond: "#09090F", police: "Inter",
  sections: DEFAULT_SECTIONS,
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export default function ProductPageClient() {
  const params = useParams()
  const searchParams = useSearchParams()
  const boutique = params?.boutique as string
  const slug     = params?.slug as string

  const [product,       setProduct]       = useState<Product | null>(null)
  const [tenant,        setTenant]        = useState<Tenant | null>(null)
  const [content,       setContent]       = useState<PageContent>(defaultContent)
  const [loading,       setLoading]       = useState(true)
  const [imgIndex,      setImgIndex]      = useState(0)
  const [selectedOffre, setSelectedOffre] = useState(0)
  const [form,          setForm]          = useState({ name: "", phone: "", city: "", address: "", note: "" })
  const [submitting,    setSubmitting]    = useState(false)
  const [submitted,     setSubmitted]     = useState(false)
  const [orderNum,      setOrderNum]      = useState("")
  const [formError,     setFormError]     = useState("")
  const formRef = useRef<HTMLDivElement>(null)

  // ── Chargement ──
  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase.from("tenants").select("*").eq("slug", boutique).single()
      if (!t) { setLoading(false); return }
      setTenant(t as Tenant)
      const { data: p } = await supabase.from("products").select("*")
        .eq("tenant_id", t.id).eq("slug", slug).eq("is_active", true).single()
      if (p) {
        setProduct(p as Product)
        try {
          const pc = p.page_content ? JSON.parse(p.page_content) : null
          if (pc) {
            // Fusionner sections — garder ordre personnalisé si défini
            const sections = pc.sections?.length ? pc.sections : DEFAULT_SECTIONS
            setContent({ ...defaultContent, ...pc, sections })
            // Sélectionner offre populaire par défaut
            if (pc.offres?.length && pc.offres_actif) {
              const idx = pc.offres.findIndex((o: Offre) => o.populaire)
              if (idx >= 0) setSelectedOffre(idx)
            }
          }
        } catch { /* silencieux */ }
        await supabase.from("products").update({ vues: ((p.vues || 0) + 1) }).eq("id", p.id)
      }
      setLoading(false)
    }
    load()
  }, [boutique, slug])

  // ── Commander ──
  const handleOrder = async () => {
    if (!form.name.trim())  { setFormError("Ton prénom est requis"); return }
    if (!form.phone.trim()) { setFormError("Ton téléphone est requis"); return }
    if (!form.city.trim())  { setFormError("Ta ville est requise"); return }
    setSubmitting(true); setFormError("")
    const num = `CMD-${Date.now().toString(36).toUpperCase()}`
    const offreActive = offres[selectedOffre]
    const { error } = await supabase.from("orders").insert({
      tenant_id: tenant?.id,
      customer_name: form.name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      note: form.note.trim(),
      product: product?.nom,
      quantity: offreActive?.quantite || 1,
      amount: offreActive?.prix || product?.prix || 0,
      status: "En attente",
      delivery_type: "standard",
      logistic_status: "En attente",
      payment_status: "Non payé",
      cash_collected: false,
      is_assigned: false,
      source: searchParams?.get("src") || "page_produit",
      zone_nom: searchParams?.get("zone") || null,
      closer_commission: 0,
      driver_commission: 0,
      commission_calculated: false,
    })
    if (error) { setFormError(error.message); setSubmitting(false); return }
    if (product) await supabase.from("products").update({ commandes: ((product.commandes || 0) + 1) }).eq("id", product.id)
    setOrderNum(num); setSubmitted(true); setSubmitting(false)
  }

  // ── États de chargement ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#09090F", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 44, height: 44, border: "3px solid #1E1E2E", borderTopColor: "#F59E0B", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!product || !tenant) return (
    <div style={{ minHeight: "100vh", background: "#09090F", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#9898B0" }}>Produit introuvable.</p>
    </div>
  )

  // ── Variables design ──
  const AC  = content.couleur || "#F59E0B"
  const BG  = content.fond    || "#09090F"
  const TX  = "#F8F8FC"
  const TX2 = "#9898B0"
  const allImages = [product.image_principale, ...(content.images || [])].filter(Boolean)
  const fmt = (n: number) => `${n.toLocaleString("fr-FR")} ${product.devise || "FCFA"}`
  const offres = content.offres || []
  const prixActif = offres.length > 0 && content.offres_actif ? offres[selectedOffre]?.prix : product.prix

  // ── Sections triées et actives ──
  const sections = [...(content.sections || DEFAULT_SECTIONS)].sort((a, b) => a.ordre - b.ordre)

  // ── Style input ──
  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
    padding: "14px 16px", color: TX, fontSize: 15, outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  }

  // ── Page de confirmation ──
  if (submitted) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: TX, fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Commande confirmée !</h2>
        <p style={{ color: TX2, marginBottom: 8 }}>Référence : <strong style={{ color: AC }}>{orderNum}</strong></p>
        <p style={{ color: TX2, marginBottom: 24 }}>Notre équipe te rappellera au <strong style={{ color: TX }}>{form.phone}</strong> très bientôt.</p>
        {tenant.phone && (
          <a href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g, "")}?text=Bonjour+j'ai+commandé+${encodeURIComponent(product.nom)}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#25D366", color: "#fff", padding: "14px 28px", borderRadius: 50, fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
            💬 Nous contacter sur WhatsApp
          </a>
        )}
      </div>
    </div>
  )

  // ── RENDU SECTIONS ────────────────────────────────────────────────────────

  const renderSection = (section: Section) => {
    if (!section.actif) return null

    switch (section.id) {

      // ── BANDEAU ──
      case "bandeau":
        if (!content.bandeau?.length) return null
        return (
          <div key="bandeau" style={{ background: AC, overflow: "hidden", padding: "10px 0" }}>
            <div style={{ display: "flex", gap: 40, animation: "marquee 20s linear infinite", whiteSpace: "nowrap" }}>
              {[...content.bandeau, ...content.bandeau].map((t, i) => (
                <span key={i} style={{ color: "#000", fontWeight: 700, fontSize: 13, letterSpacing: "0.05em" }}>
                  ✦ {t}
                </span>
              ))}
            </div>
            <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
          </div>
        )

      // ── HERO ──
      case "hero":
        return (
          <div key="hero" style={{ padding: "0 0 32px" }}>
            {/* Bouton retour */}
            <div style={{ position: "sticky", top: 0, zIndex: 50, background: `${BG}ee`, backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <a href={`/commander/${boutique}`} style={{ display: "flex", alignItems: "center", gap: 6, color: TX2, fontSize: 13, fontWeight: 600, textDecoration: "none", padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)" }}>
                ← Boutique
              </a>
              <span style={{ color: TX2, fontSize: 11, fontWeight: 500 }}>● Paiement à la livraison</span>
            </div>

            {/* Layout hero */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, padding: "24px 16px 0", maxWidth: 1100, margin: "0 auto" }}>
              <style>{`@media(min-width:768px){.hero-grid{grid-template-columns:1fr 1fr !important}}`}</style>
              <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>

                {/* Galerie */}
                <div>
                  {allImages.length > 0 && (
                    <>
                      <div style={{ borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "1/1", position: "relative" }}>
                        <img src={allImages[imgIndex]} alt={product.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {product.badge && (
                          <span style={{ position: "absolute", top: 12, left: 12, background: AC, color: "#000", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                            {product.badge}
                          </span>
                        )}
                      </div>
                      {allImages.length > 1 && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
                          {allImages.map((img, i) => (
                            <div key={i} onClick={() => setImgIndex(i)}
                              style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", cursor: "pointer", border: `2px solid ${imgIndex === i ? AC : "transparent"}`, flexShrink: 0 }}>
                              <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Infos */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Badges */}
                  {content.hero_badges?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {content.hero_badges.map((b, i) => (
                        <span key={i} style={{ background: `${AC}20`, color: AC, border: `1px solid ${AC}40`, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Titre */}
                  <h1 style={{ color: TX, fontSize: "clamp(22px,5vw,36px)", fontWeight: 900, lineHeight: 1.2, margin: 0 }}>
                    {content.hero_titre || product.nom}
                  </h1>

                  {/* Sous-titre */}
                  {content.hero_sous_titre && (
                    <p style={{ color: TX2, fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                      {content.hero_sous_titre}
                    </p>
                  )}

                  {/* Prix */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ color: AC, fontSize: 32, fontWeight: 900 }}>{fmt(prixActif || product.prix)}</span>
                    {product.prix_barre && (
                      <span style={{ color: TX2, fontSize: 18, textDecoration: "line-through" }}>{fmt(product.prix_barre)}</span>
                    )}
                  </div>

                  {/* Garantie */}
                  {content.garantie_texte && (
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>🛡️</span>
                      <span style={{ color: TX2, fontSize: 13 }}>{content.garantie_texte}</span>
                    </div>
                  )}

                  {/* Bouton CTA → scroll formulaire */}
                  <button onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    style={{ background: AC, color: "#000", border: "none", borderRadius: 50, padding: "16px 32px", fontSize: 16, fontWeight: 900, cursor: "pointer", letterSpacing: "0.02em", width: "100%" }}>
                    {content.hero_cta || "Commander maintenant"}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )

      // ── DESCRIPTION ──
      case "description":
        if (!content.description_html) return null
        return (
          <div key="description" style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px" }}>
            <div
              dangerouslySetInnerHTML={{ __html: content.description_html }}
              style={{ color: TX, fontSize: 16, lineHeight: 1.8 }}
            />
            <style>{`
              .prose img { max-width:100%; border-radius:12px; margin:16px 0; }
              .prose h1,.prose h2,.prose h3 { color:${TX}; font-weight:800; margin:24px 0 12px; }
              .prose p { margin:0 0 16px; }
              .prose ul,.prose ol { padding-left:24px; margin:0 0 16px; }
              .prose strong { color:${AC}; }
            `}</style>
          </div>
        )

      // ── OFFRES ──
      case "offres":
        if (!content.offres_actif || !offres.length) return null
        return (
          <div key="offres" style={{ maxWidth: 600, margin: "0 auto", padding: "32px 16px" }}>
            <h2 style={{ color: TX, fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 20 }}>
              {content.offres_titre || "Choisissez votre offre"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {offres.map((offre, i) => (
                <div key={i} onClick={() => setSelectedOffre(i)}
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 14, border: `2px solid ${selectedOffre === i ? AC : offre.populaire ? `${AC}40` : "rgba(255,255,255,0.08)"}`, background: selectedOffre === i ? `${AC}12` : "transparent", cursor: "pointer" }}>
                  {offre.populaire && (
                    <span style={{ position: "absolute", top: -10, right: 16, background: AC, color: "#000", fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 20 }}>
                      POPULAIRE
                    </span>
                  )}
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selectedOffre === i ? AC : "rgba(255,255,255,0.3)"}`, background: selectedOffre === i ? AC : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {selectedOffre === i && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#000" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: TX, fontWeight: 700, margin: 0 }}>{offre.label}</p>
                    {offre.badge && <p style={{ color: AC, fontSize: 12, margin: "2px 0 0" }}>{offre.badge}</p>}
                  </div>
                  <span style={{ color: AC, fontWeight: 900, fontSize: 18 }}>{fmt(offre.prix)}</span>
                </div>
              ))}
            </div>
          </div>
        )

      // ── FORMULAIRE ──
      case "formulaire":
        return (
          <div key="formulaire" ref={formRef} style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
            <h2 style={{ color: TX, fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>
              Passer votre commande
            </h2>
            <p style={{ color: TX2, textAlign: "center", fontSize: 14, marginBottom: 24 }}>
              Remplissez le formulaire — nous vous appelons pour confirmer
            </p>

            {/* Récap prix */}
            <div style={{ background: `${AC}15`, border: `1px solid ${AC}40`, borderRadius: 14, padding: "14px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: TX, fontWeight: 600 }}>{product.nom}</span>
              <span style={{ color: AC, fontWeight: 900, fontSize: 20 }}>{fmt(prixActif || product.prix)}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Prénom et nom *", key: "name", placeholder: "Ex: Kofi Mensah", type: "text" },
                { label: "Téléphone WhatsApp *", key: "phone", placeholder: "+228 90 00 00 00", type: "tel" },
                { label: "Ville *", key: "city", placeholder: "Ex: Lomé, Dakar, Abidjan...", type: "text" },
                { label: "Adresse / Quartier", key: "address", placeholder: "Ex: Adidogomé, carrefour Shell", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", color: TX2, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", color: TX2, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Note (optionnel)</label>
                <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Instructions particulières..." rows={3}
                  style={{ ...inp, resize: "none" }} />
              </div>
            </div>

            {formError && (
              <p style={{ color: "#F87171", fontSize: 13, marginTop: 12, textAlign: "center" }}>{formError}</p>
            )}

            <button onClick={handleOrder} disabled={submitting}
              style={{ width: "100%", marginTop: 20, background: submitting ? "#555" : AC, color: "#000", border: "none", borderRadius: 50, padding: "18px 32px", fontSize: 17, fontWeight: 900, cursor: submitting ? "not-allowed" : "pointer", letterSpacing: "0.02em" }}>
              {submitting ? "Envoi en cours..." : `✅ Commander — ${fmt(prixActif || product.prix)}`}
            </button>

            <p style={{ color: TX2, fontSize: 12, textAlign: "center", marginTop: 12 }}>
              🔒 Paiement à la livraison · Aucun paiement en ligne requis
            </p>
          </div>
        )

      // ── FOOTER ──
      case "footer":
        return (
          <div key="footer" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 16px", textAlign: "center", marginTop: 16 }}>
            {content.footer_texte ? (
              <p style={{ color: TX2, fontSize: 13 }}>{content.footer_texte}</p>
            ) : (
              <p style={{ color: TX2, fontSize: 13 }}>© {tenant.name} · Paiement à la livraison</p>
            )}
            {tenant.phone && (
              <a href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g, "")}?text=Bonjour, je veux commander ${encodeURIComponent(product.nom)}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, background: "#25D366", color: "#fff", padding: "10px 20px", borderRadius: 50, fontWeight: 700, textDecoration: "none", fontSize: 13 }}>
                💬 WhatsApp
              </a>
            )}
          </div>
        )

      default: return null
    }
  }

  // ── RENDU FINAL ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: content.police || "Inter, sans-serif", color: TX }}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>
      {sections.map(s => renderSection(s))}
    </div>
  )
}
