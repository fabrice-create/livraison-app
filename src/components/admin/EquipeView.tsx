"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"

const S = {
  gold: "#F59E0B", goldDark: "#D97706", goldDim: "#92610A",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
  success: "#4ADE80", info: "#60A5FA",
}

interface Member {
  id: string
  user_id: string
  full_name: string
  role: string
  phone?: string
  email?: string
  is_active: boolean
  created_at?: string
}

interface Props { tenantId: string }

const ROLES = [
  { value: "closureuse", label: "Closureuse" },
  { value: "livreur", label: "Livreur" },
]

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  closureuse: { bg: "rgba(96,165,250,0.1)", color: "#60A5FA" },
  livreur: { bg: "rgba(74,222,128,0.1)", color: "#4ADE80" },
  admin: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
  partenaire: { bg: "rgba(192,132,252,0.1)", color: "#C084FC" },
}

const EMPTY_FORM = { full_name: "", phone: "", role: "livreur", email: "", password: "" }

export default function EquipeView({ tenantId }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState("")

  useEffect(() => { loadMembers() }, [tenantId])

  const loadMembers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, role, phone, email, is_active, created_at")
      .eq("tenant_id", tenantId)
      .neq("role", "admin")
      .order("role")
    setMembers(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!form.full_name.trim()) { setError("Le nom est requis"); return }
    if (!form.email.trim()) { setError("L'email est requis"); return }
    if (!form.password || form.password.length < 6) { setError("Mot de passe : 6 caractères minimum"); return }
    setError(""); setSaving(true)

    try {
      // Créer compte Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.full_name } }
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error("Erreur création compte")

      // Créer profil
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        user_id: authData.user.id,
        email: form.email.trim(),
        tenant_id: tenantId,
        role: form.role,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        is_active: true,
      })

      if (profileError) throw new Error(profileError.message)

      setSuccess(`${form.full_name} ajouté(e) avec succès ✓`)
      setShowForm(false)
      setForm(EMPTY_FORM)
      loadMembers()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue")
    }
    setSaving(false)
  }

  const toggleActive = async (m: Member) => {
    await supabase.from("profiles").update({ is_active: !m.is_active }).eq("id", m.id)
    loadMembers()
  }

  const handleChangePassword = async () => {
    if (!selectedMember || !newPassword) return
    if (newPassword.length < 6) { setPasswordSuccess("❌ Minimum 6 caractères"); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.admin.updateUserById(selectedMember.user_id || selectedMember.id, { password: newPassword })
    if (error) {
      // Fallback : utiliser l'API REST directement
      setPasswordSuccess("❌ " + error.message)
    } else {
      setPasswordSuccess("✅ Mot de passe mis à jour !")
      setNewPassword("")
      setTimeout(() => setPasswordSuccess(""), 3000)
    }
    setSavingPassword(false)
  }

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "-"

  const inp = { width: "100%", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 12px", color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const }

  const byRole = (role: string) => members.filter(m => m.role === role)

  return (
    <div style={{ padding: "0 0 40px 0" }}>

      {/* Modal détails membre */}
      {selectedMember && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 420 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: selectedMember.role === "closureuse" ? "rgba(96,165,250,0.15)" : "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {selectedMember.role === "closureuse" ? "👩‍💼" : "🏍️"}
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{selectedMember.full_name}</p>
                  <p style={{ fontSize: 12, color: selectedMember.role === "closureuse" ? S.info : "#fb923c", margin: "2px 0 0 0", textTransform: "capitalize" }}>{selectedMember.role}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedMember(null); setNewPassword(""); setPasswordSuccess("") }}
                style={{ background: "none", border: "none", color: S.text3, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {/* Infos */}
            <div style={{ background: S.bg, borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: S.text3 }}>Email</span>
                <span style={{ fontSize: 13, color: S.text, fontWeight: 600 }}>{selectedMember.email || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: S.text3 }}>Téléphone</span>
                <span style={{ fontSize: 13, color: S.text }}>{selectedMember.phone || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: S.text3 }}>Ajouté le</span>
                <span style={{ fontSize: 13, color: S.text }}>{fmtDate(selectedMember.created_at)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: S.text3 }}>Statut</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: selectedMember.is_active ? S.success : S.danger }}>
                  {selectedMember.is_active ? "✅ Actif" : "⏸ Désactivé"}
                </span>
              </div>
            </div>

            {/* Changer mot de passe */}
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🔐 Changer le mot de passe</p>
            <input
              type="password"
              placeholder="Nouveau mot de passe (min. 6 caractères)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={{ ...inp, marginBottom: 10 }}
            />
            {passwordSuccess && (
              <p style={{ fontSize: 12, color: passwordSuccess.startsWith("✅") ? S.success : S.danger, marginBottom: 10 }}>{passwordSuccess}</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => { toggleActive(selectedMember); setSelectedMember({ ...selectedMember, is_active: !selectedMember.is_active }) }}
                style={{ padding: "11px 0", background: selectedMember.is_active ? "#2D1500" : "rgba(74,222,128,0.1)", border: "none", borderRadius: 10, color: selectedMember.is_active ? "#FB923C" : S.success, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {selectedMember.is_active ? "⏸ Désactiver" : "▶ Activer"}
              </button>
              <button onClick={handleChangePassword} disabled={savingPassword || !newPassword}
                style={{ padding: "11px 0", background: newPassword ? `linear-gradient(135deg, ${S.gold}, ${S.goldDark})` : S.border, border: "none", borderRadius: 10, color: newPassword ? "#000" : S.text3, fontWeight: 700, fontSize: 13, cursor: newPassword ? "pointer" : "not-allowed" }}>
                {savingPassword ? "..." : "💾 Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: 0 }}>Mon équipe</h2>
          <p style={{ color: S.text3, fontSize: 13, margin: "4px 0 0 0" }}>{members.length} membre{members.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setShowForm(true); setError("") }} style={{ background: `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 10, padding: "10px 16px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Ajouter
        </button>
      </div>

      {success && <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: S.success, fontSize: 13 }}>{success}</div>}

      {/* Formulaire ajout membre */}
      {showForm && (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: S.text, fontSize: 15, fontWeight: 700, margin: "0 0 16px 0" }}>Nouveau membre</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Rôle *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {ROLES.map(r => (
                <button key={r.value} onClick={() => setForm(p => ({ ...p, role: r.value }))}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, border: `2px solid ${form.role === r.value ? S.gold : S.border}`, background: form.role === r.value ? "rgba(245,158,11,0.1)" : "transparent", color: form.role === r.value ? S.gold : S.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {[
            { label: "Prénom et nom *", key: "full_name", placeholder: "Ex: Abigael Koffi" },
            { label: "Téléphone WhatsApp", key: "phone", placeholder: "+228 90 00 00 00", type: "tel" },
            { label: "Email *", key: "email", placeholder: "email@exemple.com", type: "email" },
            { label: "Mot de passe *", key: "password", placeholder: "6 caractères minimum", type: "password" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: S.text2, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{f.label}</label>
              <input type={f.type || "text"} value={(form as Record<string,string>)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder} style={inp}
                onFocus={e => e.target.style.borderColor = S.gold}
                onBlur={e => e.target.style.borderColor = S.border} />
            </div>
          ))}

          <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
            <p style={{ color: S.info, fontSize: 12, margin: 0 }}>
              💡 La personne pourra se connecter sur shipivo.app avec cet email et ce mot de passe.
            </p>
          </div>

          {error && <div style={{ color: S.danger, fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px", color: S.text2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={handleAdd} disabled={saving} style={{ flex: 2, background: saving ? S.goldDim : `linear-gradient(135deg,${S.gold},${S.goldDark})`, border: "none", borderRadius: 8, padding: "10px", color: "#000", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Création en cours..." : "Ajouter le membre"}
            </button>
          </div>
        </div>
      )}

      {/* Liste par rôle */}
      {loading ? (
        <p style={{ color: S.text3, fontSize: 14, textAlign: "center", padding: "40px 0" }}>Chargement...</p>
      ) : members.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <p style={{ color: S.text3, fontSize: 14 }}>Aucun membre. Ajoute ta closureuse et tes livreurs !</p>
        </div>
      ) : (
        ["closureuse", "livreur"].map(role => {
          const group = byRole(role)
          if (group.length === 0) return null
          const rc = ROLE_COLORS[role] || ROLE_COLORS.livreur
          return (
            <div key={role} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: S.text3, marginBottom: 10 }}>
                {role === "closureuse" ? "Closureuses" : "Livreurs"}
                <span style={{ marginLeft: 8, background: rc.bg, color: rc.color, padding: "2px 8px", borderRadius: 20, fontSize: 10 }}>{group.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.map(m => (
                  <div key={m.id} onClick={() => { setSelectedMember(m); setNewPassword(""); setPasswordSuccess("") }} style={{ background: S.card, border: `1px solid ${m.is_active ? S.border : "#2D1500"}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: m.is_active ? 1 : 0.6, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                        {role === "closureuse" ? "👩‍💼" : role === "livreur" ? "🏍️" : "🌍"}
                      </div>
                      <div>
                        <p style={{ color: S.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{m.full_name}</p>
                        {m.phone && <p style={{ color: S.text3, fontSize: 12, margin: "2px 0 0 0" }}>{m.phone}</p>}
                      </div>
                    </div>
                    <button onClick={() => toggleActive(m)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "none", background: m.is_active ? "#2D1500" : "rgba(74,222,128,0.1)", color: m.is_active ? "#FB923C" : S.success, cursor: "pointer" }}>
                      {m.is_active ? "⏸ Désactiver" : "▶ Activer"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
