"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import InstallPWA from "@/components/pwa/InstallPWA";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import type { Order, Profile, DriverStock } from "@/types";
import { normalizeRole, fmt, fmtDate, callUrl, waUrl, setCurrency } from "@/lib/utils";
import { sendSms, smsMessages } from "@/lib/sendSms";
import { StockWidget } from "./StockWidget";
import VersementForm from "./VersementForm";
import { toast, confirm, ToastContainer } from "@/components/ui/Toast";
import ProfileMenu from "@/components/ui/ProfileMenu";

const S = {
  gold: "#F59E0B", goldDark: "#D97706",
  bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  success: "#4ADE80", successBg: "#052E16",
  info: "#60A5FA", infoBg: "#0C1E3E",
  danger: "#F87171", dangerBg: "#2D0F0F",
  warning: "#FB923C", warningBg: "#2D1500",
  purple: "#C084FC", purpleBg: "#2E1065",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  green: "#25D366",
  blue: "#60A5FA",
};

type Tab = "dashboard" | "encours" | "historique" | "commissions" | "stock";
type PeriodFilter = "today" | "semaine" | "mois" | "tout";

function clientWaMsg(o: Order) {
  return `Bonjour ${o.customer_name} ! Je suis votre livreur. Je viens vous livrer votre commande.\n\nProduit : ${o.product} × ${o.quantity || 1}\nMontant : ${fmt(o.amount)}\nAdresse : ${o.address}, ${o.city}\n\nMerci de vous tenir disponible.`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, { color: string; bg: string }> = {
    "En attente": { color: S.warning, bg: S.warningBg },
    "Confirmé": { color: S.info, bg: S.infoBg },
    "Livré": { color: S.success, bg: S.successBg },
    "Annulé": { color: S.danger, bg: S.dangerBg },
  };
  const c = map[status || "En attente"] ?? map["En attente"];
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: c.color, backgroundColor: c.bg }}>
      {status || "En attente"}
    </span>
  );
}

