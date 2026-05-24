"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import type { Profile } from "@/types";
import { fmt } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";

const S = {
  gold: "#F59E0B", bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  success: "#4ADE80", successBg: "#052E16", info: "#60A5FA",
  danger: "#F87171", warning: "#FB923C",
};

interface Props {
  profile: Profile;
  montantDu: number;
  onSuccess: () => void;
  showHistorique?: boolean; // true = afficher l'historique
  showForm?: boolean;       // false = ne pas afficher le formulaire (mode historique seul)
}

type Versement = { id: string; montant: number; operateur: string; status: string; created_at: string };

const OPERATEURS = ["Flooz (Moov)", "T-Money (Togocel)", "Wave", "Autre"];

export default function VersementForm({ profile, montantDu, onSuccess, showHistorique = true, showForm = true }: Props) {
  const [show, setShow] = useState(false);
  const [montant, setMontant] = useState("");
  const [operateur, setOperateur] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [capture, setCapture] = useState<File | null>(null);
  const [capturePreview, setCapturePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [historique, setHistorique] = useState<Versement[]>([]);

  const loadHistorique = async () => {
    const { data } = await supabase.from("versements")
      .select("id, montant, operateur, status, created_at")
      .eq("driver_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setHistorique((data as Versement[]) || []);
  };

  useEffect(() => { void loadHistorique(); }, [profile.id]);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapture(file);
    const reader = new FileReader();
    reader.onload = () => setCapturePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montant || !operateur) { toast("Remplis tous les champs obligatoires", "error"); return; }
    if (!capture) { toast("La capture d'écran est obligatoire", "error"); return; }
    setLoading(true);
    try {
      const ext = capture.name.split(".").pop();
      const fileName = `versements/${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("shipivo-images").upload(fileName, capture, { upsert: true });
      if (uploadError) { toast("Erreur upload : " + uploadError.message, "error"); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from("shipivo-images").getPublicUrl(fileName);
      const captureUrl = urlData?.publicUrl || "";
      const { error } = await supabase.from("versements").insert([{
        tenant_id: profile.tenant_id,
        driver_id: profile.id, driver_name: profile.full_name,
        montant: Number(montant), operateur,
        reference: reference || null, capture_url: captureUrl,
        status: "en_attente", note: note || null,
      }]);
      if (error) { toast("Erreur : " + error.message, "error"); setLoading(false); return; }
      toast("✅ Versement envoyé ! L'admin va confirmer.", "success");
      setShow(false);
      setMontant(""); setOperateur(""); setReference(""); setNote("");
      setCapture(null); setCapturePreview(null);
      void loadHistorique();
      onSuccess();
    } catch { toast("Erreur inattendue", "error"); }
    setLoading(false);
  };

  const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${S.border}`, background: S.bg, color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Bannière montant dû + bouton verser */}
      {showForm && montantDu > 0 && (
        <div style={{ background: "linear-gradient(135deg, #1a0e00, #2d1a00)", border: `1px solid ${S.warning}60`, borderRadius: 14, padding: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 12, color: S.text2, marginBottom: 4 }}>💼 Tu dois remettre</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: S.warning }}>{fmt(montantDu)}</p>
          </div>
          <button onClick={() => setShow(!show)} style={{ padding: "10px 16px", background: S.gold, border: "none", borderRadius: 12, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {show ? "Annuler" : "📲 Verser"}
          </button>
        </div>
      )}

      {/* Formulaire */}
      {showForm && show && (
        <div style={{ background: S.card, border: `1px solid ${S.gold}40`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: S.gold, marginBottom: 16 }}>📲 Faire un versement</p>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Montant (FCFA) *</label>
              <input type="number" value={montant} onChange={e => setMontant(e.target.value)} placeholder={`Max: ${fmt(montantDu)}`} required style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Opérateur *</label>
              <select value={operateur} onChange={e => setOperateur(e.target.value)} required style={inp}>
                <option value="">Choisir l&apos;opérateur</option>
                {OPERATEURS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Référence (optionnel)</label>
              <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ex: TXN123456" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>📸 Capture d&apos;écran *</label>
              <label style={{ display: "block", padding: "12px 0", background: S.bg, border: `2px dashed ${capture ? S.success : S.border}`, borderRadius: 10, textAlign: "center", cursor: "pointer", color: capture ? S.success : S.text3, fontSize: 13 }}>
                {capture ? `✅ ${capture.name}` : "📷 Choisir une photo"}
                <input type="file" accept="image/*" onChange={handleCapture} style={{ display: "none" }} />
              </label>
              {capturePreview && <img src={capturePreview} alt="Preview" style={{ width: "100%", borderRadius: 10, marginTop: 8, maxHeight: 200, objectFit: "cover" }} />}
            </div>
            <div>
              <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Note (optionnel)</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: Versement du 23 mai..." style={inp} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => setShow(false)} style={{ padding: "11px 0", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 10, color: S.text2, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Annuler</button>
              <button type="submit" disabled={loading} style={{ padding: "11px 0", background: `linear-gradient(135deg, ${S.gold}, #d97706)`, border: "none", borderRadius: 10, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {loading ? "Envoi..." : "📤 Envoyer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historique versements */}
      {showHistorique && historique.length > 0 && (
        <div>
          {historique.map(v => {
            const statusC = v.status === "confirmé" ? S.success : v.status === "rejeté" ? S.danger : S.warning;
            const statusL = v.status === "confirmé" ? "✅ Confirmé" : v.status === "rejeté" ? "❌ Rejeté" : "⏳ En attente";
            return (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: S.gold }}>{fmt(v.montant)}</p>
                  <p style={{ fontSize: 11, color: S.text3 }}>{v.operateur} · {new Date(v.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</p>
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: statusC }}>{statusL}</p>
              </div>
            );
          })}
        </div>
      )}

      {showHistorique && historique.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: S.text3, fontSize: 13 }}>
          <p>Aucun versement effectué</p>
        </div>
      )}
    </div>
  );
}
