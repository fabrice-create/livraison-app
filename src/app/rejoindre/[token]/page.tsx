"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

const S = {
  gold: "#F59E0B", bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  success: "#4ADE80", danger: "#F87171",
};

export default function RejoindreePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invitation, setInvitation] = useState<{ role: string; full_name: string; tenant_id: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const { data } = await supabase.from("invitations")
        .select("*").eq("token", token).single();

      if (!data) { setExpired(true); setLoading(false); return; }
      if (data.used) { setExpired(true); setLoading(false); return; }
      if (new Date(data.expires_at) < new Date()) { setExpired(true); setLoading(false); return; }

      setInvitation({ role: data.role, full_name: data.full_name, tenant_id: data.tenant_id });
      setLoading(false);
    };
    void checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return; }
    if (password.length < 6) { setError("Minimum 6 caractères"); return; }

    setSubmitting(true);
    setError("");

    // Créer le compte
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message || "Erreur lors de la création du compte");
      setSubmitting(false);
      return;
    }

    // Créer le profil
    const { error: profileError } = await supabase.from("profiles").insert([{
      id: authData.user.id,
      user_id: authData.user.id,
      email: email.trim(),
      full_name: invitation!.full_name || email.split("@")[0],
      role: invitation!.role,
      tenant_id: invitation!.tenant_id,
      is_active: true,
    }]);

    if (profileError) {
      setError(profileError.message);
      setSubmitting(false);
      return;
    }

    // Marquer invitation comme utilisée
    await supabase.from("invitations").update({
      used: true, used_at: new Date().toISOString(),
    }).eq("token", token);

    setSuccess(true);
    setSubmitting(false);

    // Rediriger après 2 secondes
    setTimeout(() => {
      const redirects: Record<string, string> = {
        livreur: "/livreur",
        closureuse: "/closureuse",
        admin: "/admin",
        manager: "/admin",
      };
      router.push(redirects[invitation!.role] || "/login");
    }, 2000);
  };

  const inp = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${S.border}`, background: S.bg,
    color: S.text, fontSize: 14, outline: "none",
    boxSizing: "border-box" as const,
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: S.text2 }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${S.gold}`, borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p>Vérification du lien...</p>
      </div>
    </div>
  );

  if (expired) return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 20, padding: 32, maxWidth: 400, width: "100%", textAlign: "center" }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>⏰</p>
        <h2 style={{ color: S.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Lien invalide ou expiré</h2>
        <p style={{ color: S.text2, fontSize: 14, lineHeight: 1.6 }}>
          Ce lien d&apos;invitation a déjà été utilisé ou a expiré.<br />
          Contacte ton administrateur pour obtenir un nouveau lien.
        </p>
      </div>
    </div>
  );

  if (success) return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: S.card, border: `1px solid ${S.success}40`, borderRadius: 20, padding: 32, maxWidth: 400, width: "100%", textAlign: "center" }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>🎉</p>
        <h2 style={{ color: S.success, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Compte créé !</h2>
        <p style={{ color: S.text2, fontSize: 14 }}>Redirection en cours...</p>
      </div>
    </div>
  );

  const roleLabel: Record<string, string> = {
    livreur: "🏍️ Livreur",
    closureuse: "👩‍💼 Closeur(se)",
    manager: "🧑‍💼 Manager",
    admin: "⚙️ Admin",
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 20, padding: 32, maxWidth: 420, width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: S.gold, fontWeight: 700, marginBottom: 4 }}>✉️ Invitation Shipivo</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: S.text, marginBottom: 8 }}>
            Bienvenue {invitation?.full_name ? `, ${invitation.full_name}` : ""} !
          </h1>
          <div style={{ display: "inline-block", background: "#1a1200", border: `1px solid ${S.gold}40`, borderRadius: 20, padding: "4px 14px", fontSize: 13, color: S.gold }}>
            {roleLabel[invitation?.role || ""] || invitation?.role}
          </div>
        </div>

        <p style={{ fontSize: 13, color: S.text2, marginBottom: 20, textAlign: "center" }}>
          Crée ton compte pour accéder à ton espace
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 6 }}>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com" required style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 6 }}>Mot de passe *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères" required style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 6 }}>Confirmer le mot de passe *</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Répète ton mot de passe" required style={inp} />
          </div>

          {error && (
            <div style={{ background: "#2D0F0F", border: `1px solid ${S.danger}40`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: S.danger }}>
              ❌ {error}
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 15, fontWeight: 700,
            background: `linear-gradient(135deg, ${S.gold}, #d97706)`,
            color: "#000", border: "none", cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1, marginTop: 4,
          }}>
            {submitting ? "Création..." : "🚀 Créer mon compte"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 11, color: S.text3, marginTop: 20 }}>
          Ce lien expire dans 7 jours · Shipivo
        </p>
      </div>
    </div>
  );
}
