"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import type { Order, Profile } from "@/types";
import { fmt, fmtDate, filterByPeriod, type PeriodFilter } from "@/lib/utils";
import { toast, confirm } from "@/components/ui/Toast";

const S = {
  gold: "#F59E0B", goldDark: "#D97706", bg: "#0A0A0F", card: "#111118",
  card2: "#16161F", border: "#1E1E2E", text: "#F8F8FC", text2: "#9898B0",
  text3: "#55556A", success: "#4ADE80", successBg: "#052E16",
  danger: "#F87171", dangerBg: "#2D0F0F", info: "#60A5FA", infoBg: "#0C1E3E",
  purple: "#C084FC", purpleBg: "#1a0a2e", warning: "#FB923C",
};

type Versement = {
  id: string; created_at: string; driver_id: string; driver_name: string;
  montant: number; operateur: string; reference?: string; capture_url?: string;
  status: string; note?: string; confirmed_at?: string; confirmed_by?: string;
};

type CommissionPayment = {
  id: string; created_at: string; beneficiary_id: string; beneficiary_name: string;
  beneficiary_role: string; montant: number; type: string; note?: string; paid_by?: string;
};

interface Props {
  orders: Order[];
  drivers: Profile[];
  closers: Profile[];
  profile: Profile | null;
  tenantId: string;
}