export function LivreurView() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<DriverStock[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [period, setPeriod] = useState<PeriodFilter>("today");
  const [refreshing, setRefreshing] = useState(false);
  const [commissionRules, setCommissionRules] = useState({ driver: 2000, closer: 500 });
  const [tenantName, setTenantName] = useState("Shipivo");
  const [isAvailable, setIsAvailable] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);

  const toggleAvailability = async () => {
    if (!profile) return;
    setTogglingAvail(true);
    const newVal = !isAvailable;
    await supabase.from("profiles").update({
      is_available: newVal,
      last_seen: new Date().toISOString()
    }).eq("id", profile.id);
    setIsAvailable(newVal);
    setTogglingAvail(false);
    toast(newVal ? "🟢 Tu es maintenant disponible" : "🔴 Tu es maintenant indisponible", newVal ? "success" : "error");
  };

  useEffect(() => { void init(); }, []);

  // Notification temps réel quand demande approuvée
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("livreur-demandes-" + profile.id)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "stock_demandes",
        filter: `driver_id=eq.${profile.id}`,
      }, (payload) => {
        const d = payload.new as { status: string; product_name: string; quantity_requested: number };
        if (d.status === "approuvée") {
          toast(`✅ Demande approuvée : ${d.quantity_requested}× ${d.product_name}`, "success");
          // Recharger le stock
          void supabase.from("driver_stock").select("*").eq("driver_id", profile.id)
            .then(({ data }) => { if (data) setStock(data as DriverStock[]); });
        } else if (d.status === "refusée") {
          toast(`❌ Demande refusée : ${d.product_name}`, "error");
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profile]);

  async function init() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { router.replace("/login"); return; }
    const { data: pd } = await supabase.from("profiles")
      .select("*").eq("id", user.id).single();
    if (!pd) { router.replace("/login"); return; }
    const p = pd as Profile;
    if (normalizeRole(p.role) !== "livreur") {
      router.replace("/login"); return;
    }
    setProfile(p);
    setIsAvailable(p.is_available === true);

    // Tout en parallèle
    const [tenantRes, ordersRes, stockRes] = await Promise.all([
      p.tenant_id ? supabase.from("tenants")
        .select("currency, name, driver_commission, closer_commission, at_username, at_api_key, at_sender_id")
        .eq("id", p.tenant_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("orders")
        .select("id, customer_name, phone, city, address, product, quantity, amount, status, driver_name, assigned_driver_id, cash_collected, created_at, delivered_at, driver_commission, closer_commission, note, tenant_id")
        .eq("assigned_driver_id", user.id)
        .in("status", ["Confirmé", "Livré", "Annulé"])
        .order("id", { ascending: false }).limit(200),
      supabase.from("driver_stock")
        .select("id, driver_id, driver_name, product_name, quantity")
        .eq("driver_id", user.id),
    ]);

    if (tenantRes.data) {
      const td = tenantRes.data as any;
      if (td.name) setTenantName(td.name);
      if (td.currency) setCurrency(td.currency);
      setCommissionRules({
        driver: td.driver_commission || 2000,
        closer: td.closer_commission || 500,
      });
    }
    setOrders((ordersRes.data || []) as Order[]);
    setStock((stockRes.data || []) as DriverStock[]);
  }

  const loadData = async (driverId: string) => {
    const [ordersRes, stockRes] = await Promise.all([
      supabase.from("orders")
        .select("*")
        .eq("assigned_driver_id", driverId)
        .in("status", ["Confirmé", "Livré", "Annulé"])
        .order("id", { ascending: false }),
      supabase.from("driver_stock").select("*").eq("driver_id", driverId)
    ]);
    setOrders((ordersRes.data as Order[]) || []);
    setStock((stockRes.data as DriverStock[]) || []);
  };

  const handleRefresh = async () => {
    if (!profile) return;
    setRefreshing(true);
    await loadData(profile.id);
    setRefreshing(false);
  };

  const handleDeliver = useCallback((id: number) => {
    confirm({
      message: "Confirmer la livraison et l'encaissement ?",
      confirmLabel: "🎯 Confirmer",
      onConfirm: async () => {
        const order = orders.find(o => o.id === id);
        if (!order) return;
        const now = new Date().toISOString();
        const closerComm = order.closer_id ? 500 : 0;
        const payload = {
          status: "Livré", logistic_status: "Livré", payment_status: "Payé",
          cash_collected: true, cash_collected_at: now,
          cash_collected_by: profile?.full_name || null,
          driver_commission: commissionRules.driver, closer_commission: closerComm,
          commission_calculated: true, delivered_at: now,
        };
        const { error } = await supabase.from("orders").update(payload).eq("id", id);
        if (error) { toast("Erreur : " + error.message, "error"); return; }
        if (order.product) {
          const s = stock.find(i => i.product_name.toLowerCase() === order.product.toLowerCase());
          if (s && s.quantity > 0) {
            await supabase.from("driver_stock").update({ quantity: Math.max(0, s.quantity - (order.quantity || 1)) }).eq("id", s.id);
          }
        }
        setOrders(prev => prev.map(o => o.id === id ? { ...o, ...payload } : o));
        toast("✅ Livré + Payé ! Commission enregistrée.", "success");
        // SMS livraison client
        if (order && profile?.tenant_id) {
          const { data: tenantData } = await supabase.from("tenants").select("name, at_username, at_api_key, at_sender_id").eq("id", profile.tenant_id).single();
          const boutique = tenantData?.name || "Shipivo";
          void sendSms({
            tenant_id: profile.tenant_id,
            phone: order.phone,
            message: smsMessages.livraison(order.customer_name, order.product, boutique),
            at_username: tenantData?.at_username,
            at_api_key: tenantData?.at_api_key,
            at_sender_id: tenantData?.at_sender_id,
          });
        }
      }
    });
  }, [orders, profile, stock]);

  const handleSendToGare = useCallback((id: number) => {
    confirm({
      message: "Confirmer envoi à la gare ?",
      confirmLabel: "🚌 Confirmer",
      onConfirm: async () => {
        const order = orders.find(o => o.id === id);
        const now = new Date().toISOString();
        const closerComm = order?.closer_id ? 500 : 0;
        const payload = {
          status: "Livré", logistic_status: "Envoyé à la gare", payment_status: "Payé",
          cash_collected: true, cash_collected_at: now,
          cash_collected_by: profile?.full_name || null,
          driver_commission: commissionRules.driver, closer_commission: closerComm,
          commission_calculated: true, delivered_at: now,
        };
        const { error } = await supabase.from("orders").update(payload).eq("id", id);
        if (error) { toast("Erreur : " + error.message, "error"); return; }
        setOrders(prev => prev.map(o => o.id === id ? { ...o, ...payload } : o));
        toast("✅ Envoyé à la gare ! Commission enregistrée.", "success");
      }
    });
  }, [orders, profile]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  const filterByPeriod = (list: Order[]) => {
    const now = new Date();
    return list.filter(o => {
      const d = new Date(o.delivered_at || o.created_at || "");
      if (period === "today") return d.toDateString() === now.toDateString();
      if (period === "semaine") return (now.getTime() - d.getTime()) / 86400000 <= 7;
      if (period === "mois") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const today = new Date().toDateString();
  const enCours = orders.filter(o => o.status === "Confirmé");
  const todayEnCours = enCours.filter(o => new Date(o.assigned_at || o.created_at || "").toDateString() === today);
  const autresEnCours = enCours.filter(o => new Date(o.assigned_at || o.created_at || "").toDateString() !== today);
  const historique = orders.filter(o => o.status === "Livré" || o.status === "Annulé");
  const todayDelivered = historique.filter(o => o.status === "Livré" && new Date(o.delivered_at || "").toDateString() === today);
  const todayCommission = todayDelivered.length * 2000;
  const totalCommission = orders.filter(o => o.driver_commission && o.driver_commission > 0).reduce((s, o) => s + Number(o.driver_commission), 0);
  const totalEncaisse = orders.filter(o => o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0);

  // Charger les versements confirmés pour déduire du montant dû
  const [totalVerse, setTotalVerse] = useState(0);
  useEffect(() => {
    if (!profile) return;
    supabase.from("versements")
      .select("montant")
      .eq("driver_id", profile.id)
      .eq("status", "confirmé")
      .then(({ data }) => {
        const total = (data || []).reduce((s: number, v: {montant: number}) => s + Number(v.montant), 0);
        setTotalVerse(total);
      });
  }, [profile]);

  const montantDu = Math.max(0, totalEncaisse - totalCommission - totalVerse);
  const objective = 10;
  const progress = Math.min((todayDelivered.length / objective) * 100, 100);

  const navTabs = [
    { id: "dashboard", label: "📊", full: "Dashboard" },
    { id: "encours", label: "⚡", full: `En cours (${enCours.length})` },
    { id: "historique", label: "📋", full: "Historique" },
    { id: "commissions", label: "💰", full: "Commissions" },
    { id: "stock", label: "📦", full: "Stock" },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${S.gold}`, borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: S.text2, fontSize: 13 }}>Chargement...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg, color: S.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <ToastContainer />
      <InstallPWA />
      <div style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: S.card, borderBottom: `1px solid ${S.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: S.gold }}>{tenantName}</div>
          <div style={{ fontSize: 10, color: S.text3 }}>🏍️ Livreur · {profile?.full_name}</div>
        </div>
        <ProfileMenu
          name={profile?.full_name || "Livreur"}
          email={profile?.email}
          role="livreur"
          onLogout={handleLogout}
        />
      </div>

      {/* Nav */}
      <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, backgroundColor: S.card, overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
        {navTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            style={{ flex: 1, padding: "10px 8px", border: "none", borderBottom: tab === t.id ? `2px solid ${S.gold}` : "2px solid transparent", backgroundColor: "transparent", color: tab === t.id ? S.gold : S.text2, fontWeight: tab === t.id ? 700 : 400, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2, minWidth: 52 }}>
            <span style={{ fontSize: 18 }}>{t.label}</span>
            <span>{t.full.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 14px 80px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            {/* Bouton disponibilité */}
            <div style={{ marginBottom: 16 }}>
              <button onClick={toggleAvailability} disabled={togglingAvail}
                style={{ width: "100%", padding: "16px", borderRadius: 14, cursor: togglingAvail ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  background: isAvailable ? "linear-gradient(135deg,#052E16,#065F46)" : "linear-gradient(135deg,#2D0F0F,#450A0A)",
                  color: isAvailable ? S.success : S.danger,
                  border: `2px solid ${isAvailable ? S.success + "50" : S.danger + "50"}` }}>
                <span style={{ fontSize: 24 }}>{isAvailable ? "🟢" : "🔴"}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{isAvailable ? "Disponible" : "Indisponible"}</p>
                  <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>{isAvailable ? "Les closureuses peuvent t'assigner des livraisons" : "Appuie pour te mettre disponible"}</p>
                </div>
              </button>
            </div>

            {/* Stats rapides livreur */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <p style={{ color: S.text2, fontSize: 11, margin: "0 0 4px 0" }}>🎯 Livrées aujourd&apos;hui</p>
                <p style={{ color: S.success, fontSize: 28, fontWeight: 800, margin: 0 }}>
                  {orders.filter(o => o.status === "Livré" && o.delivered_at && new Date(o.delivered_at).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <p style={{ color: S.text2, fontSize: 11, margin: "0 0 4px 0" }}>📦 En cours</p>
                <p style={{ color: S.warning, fontSize: 28, fontWeight: 800, margin: 0 }}>
                  {orders.filter(o => ["Confirmé","Assigné","En livraison"].includes(o.status ?? "")).length}
                </p>
              </div>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <p style={{ color: S.text2, fontSize: 11, margin: "0 0 4px 0" }}>💰 Commissions</p>
                <p style={{ color: S.gold, fontSize: 18, fontWeight: 800, margin: 0 }}>
                  {(() => { const total = orders.filter(o => o.status === "Livré" && o.driver_commission).reduce((s, o) => s + Number(o.driver_commission || 0), 0); return fmt(total); })()}
                </p>
              </div>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <p style={{ color: S.text2, fontSize: 11, margin: "0 0 4px 0" }}>📊 Taux livraison</p>
                <p style={{ color: S.blue, fontSize: 24, fontWeight: 800, margin: 0 }}>
                  {(() => { const total = orders.filter(o => ["Livré","Annulé"].includes(o.status ?? "")).length; const livrees = orders.filter(o => o.status === "Livré").length; return total > 0 ? Math.round((livrees/total)*100) + "%" : "—"; })()}
                </p>
              </div>
            </div>

            {/* Bannière montant dû + formulaire inline */}
            {profile && (
              montantDu > 0 ? (
                <VersementForm
                  profile={profile}
                  montantDu={montantDu}
                  onSuccess={async () => {
                    const { data } = await supabase.from("orders").select("*")
                      .eq("assigned_driver_id", profile.id)
                      .in("status", ["Confirmé", "Livré", "Annulé"])
                      .order("id", { ascending: false });
                    if (data) setOrders(data as Order[]);
                    const { data: vData } = await supabase.from("versements")
                      .select("montant").eq("driver_id", profile.id).eq("status", "confirmé");
                    const total = (vData || []).reduce((s: number, v: {montant: number}) => s + Number(v.montant), 0);
                    setTotalVerse(total);
                  }}
                  showHistorique={false}
                />
              ) : (
                <div style={{ background: S.successBg, border: `1px solid ${S.success}30`, borderRadius: 14, padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <p style={{ fontSize: 13, color: S.success, fontWeight: 600 }}>Caisse à jour — rien à remettre</p>
                </div>
              )
            )}

            {/* Objectif du jour */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: S.text2 }}>🎯 Objectif du jour</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: todayDelivered.length >= objective ? S.success : S.text }}>
                  {todayDelivered.length} / {objective} livraisons
                </span>
              </div>
              <div style={{ height: 8, backgroundColor: S.border, borderRadius: 4 }}>
                <div style={{ height: 8, borderRadius: 4, width: `${progress}%`, backgroundColor: progress >= 100 ? S.success : S.gold, transition: "width 0.4s ease" }} />
              </div>
              {progress >= 100 && <p style={{ fontSize: 12, color: S.success, marginTop: 8, fontWeight: 600 }}>🎉 Objectif atteint !</p>}
            </div>

            {/* Stats aujourd'hui */}
            <p style={{ fontSize: 11, color: S.text3, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>AUJOURD&apos;HUI</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, textAlign: "center" }}>
                <p style={{ fontSize: 24, marginBottom: 4 }}>⚡</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: S.warning }}>{enCours.length}</p>
                <p style={{ fontSize: 11, color: S.text3 }}>En cours</p>
              </div>
              <div style={{ background: S.successBg, border: `1px solid ${S.success}30`, borderRadius: 14, padding: 14, textAlign: "center" }}>
                <p style={{ fontSize: 24, marginBottom: 4 }}>✅</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: S.success }}>{todayDelivered.length}</p>
                <p style={{ fontSize: 11, color: S.text3 }}>Livrées</p>
              </div>
              <div style={{ background: "#1a1200", border: `1px solid ${S.gold}30`, borderRadius: 14, padding: 14, textAlign: "center" }}>
                <p style={{ fontSize: 24, marginBottom: 4 }}>💰</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: S.gold }}>{todayCommission.toLocaleString("fr-FR")} F</p>
                <p style={{ fontSize: 11, color: S.text3 }}>Commission</p>
              </div>
            </div>

            {/* Stock rapide */}
            <p style={{ fontSize: 11, color: S.text3, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>MON STOCK</p>
            {stock.length === 0 ? (
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20, textAlign: "center", color: S.text3, fontSize: 13 }}>Aucun stock</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
                {stock.map(s => {
                  const isLow = s.quantity <= 2;
                  return (
                    <div key={s.id} style={{ background: isLow ? S.dangerBg : S.card, border: `1px solid ${isLow ? S.danger : S.border}`, borderRadius: 14, padding: 14, textAlign: "center" }}>
                      <p style={{ fontSize: 11, color: S.text2, marginBottom: 4 }}>{s.product_name}</p>
                      <p style={{ fontSize: 28, fontWeight: 800, color: isLow ? S.danger : S.gold }}>{s.quantity}</p>
                      {isLow && <p style={{ fontSize: 10, color: S.danger, marginTop: 2 }}>⚠️ Stock bas</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Prochaines livraisons */}
            {enCours.length > 0 && (
              <>
                <p style={{ fontSize: 11, color: S.text3, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>PROCHAINES LIVRAISONS</p>
                {enCours.slice(0, 2).map(order => (
                  <div key={order.id} style={{ background: S.card, border: `1px solid ${S.goldDark}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700 }}>{order.customer_name}</p>
                        <p style={{ fontSize: 12, color: S.text2 }}>📍 {order.city} · {order.delivery_type}</p>
                      </div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: S.gold }}>{fmt(order.amount)}</p>
                    </div>
                  </div>
                ))}
                {enCours.length > 2 && (
                  <button onClick={() => setTab("encours")} style={{ width: "100%", padding: "10px 0", background: "transparent", border: `1px solid ${S.border}`, borderRadius: 10, color: S.text2, fontSize: 13, cursor: "pointer" }}>
                    Voir toutes ({enCours.length}) →
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── EN COURS ── */}
        {tab === "encours" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 700 }}>⚡ En cours ({enCours.length})</p>
              <button onClick={handleRefresh} disabled={refreshing}
                style={{ padding: "7px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 20, color: S.text2, fontSize: 12, cursor: "pointer" }}>
                {refreshing ? "..." : "🔄 Actualiser"}
              </button>
            </div>
            {enCours.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", background: S.card, borderRadius: 16, color: S.text3 }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🎉</p>
                <p>Aucune livraison en cours</p>
              </div>
            ) : (
              <div>
                {todayEnCours.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, color: S.gold, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 10 }}>
                      ⚡ AUJOURD&apos;HUI ({todayEnCours.length})
                    </p>
                    {todayEnCours.map(order => (
                      <DeliveryCardFull key={order.id} order={order} onDeliver={handleDeliver} onSendToGare={handleSendToGare} />
                    ))}
                  </div>
                )}
                {autresEnCours.length > 0 && (
                  <div style={{ marginTop: todayEnCours.length > 0 ? 16 : 0 }}>
                    <p style={{ fontSize: 11, color: S.text3, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 10 }}>
                      AUTRES JOURS ({autresEnCours.length})
                    </p>
                    {autresEnCours.map(order => (
                      <DeliveryCardFull key={order.id} order={order} onDeliver={handleDeliver} onSendToGare={handleSendToGare} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORIQUE ── */}
        {tab === "historique" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, background: S.card, borderRadius: 12, padding: 4 }}>
              {(["today", "semaine", "mois", "tout"] as PeriodFilter[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 600, background: period === p ? S.gold : "transparent", color: period === p ? "#000" : S.text2 }}>
                  {p === "today" ? "Auj." : p === "semaine" ? "7j" : p === "mois" ? "Mois" : "Tout"}
                </button>
              ))}
            </div>
            {filterByPeriod(historique).length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", background: S.card, borderRadius: 16, color: S.text3 }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p><p>Aucune livraison sur cette période</p>
              </div>
            ) : filterByPeriod(historique).map(order => (
              <div key={order.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{order.customer_name}</p>
                    <p style={{ fontSize: 12, color: S.text2 }}>📍 {order.city} · {order.delivery_type}</p>
                    <p style={{ fontSize: 11, color: S.text3, marginTop: 2 }}>📅 {fmtDate(order.delivered_at || order.cancelled_at)}</p>
                  </div>
                  <StatusBadge status={order.logistic_status || order.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", background: "#0a0a0f", borderRadius: 10, padding: "8px 12px" }}>
                  <span style={{ fontSize: 13, color: S.text2 }}>{order.product} × {order.quantity || 1}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: order.status === "Livré" ? S.success : S.danger }}>{fmt(order.amount)}</span>
                </div>
                {order.driver_commission && order.driver_commission > 0 && (
                  <p style={{ fontSize: 12, color: S.gold, marginTop: 8 }}>💰 Commission : {fmt(order.driver_commission)}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── COMMISSIONS ── */}
        {tab === "commissions" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, background: S.card, borderRadius: 12, padding: 4 }}>
              {(["today", "semaine", "mois", "tout"] as PeriodFilter[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 600, background: period === p ? S.gold : "transparent", color: period === p ? "#000" : S.text2 }}>
                  {p === "today" ? "Auj." : p === "semaine" ? "7j" : p === "mois" ? "Mois" : "Tout"}
                </button>
              ))}
            </div>

            {/* Total */}
            <div style={{ background: "linear-gradient(135deg, #1a1200, #2d1e00)", border: `1px solid ${S.gold}40`, borderRadius: 18, padding: 24, marginBottom: 20, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: S.text2, marginBottom: 8 }}>Total commissions</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: S.gold }}>
                {filterByPeriod(orders.filter(o => o.driver_commission && o.driver_commission > 0))
                  .reduce((s, o) => s + Number(o.driver_commission), 0).toLocaleString("fr-FR")} FCFA
              </p>
              <p style={{ fontSize: 13, color: S.text3, marginTop: 8 }}>
                {filterByPeriod(orders.filter(o => o.driver_commission && o.driver_commission > 0)).length} livraison(s) × 2 000 FCFA
              </p>
            </div>

            {/* Détail */}
            <p style={{ fontSize: 11, color: S.text3, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>DÉTAIL PAR LIVRAISON</p>
            {filterByPeriod(orders.filter(o => o.driver_commission && o.driver_commission > 0)).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: S.card, borderRadius: 16, color: S.text3 }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>💰</p><p>Aucune commission sur cette période</p>
              </div>
            ) : filterByPeriod(orders.filter(o => o.driver_commission && o.driver_commission > 0)).map(order => (
              <div key={order.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{order.customer_name}</p>
                  <p style={{ fontSize: 11, color: S.text2 }}>{fmtDate(order.delivered_at)} · {order.logistic_status || "Livré"}</p>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: S.gold }}>+{fmt(order.driver_commission)}</p>
              </div>
            ))}

            {/* Total global */}
            <div style={{ marginTop: 20, padding: 16, background: S.card, border: `1px solid ${S.border}`, borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: S.text2 }}>Total toutes périodes</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: S.gold }}>{totalCommission.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>

            {/* Versements */}
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 11, color: S.text3, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>📲 MES VERSEMENTS</p>
              {profile && <VersementForm profile={profile} montantDu={0} onSuccess={async () => {}} showHistorique={true} showForm={false} />}
            </div>
          </div>
        )}

        {/* ── STOCK ── */}
        {tab === "stock" && (
          <StockWidget
            stock={stock}
            profile={profile}
            onRequestStock={() => {}}
            onStockUpdated={async () => {
              if (!profile) return;
              const { data } = await supabase.from("driver_stock").select("*").eq("driver_id", profile.id);
              if (data) setStock(data as DriverStock[]);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Carte livraison complète ─────────────────────────────────
function DeliveryCardFull({ order, onDeliver, onSendToGare }: {
  order: Order;
  onDeliver: (id: number) => void;
  onSendToGare: (id: number) => void;
}) {
  const isConfirmed = order.status === "Confirmé";

  return (
    <div style={{ background: S.card, border: `1px solid ${isConfirmed ? S.goldDark : S.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
      {isConfirmed && <div style={{ height: 3, background: `linear-gradient(90deg, ${S.gold}, ${S.goldDark})` }} />}

      {/* Header */}
      <div style={{ padding: "14px 14px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{order.customer_name}</p>
          <p style={{ fontSize: 12, color: S.text3 }}>📍 {order.city} — {order.delivery_type || "direct"}</p>
          <p style={{ fontSize: 12, color: S.text2, marginTop: 2 }}>{order.address}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Détails */}
      <div style={{ margin: "0 12px 12px", padding: "12px", background: "#0a0a0f", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 11, color: S.text3, marginBottom: 4 }}>À collecter</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: S.gold }}>{fmt(order.amount)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 13, fontWeight: 600 }}>{order.product}</p>
          <p style={{ fontSize: 12, color: S.text2 }}>{order.quantity || 1} unité(s)</p>
          <p style={{ fontSize: 11, color: S.text3, marginTop: 4 }}>📅 {fmtDate(order.created_at)}</p>
        </div>
      </div>

      {/* Téléphone */}
      <div style={{ padding: "0 12px 10px" }}>
        <p style={{ fontSize: 12, color: S.text2 }}>📞 {order.phone}</p>
      </div>

      {/* Boutons contact */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 12px 10px" }}>
        <a href={callUrl(order.phone)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", background: S.infoBg, border: `1px solid ${S.info}30`, borderRadius: 10, color: S.info, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          📞 Appeler
        </a>
        <a href={waUrl(order.phone, clientWaMsg(order))} target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", background: "#0a2e1a", border: "1px solid #25d36630", borderRadius: 10, color: "#25D366", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          💬 WhatsApp
        </a>
      </div>

      {/* Actions livraison */}
      {isConfirmed && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8, padding: "0 12px 14px" }}>
          <button onClick={() => onSendToGare(order.id)}
            style={{ padding: "11px 0", background: S.warningBg, border: "none", borderRadius: 10, color: S.warning, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            🚌 Gare
          </button>
          <button onClick={() => toast("Photo — bientôt disponible", "info")}
            style={{ padding: "11px 0", background: S.border, border: "none", borderRadius: 10, color: S.text2, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            📸 Photo
          </button>
          <button onClick={() => onDeliver(order.id)}
            style={{ padding: "11px 0", background: `linear-gradient(135deg, ${S.gold}, ${S.goldDark})`, border: "none", borderRadius: 10, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ✓ Livré + Payé
          </button>
        </div>
      )}
    </div>
  );
}