export default function FinancesView({ orders, drivers, closers, profile, tenantId }: Props) {
  const [tab, setTab] = useState("caisse");
  const [period, setPeriod] = useState<PeriodFilter>("mois");
  const [versements, setVersements] = useState<Versement[]>([]);
  const [commPayments, setCommPayments] = useState<CommissionPayment[]>([]);
  const [captureModal, setCaptureModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newVersement, setNewVersement] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadData = useCallback(async () => {
    const [vRes, cRes] = await Promise.all([
      supabase.from("versements").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("commission_payments").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    ]);
    setVersements((vRes.data as Versement[]) || []);
    setCommPayments((cRes.data as CommissionPayment[]) || []);
  }, [tenantId]);

  useEffect(() => { void loadData(); }, [loadData]);

  // Temps réel — nouveaux versements
  useEffect(() => {
    const channel = supabase.channel("admin-versements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "versements" }, (payload) => {
        const v = payload.new as Versement;
        setVersements(prev => [v, ...prev]);
        setNewVersement(c => c + 1);
        toast(`📲 Nouveau versement de ${v.driver_name} — ${fmt(v.montant)}`, "info");
      })
      .subscribe();
    channelRef.current = channel;
    return () => { void supabase.removeChannel(channel); };
  }, []);

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Feuille rapport
      const rapportData = [
        ["RAPPORT FINANCIER SHIPIVO", ""],
        ["Période", period === "today" ? "Aujourd'hui" : period === "semaine" ? "Semaine" : period === "mois" ? "Mois" : "Tout"],
        ["Date export", new Date().toLocaleDateString("fr-FR")],
        [""],
        ["Total encaissé (FCFA)", rapport.encaisse],
        ["Nombre de livraisons", rapport.livraisons],
        ["Commissions livreurs (FCFA)", rapport.commDrivers],
        ["Commissions closeurs (FCFA)", rapport.commClosers],
        ["Versements reçus (FCFA)", rapport.versementsRecus],
        ["Versements en attente (FCFA)", rapport.versementsAttente],
        ["Bénéfice estimé (FCFA)", rapport.encaisse - rapport.commDrivers - rapport.commClosers],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(rapportData);
      XLSX.utils.book_append_sheet(wb, ws1, "Rapport");

      // Feuille versements
      const versData = [["Livreur", "Montant", "Opérateur", "Référence", "Statut", "Date"]];
      versements.forEach(v => versData.push([v.driver_name, String(v.montant), v.operateur, v.reference || "", v.status, fmtDate(v.created_at)]));
      const ws2 = XLSX.utils.aoa_to_sheet(versData);
      XLSX.utils.book_append_sheet(wb, ws2, "Versements");

      // Feuille commissions
      const commData = [["Nom", "Rôle", "Montant payé", "Type", "Date"]];
      commPayments.forEach(c => commData.push([c.beneficiary_name, c.beneficiary_role, String(c.montant), c.type, fmtDate(c.created_at)]));
      const ws3 = XLSX.utils.aoa_to_sheet(commData);
      XLSX.utils.book_append_sheet(wb, ws3, "Commissions");

      XLSX.writeFile(wb, `shipivo-finances-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast("✅ Export Excel téléchargé", "success");
    } catch {
      toast("Erreur export Excel", "error");
    }
  };

  // ─── Calculs caisse ───────────────────────────────────────
  const livrees = orders.filter(o => o.status === "Livré" && o.cash_collected);

  const caisseParLivreur = drivers.map(d => {
    const sesLivraisons = livrees.filter(o => o.assigned_driver_id === d.id);
    const totalEncaisse = sesLivraisons.reduce((s, o) => s + Number(o.amount || 0), 0);
    const totalComm = sesLivraisons.reduce((s, o) => s + Number(o.driver_commission || 0), 0);
    const totalVerse = versements.filter(v => v.driver_id === d.id && v.status === "confirmé")
      .reduce((s, v) => s + Number(v.montant || 0), 0);
    const doit = totalEncaisse - totalComm - totalVerse;
    return { driver: d, totalEncaisse, totalComm, totalVerse, doit };
  }).filter(c => c.totalEncaisse > 0 || c.doit > 0);

  // ─── Commissions dues ─────────────────────────────────────
  const filtered = filterByPeriod(livrees, period);

  const commDrivers = drivers.map(d => {
    const total = filtered.filter(o => o.assigned_driver_id === d.id)
      .reduce((s, o) => s + Number(o.driver_commission || 0), 0);
    const paid = commPayments.filter(p => p.beneficiary_id === d.id && p.type === "commission")
      .reduce((s, p) => s + Number(p.montant || 0), 0);
    const avances = commPayments.filter(p => p.beneficiary_id === d.id && p.type === "avance")
      .reduce((s, p) => s + Number(p.montant || 0), 0);
    return { person: d, role: "livreur", total, paid, avances, reste: total - paid };
  }).filter(c => c.total > 0);

  const commClosers = closers.map(c => {
    const total = filtered.filter(o => o.closer_id === c.id)
      .reduce((s, o) => s + Number(o.closer_commission || 0), 0);
    const paid = commPayments.filter(p => p.beneficiary_id === c.id && p.type === "commission")
      .reduce((s, p) => s + Number(p.montant || 0), 0);
    const avances = commPayments.filter(p => p.beneficiary_id === c.id && p.type === "avance")
      .reduce((s, p) => s + Number(p.montant || 0), 0);
    return { person: c, role: "closureuse", total, paid, avances, reste: total - paid };
  }).filter(c => c.total > 0);

  // ─── Rapport financier ────────────────────────────────────
  const rapport = {
    encaisse: filtered.reduce((s, o) => s + Number(o.amount || 0), 0),
    commDrivers: filtered.reduce((s, o) => s + Number(o.driver_commission || 0), 0),
    commClosers: filtered.reduce((s, o) => s + Number(o.closer_commission || 0), 0),
    versementsRecus: versements.filter(v => v.status === "confirmé")
      .reduce((s, v) => s + Number(v.montant || 0), 0),
    versementsAttente: versements.filter(v => v.status === "en_attente")
      .reduce((s, v) => s + Number(v.montant || 0), 0),
    livraisons: filtered.length,
  };

  // ─── Actions ─────────────────────────────────────────────
  const handleConfirmVersement = (v: Versement) => {
    confirm({
      message: `Confirmer le versement de ${fmt(v.montant)} de ${v.driver_name} ?`,
      confirmLabel: "✅ Confirmer",
      onConfirm: async () => {
        setLoading(true);
        await supabase.from("versements").update({
          status: "confirmé", confirmed_at: new Date().toISOString(), confirmed_by: profile?.full_name,
        }).eq("id", v.id);
        toast(`✅ Versement de ${v.driver_name} confirmé`, "success");
        await loadData();
        setLoading(false);
      }
    });
  };

  const handleRejectVersement = (v: Versement) => {
    confirm({
      message: `Rejeter le versement de ${v.driver_name} ?`,
      confirmLabel: "❌ Rejeter", danger: true,
      onConfirm: async () => {
        await supabase.from("versements").update({ status: "rejeté" }).eq("id", v.id);
        toast("Versement rejeté", "info");
        await loadData();
      }
    });
  };

  const handlePayCommission = (personId: string, personName: string, role: string, montant: number) => {
    confirm({
      message: `Marquer ${fmt(montant)} de commissions payées à ${personName} ?`,
      confirmLabel: "💰 Confirmer paiement",
      onConfirm: async () => {
        await supabase.from("commission_payments").insert([{
          tenant_id: tenantId, beneficiary_id: personId, beneficiary_name: personName,
          beneficiary_role: role, montant, type: "commission", paid_by: profile?.full_name,
        }]);
        toast(`✅ Commission payée à ${personName}`, "success");
        await loadData();
      }
    });
  };

  const handleAvance = async (personId: string, personName: string, role: string) => {
    const montantStr = window.prompt(`Montant de l'avance pour ${personName} (FCFA) :`);
    if (!montantStr) return;
    const montant = Number(montantStr);
    if (!montant || montant <= 0) { toast("Montant invalide", "error"); return; }
    await supabase.from("commission_payments").insert([{
      tenant_id: tenantId, beneficiary_id: personId, beneficiary_name: personName,
      beneficiary_role: role, montant, type: "avance", paid_by: profile?.full_name,
    }]);
    toast(`✅ Avance de ${fmt(montant)} enregistrée pour ${personName}`, "success");
    await loadData();
  };

  const TABS = [
    { id: "caisse",      label: "💼 Caisse livreurs" },
    { id: "versements",  label: `📲 Versements ${versements.filter(v => v.status === "en_attente").length > 0 ? `(${versements.filter(v => v.status === "en_attente").length})` : ""}` },
    { id: "commissions", label: "💰 Commissions" },
    { id: "rapport",     label: "📊 Rapport" },
  ];

  const tabStyle = (id: string) => ({
    padding: "9px 14px", border: `1px solid ${tab === id ? S.gold : S.border}`,
    borderRadius: 20, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" as const, flexShrink: 0,
    fontWeight: tab === id ? 700 : 400,
    background: tab === id ? "#1a1200" : S.card,
    color: tab === id ? S.gold : S.text2,
  });

  return (
    <div>
      {/* Capture Modal */}
      {captureModal && (
        <div onClick={() => setCaptureModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16, cursor: "pointer" }}>
          <img src={captureModal} alt="Capture versement" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
        </div>
      )}

      {/* Bannière nouveau versement */}
      {newVersement > 0 && (
        <div style={{ background: "#0C1E3E", border: `1px solid ${S.info}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: S.info }}>📲 {newVersement} nouveau(x) versement(s) reçu(s) !</p>
          <button onClick={() => { setNewVersement(0); setTab("versements"); }}
            style={{ padding: "6px 14px", background: S.info, border: "none", borderRadius: 20, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Voir →
          </button>
        </div>
      )}

      {/* Header avec export */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>)}
        </div>
        <button onClick={handleExportExcel} style={{ padding: "9px 14px", background: S.successBg, border: `1px solid ${S.success}`, borderRadius: 12, color: S.success, fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 8 }}>
          📥 Excel
        </button>
      </div>

      {/* ── Caisse livreurs ── */}
      {tab === "caisse" && (
        <div>
          <p style={{ fontSize: 13, color: S.text3, marginBottom: 16 }}>Argent encaissé non encore versé par chaque livreur</p>
          {caisseParLivreur.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: S.text3 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>✅</p>
              <p>Toutes les caisses sont à zéro</p>
            </div>
          ) : caisseParLivreur.map(c => (
            <div key={c.driver.id} style={{ background: S.card, border: `1px solid ${c.doit > 0 ? S.warning + "60" : S.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(251,146,60,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏍️</div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{c.driver.full_name}</p>
                    <p style={{ fontSize: 11, color: S.text3 }}>{c.driver.phone || "—"}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: S.text3, marginBottom: 2 }}>Doit remettre</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: c.doit > 0 ? S.warning : S.success }}>{fmt(Math.max(0, c.doit))}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
                <div style={{ background: S.bg, borderRadius: 8, padding: "8px 10px" }}>
                  <p style={{ color: S.text3, marginBottom: 2 }}>Encaissé</p>
                  <p style={{ color: S.gold, fontWeight: 700 }}>{fmt(c.totalEncaisse)}</p>
                </div>
                <div style={{ background: S.bg, borderRadius: 8, padding: "8px 10px" }}>
                  <p style={{ color: S.text3, marginBottom: 2 }}>Commissions</p>
                  <p style={{ color: S.info, fontWeight: 700 }}>−{fmt(c.totalComm)}</p>
                </div>
                <div style={{ background: S.bg, borderRadius: 8, padding: "8px 10px" }}>
                  <p style={{ color: S.text3, marginBottom: 2 }}>Versé</p>
                  <p style={{ color: S.success, fontWeight: 700 }}>−{fmt(c.totalVerse)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Versements ── */}
      {tab === "versements" && (
        <div>
          {versements.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: S.text3 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📲</p>
              <p>Aucun versement reçu</p>
            </div>
          ) : versements.map(v => {
            const statusC = v.status === "confirmé" ? S.success : v.status === "rejeté" ? S.danger : S.warning;
            const statusL = v.status === "confirmé" ? "✅ Confirmé" : v.status === "rejeté" ? "❌ Rejeté" : "⏳ En attente";
            return (
              <div key={v.id} style={{ background: S.card, border: `1px solid ${statusC}40`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{v.driver_name}</p>
                    <p style={{ fontSize: 11, color: S.text3 }}>{fmtDate(v.created_at)}</p>
                    <p style={{ fontSize: 12, color: S.text2, marginTop: 4 }}>{v.operateur}{v.reference ? ` · Réf: ${v.reference}` : ""}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: S.gold }}>{fmt(v.montant)}</p>
                    <p style={{ fontSize: 11, color: statusC, fontWeight: 700 }}>{statusL}</p>
                  </div>
                </div>
                {v.note && <p style={{ fontSize: 12, color: S.text2, marginBottom: 10, padding: "6px 10px", background: S.bg, borderRadius: 8 }}>💬 {v.note}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  {v.capture_url && (
                    <button onClick={() => setCaptureModal(v.capture_url!)}
                      style={{ flex: 1, padding: "9px 0", background: S.infoBg, border: `1px solid ${S.info}`, borderRadius: 10, color: S.info, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      🖼️ Voir capture
                    </button>
                  )}
                  {v.status === "en_attente" && (
                    <>
                      <button onClick={() => handleConfirmVersement(v)}
                        style={{ flex: 1, padding: "9px 0", background: S.successBg, border: `1px solid ${S.success}`, borderRadius: 10, color: S.success, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        ✅ Confirmer
                      </button>
                      <button onClick={() => handleRejectVersement(v)}
                        style={{ flex: 1, padding: "9px 0", background: S.dangerBg, border: `1px solid ${S.danger}`, borderRadius: 10, color: S.danger, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        ❌ Rejeter
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Commissions ── */}
      {tab === "commissions" && (
        <div>
          {/* Filtre période */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
            {(["today", "semaine", "mois", "all"] as PeriodFilter[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: "7px 14px", borderRadius: 20, border: `1px solid ${period === p ? S.gold : S.border}`,
                background: period === p ? "#1a1200" : S.card, color: period === p ? S.gold : S.text2,
                fontSize: 12, fontWeight: period === p ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" as const,
              }}>
                {p === "today" ? "Aujourd'hui" : p === "semaine" ? "Semaine" : p === "mois" ? "Mois" : "Tout"}
              </button>
            ))}
          </div>

          {/* Livreurs */}
          {commDrivers.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: S.text3, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 10 }}>🏍️ LIVREURS</p>
              {commDrivers.map(c => (
                <div key={c.person.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{c.person.full_name}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: c.reste > 0 ? S.warning : S.success }}>{fmt(c.reste)}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12, fontSize: 12 }}>
                    <div style={{ background: S.bg, borderRadius: 8, padding: "8px 10px" }}>
                      <p style={{ color: S.text3, marginBottom: 2 }}>Total dû</p>
                      <p style={{ color: S.gold, fontWeight: 700 }}>{fmt(c.total)}</p>
                    </div>
                    <div style={{ background: S.bg, borderRadius: 8, padding: "8px 10px" }}>
                      <p style={{ color: S.text3, marginBottom: 2 }}>Payé</p>
                      <p style={{ color: S.success, fontWeight: 700 }}>{fmt(c.paid)}</p>
                    </div>
                    <div style={{ background: S.bg, borderRadius: 8, padding: "8px 10px" }}>
                      <p style={{ color: S.text3, marginBottom: 2 }}>Avances</p>
                      <p style={{ color: S.purple, fontWeight: 700 }}>{fmt(c.avances)}</p>
                    </div>
                  </div>
                  {c.reste > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button onClick={() => handlePayCommission(c.person.id, c.person.full_name, "livreur", c.reste)}
                        style={{ padding: "9px 0", background: S.successBg, border: `1px solid ${S.success}`, borderRadius: 10, color: S.success, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        💰 Payer {fmt(c.reste)}
                      </button>
                      <button onClick={() => handleAvance(c.person.id, c.person.full_name, "livreur")}
                        style={{ padding: "9px 0", background: S.purpleBg, border: `1px solid ${S.purple}`, borderRadius: 10, color: S.purple, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        ➕ Avance
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Closeurs */}
          {commClosers.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: S.text3, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 10 }}>👩‍💼 CLOSEURS</p>
              {commClosers.map(c => (
                <div key={c.person.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{c.person.full_name}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: c.reste > 0 ? S.warning : S.success }}>{fmt(c.reste)}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12, fontSize: 12 }}>
                    <div style={{ background: S.bg, borderRadius: 8, padding: "8px 10px" }}>
                      <p style={{ color: S.text3, marginBottom: 2 }}>Total dû</p>
                      <p style={{ color: S.gold, fontWeight: 700 }}>{fmt(c.total)}</p>
                    </div>
                    <div style={{ background: S.bg, borderRadius: 8, padding: "8px 10px" }}>
                      <p style={{ color: S.text3, marginBottom: 2 }}>Payé</p>
                      <p style={{ color: S.success, fontWeight: 700 }}>{fmt(c.paid)}</p>
                    </div>
                    <div style={{ background: S.bg, borderRadius: 8, padding: "8px 10px" }}>
                      <p style={{ color: S.text3, marginBottom: 2 }}>Avances</p>
                      <p style={{ color: S.purple, fontWeight: 700 }}>{fmt(c.avances)}</p>
                    </div>
                  </div>
                  {c.reste > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button onClick={() => handlePayCommission(c.person.id, c.person.full_name, "closureuse", c.reste)}
                        style={{ padding: "9px 0", background: S.successBg, border: `1px solid ${S.success}`, borderRadius: 10, color: S.success, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        💰 Payer {fmt(c.reste)}
                      </button>
                      <button onClick={() => handleAvance(c.person.id, c.person.full_name, "closureuse")}
                        style={{ padding: "9px 0", background: S.purpleBg, border: `1px solid ${S.purple}`, borderRadius: 10, color: S.purple, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        ➕ Avance
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {commDrivers.length === 0 && commClosers.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: S.text3 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>💰</p>
              <p>Aucune commission sur cette période</p>
            </div>
          )}
        </div>
      )}

      {/* ── Rapport ── */}
      {tab === "rapport" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
            {(["today", "semaine", "mois", "all"] as PeriodFilter[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: "7px 14px", borderRadius: 20, border: `1px solid ${period === p ? S.gold : S.border}`,
                background: period === p ? "#1a1200" : S.card, color: period === p ? S.gold : S.text2,
                fontSize: 12, fontWeight: period === p ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" as const,
              }}>
                {p === "today" ? "Aujourd'hui" : p === "semaine" ? "Semaine" : p === "mois" ? "Mois" : "Tout"}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "💵 Total encaissé", value: fmt(rapport.encaisse), color: S.gold },
              { label: "📦 Livraisons", value: rapport.livraisons, color: S.info },
              { label: "🛵 Comm. livreurs", value: fmt(rapport.commDrivers), color: S.warning },
              { label: "👩 Comm. closeurs", value: fmt(rapport.commClosers), color: S.purple },
              { label: "✅ Versements reçus", value: fmt(rapport.versementsRecus), color: S.success },
              { label: "⏳ Versements en attente", value: fmt(rapport.versementsAttente), color: S.warning },
            ].map(item => (
              <div key={item.label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16 }}>
                <p style={{ fontSize: 11, color: S.text3, marginBottom: 8 }}>{item.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Bénéfice estimé */}
          <div style={{ background: "linear-gradient(135deg, #1a1200, #2d1e00)", border: `1px solid ${S.gold}`, borderRadius: 16, padding: 20, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: S.text2, marginBottom: 8 }}>💎 Bénéfice estimé (après commissions)</p>
            <p style={{ fontSize: 32, fontWeight: 900, color: S.gold }}>
              {fmt(rapport.encaisse - rapport.commDrivers - rapport.commClosers)}
            </p>
            <p style={{ fontSize: 11, color: S.text3, marginTop: 6 }}>Encaissé − Commissions livreurs − Commissions closeurs</p>
          </div>
        </div>
      )}
    </div>
  );
}
