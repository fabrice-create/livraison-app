"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import InstallPWA from "@/components/pwa/InstallPWA";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import type { Order, Profile, DriverStock } from "@/types";
import { normalizeRole, fmt, fmtDate, callUrl, waUrl, setCurrency } from "@/lib/utils";
import { sendSms, smsMessages } from "@/lib/sendSms";
import { toast, confirm, ToastContainer } from "@/components/ui/Toast";
import ProfileMenu from "@/components/ui/ProfileMenu";
import { useIsMobile } from "@/hooks/useIsMobile";

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
  blue: "#60A5FA", blueBg: "#0C1E3E",
  red: "#F87171", redBg: "#450A0A",
};

type Tab = "dashboard" | "commandes" | "assigner" | "creer" | "commissions" | "stocks";
type PeriodFilter = "today" | "semaine" | "mois" | "tout";

const inp = { width: "100%", padding: "10px 12px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 10, color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const };

function StatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, { color: string; bg: string }> = {
    "En attente": { color: S.warning, bg: S.warningBg },
    "Confirmé": { color: S.info, bg: S.infoBg },
    "Livré": { color: S.success, bg: S.successBg },
    "Annulé": { color: S.danger, bg: S.dangerBg },
    "Envoyé à la gare": { color: S.purple, bg: S.purpleBg },
  };
  const c = map[status || "En attente"] ?? map["En attente"];
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: c.color, backgroundColor: c.bg }}>{status || "En attente"}</span>;
}

export function ClosureuseView() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [driverStocks, setDriverStocks] = useState<DriverStock[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [period, setPeriod] = useState<PeriodFilter>("today");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("encours");
  const [refreshing, setRefreshing] = useState(false);
  const [assignModal, setAssignModal] = useState<Order | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ customer_name: "", phone: "", city: "", address: "", product: "", quantity: "1", amount: "", delivery_type: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [tenantName, setTenantName] = useState("Shipivo");

  useEffect(() => { void init(); }, []);

  // Temps réel — nouvelles commandes
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("closureuse-orders")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "orders",
      }, (payload) => {
        const newOrder = payload.new as Order;
        setOrders(prev => {
          // Dédupliquer — ne pas ajouter si déjà présent
          if (prev.some(o => o.id === newOrder.id)) return prev;
          return [newOrder, ...prev];
        });
        setNewOrdersCount(c => c + 1);
        // Son de notification
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 880; gain.gain.value = 0.3;
          osc.start(); osc.stop(ctx.currentTime + 0.15);
        } catch (_) {}
      })
      .subscribe();
    channelRef.current = channel;
    return () => { void supabase.removeChannel(channel); };
  }, [profile]);

  const init = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { router.replace("/login"); return; }

      const { data: pd } = await supabase.from("profiles")
        .select("id, role, tenant_id, full_name, email, phone, is_active")
        .or(`user_id.eq.${user.id},id.eq.${user.id}`).maybeSingle();
      if (!pd) { router.replace("/login"); return; }

      const p = pd as Profile;
      if (normalizeRole(p.role) !== "closureuse") {
        router.replace(normalizeRole(p.role) === "admin" ? "/admin" : "/livreur");
        return;
      }
      setProfile(p);

      const tid = (p as any).tenant_id;

      // Tenant d'abord
      if (tid) {
        const { data: td } = await supabase.from("tenants")
          .select("currency, name")
          .eq("id", tid).single();
        if (td) {
          const tda = td as any;
          if (tda.name) setTenantName(tda.name);
          if (tda.currency) setCurrency(tda.currency);
        }
      }

      // Données en parallèle
      const [driversRes, ordersRes, stockRes] = await Promise.all([
        tid ? supabase.from("profiles")
          .select("id, full_name, role, is_active, is_available")
          .eq("tenant_id", tid).eq("is_active", true).ilike("role", "livreur")
          : Promise.resolve({ data: [] }),
        tid ? supabase.from("orders")
          .select("id, customer_name, phone, city, address, product, quantity, amount, status, logistic_status, driver_name, closer_name, closer_id, assigned_driver_id, cash_collected, source, created_at, confirmed_at, delivered_at, cancelled_at, driver_commission, closer_commission, note, tenant_id")
          .eq("tenant_id", tid).order("id", { ascending: false }).limit(300)
          : Promise.resolve({ data: [] }),
        tid ? supabase.from("driver_stock")
          .select("id, driver_id, driver_name, product_name, quantity, tenant_id")
          .eq("tenant_id", tid)
          : Promise.resolve({ data: [] }),
      ]);

      setDrivers((driversRes.data || []) as Profile[]);
      setOrders((ordersRes.data || []) as Order[]);
      setDriverStocks((stockRes.data || []) as DriverStock[]);
      setLoading(false);

    } catch (err) {
      console.error("Erreur init closureuse:", err);
      setLoading(false);
      router.replace("/login");
    }
  };

  const loadData = async (tenantId: string) => {
    // Charger en parallèle pour aller plus vite
    const [ordersRes, profilesRes] = await Promise.all([
      supabase.from("orders").select("*").eq("tenant_id", tenantId).order("id", { ascending: false }),
      supabase.from("profiles").select("*").ilike("role", "livreur").eq("tenant_id", tenantId).eq("is_active", true)
    ]);
    const allOrders = (ordersRes.data as Order[]) || []
    // Si la closeuse a une zone assignée, elle ne voit que les commandes de sa zone
    // Sinon elle voit toutes les commandes (compatibilité)
    const filteredOrders = profileData?.zone_id
      ? allOrders.filter(o => o.zone_id === profileData.zone_id || !o.zone_id)
      : allOrders
    setOrders(filteredOrders);
    const driverList = (profilesRes.data as Profile[]) || [];
    setDrivers(driverList);
    // Charger stock seulement si des livreurs existent
    if (driverList.length > 0) {
      const driverIds = driverList.map(d => d.id);
      // Charger par driver_ids ET par tenant_id (pour couvrir les anciennes entrées sans tenant_id)
      const [stockByDriver, stockByTenant] = await Promise.all([
        supabase.from("driver_stock").select("*").in("driver_id", driverIds),
        supabase.from("driver_stock").select("*").eq("tenant_id", tenantId),
      ]);
      const allStock = [...(stockByDriver.data || []), ...(stockByTenant.data || [])];
      // Dédupliquer par id
      const uniqueStock = Array.from(new Map(allStock.map(s => [s.id, s])).values());
      setDriverStocks((uniqueStock as DriverStock[]) || []);
    } else {
      setDriverStocks([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(profile?.tenant_id || "");
    setRefreshing(false);
  };

  const handleConfirm = useCallback((id: number) => {
    confirm({
      message: "Confirmer cette commande ?",
      confirmLabel: "✅ Confirmer",
      onConfirm: async () => {
        const now = new Date().toISOString();
        const { error } = await supabase.from("orders").update({
          status: "Confirmé",
      confirmed_at: now,
      closer_id: profile?.id || null,
      closer_name: profile?.full_name || null,
    }).eq("id", id);
    if (error) { toast("Erreur : " + error.message, "error"); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "Confirmé", confirmed_at: now, closer_id: profile?.id || null, closer_name: profile?.full_name || null } : o));
    // SMS confirmation client
    const order = orders.find(o => o.id === id);
    if (order && profile?.tenant_id) {
      const { data: tenantData } = await supabase.from("tenants").select("name, at_username, at_api_key, at_sender_id").eq("id", profile.tenant_id).single();
      const boutique = tenantData?.name || "Shipivo";
      void sendSms({
        tenant_id: profile.tenant_id,
        phone: order.phone,
        message: smsMessages.confirmation(order.customer_name, order.product, boutique),
        at_username: tenantData?.at_username,
        at_api_key: tenantData?.at_api_key,
        at_sender_id: tenantData?.at_sender_id,
      });
    }
      }
    });
  }, [profile]);

  const handleCancel = useCallback((id: number) => {
    confirm({
      message: "Annuler cette commande ?",
      confirmLabel: "❌ Annuler",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from("orders").update({ status: "Annulé", cancelled_at: new Date().toISOString() }).eq("id", id);
        if (error) { toast("Erreur : " + error.message, "error"); return; }
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "Annulé" } : o));
      }
    });
  }, []);

  const handleAssignSubmit = async () => {
    if (!assignModal || !selectedDriver) { toast("Choisis un livreur.", "error"); return; }
    const driver = drivers.find(d => d.id === selectedDriver);
    if (!driver) return;
    const { error } = await supabase.from("orders").update({
      assigned_driver_id: driver.id, driver_name: driver.full_name,
      is_assigned: true, assigned_at: new Date().toISOString(),
    }).eq("id", assignModal.id);
    if (error) { toast("Erreur : " + error.message, "error"); return; }
    setOrders(prev => prev.map(o => o.id === assignModal.id ? { ...o, assigned_driver_id: driver.id, driver_name: driver.full_name, is_assigned: true } : o));
    toast(`✅ Assigné à ${driver.full_name}`, "success");
    setAssignModal(null); setSelectedDriver("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createLoading) return; // Guard anti-double soumission
    setCreateLoading(true);
    const { data, error } = await supabase.from("orders").insert([{
      ...createForm, quantity: Number(createForm.quantity), amount: Number(createForm.amount),
      tenant_id: profile?.tenant_id,
      status: "En attente", logistic_status: "En attente", payment_status: "Non payé",
      cash_collected: false, is_assigned: false,
      closer_id: profile?.id, closer_name: profile?.full_name,
      closer_commission: 0, driver_commission: 0, commission_calculated: false,
    }]).select();
    if (error) { toast("Erreur : " + error.message, "error"); setCreateLoading(false); return; }
    // Ne PAS ajouter manuellement — le realtime gère l'INSERT automatiquement
    // Sinon la commande apparaît en double
    setCreateForm({ customer_name: "", phone: "", city: "", address: "", product: "", quantity: "1", amount: "", delivery_type: "" });
    setShowCreateForm(false);
    setTab("commandes");
    toast("✅ Commande créée !", "success");
    setCreateLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  const filterByPeriod = (list: Order[]) => {
    const now = new Date();
    return list.filter(o => {
      const d = new Date(o.created_at || "");
      if (period === "today") return d.toDateString() === now.toDateString();
      if (period === "semaine") return (now.getTime() - d.getTime()) / 86400000 <= 7;
      if (period === "mois") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const isEnCours = (o: Order) => ["En attente", "Confirmé", "Assigné", "En livraison"].includes(o.status ?? "");
  const today = new Date().toDateString();
  const todayCreated = orders.filter(o => new Date(o.created_at || "").toDateString() === today);
  const todayDelivered = orders.filter(o => o.status === "Livré" && new Date(o.delivered_at || "").toDateString() === today);
  const enCours = orders.filter(isEnCours);
  const nonAssigned = orders.filter(o => o.status === "Confirmé" && !o.is_assigned);
  const myOrders = orders.filter(o => o.closer_id === profile?.id);
  const myCommissions = myOrders.filter(o => o.closer_commission && o.closer_commission > 0);
  const totalMyCommission = myCommissions.reduce((s, o) => s + Number(o.closer_commission), 0);

  const visibleOrders = orders.filter(o => {
    const matchStatus = statusFilter === "encours" ? isEnCours(o) : !isEnCours(o);
    const q = search.trim().toLowerCase();
    const matchSearch = q === "" || [o.customer_name, o.phone, o.city, o.product, o.driver_name || ""].join(" ").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const navTabs = [
    { id: "dashboard",   emoji: "📊", short: "Dashboard" },
    { id: "commandes",   emoji: "📦", short: `Cmd (${enCours.length})` },
    { id: "assigner",    emoji: "👤", short: `Assign${nonAssigned.length > 0 ? ` (${nonAssigned.length})` : ""}` },
    { id: "commissions", emoji: "💰", short: "Commiss." },
    { id: "stocks",      emoji: "🗄️", short: "Stocks" },
  ];

  const myZone = profile?.zone_nom ? `${profile.zone_nom}` : null

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

      {/* Modal assignation */}
      {assignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>👤 Assigner un livreur</p>
            <p style={{ fontSize: 13, color: S.text2, marginBottom: 16 }}>{assignModal.customer_name} — {assignModal.city}</p>
            <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} style={{ ...inp, marginBottom: 16 }}>
              <option value="">Choisir un livreur</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{(d as any).is_available ? "🟢" : "🔴"} {d.full_name}</option>)}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => { setAssignModal(null); setSelectedDriver(""); }}
                style={{ padding: 12, background: S.border, border: "none", borderRadius: 10, color: S.text2, cursor: "pointer", fontSize: 13 }}>Annuler</button>
              <button onClick={handleAssignSubmit}
                style={{ padding: 12, background: `linear-gradient(135deg, ${S.gold}, ${S.goldDark})`, border: "none", borderRadius: 10, color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                ✅ Assigner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: S.card, borderBottom: `1px solid ${S.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: S.gold }}>{tenantName}</div>
          <div style={{ fontSize: 10, color: S.text3 }}>👩‍💼 Closeur(se) · {profile?.full_name}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {nonAssigned.length > 0 && (
            <button onClick={() => setTab("assigner")}
              style={{ padding: "6px 10px", background: S.warningBg, border: `1px solid ${S.warning}`, borderRadius: 20, color: S.warning, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              ⚡ {nonAssigned.length}
            </button>
          )}
          <ProfileMenu
            name={profile?.full_name || "Closureuse"}
            email={profile?.email}
            role="closureuse"
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Bannière nouvelle commande */}
      {newOrdersCount > 0 && (
        <div style={{ background: "linear-gradient(135deg, #1a1200, #2d1e00)", border: `1px solid ${S.gold}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: S.gold }}>
            🔔 {newOrdersCount} nouvelle(s) commande(s) arrivée(s) !
          </p>
          <button onClick={() => { setNewOrdersCount(0); setTab("commandes"); setStatusFilter("encours"); }}
            style={{ padding: "6px 14px", background: S.gold, border: "none", borderRadius: 20, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Voir →
          </button>
        </div>
      )}

      {/* Nav */}
      <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, background: S.card, overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
        {navTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            style={{ flex: 1, padding: "10px 8px", border: "none", borderBottom: tab === t.id ? `2px solid ${S.gold}` : "2px solid transparent", background: "transparent", color: tab === t.id ? S.gold : S.text2, fontWeight: tab === t.id ? 700 : 400, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2, minWidth: 52 }}>
            <span style={{ fontSize: 18 }}>{t.emoji}</span>
            <span>{t.short}</span>
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 14px 80px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            {/* Stats aujourd'hui */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
                <p style={{ fontSize: 11, color: S.text2, marginBottom: 6 }}>📝 Créées aujourd&apos;hui</p>
                <p style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>{todayCreated.length}</p>
              </div>
              <div style={{ background: S.successBg, border: `1px solid ${S.success}30`, borderRadius: 14, padding: 16, textAlign: "center" }}>
                <p style={{ fontSize: 11, color: S.text2, marginBottom: 6 }}>🎯 Livrées aujourd&apos;hui</p>
                <p style={{ fontSize: 36, fontWeight: 800, color: S.success, margin: 0 }}>{todayDelivered.length}</p>
              </div>
            </div>

            {/* Taux confirmation perso */}
            {(() => {
              const myOrders = orders.filter(o => o.closer_id === profile?.id);
              const myConfirmed = myOrders.filter(o => ["Confirmé","Livré","Assigné","En livraison"].includes(o.status ?? "")).length;
              const myRate = myOrders.length > 0 ? Math.round((myConfirmed / myOrders.length) * 100) : 0;
              const myCommissions = myOrders.filter(o => o.status === "Livré" && o.closer_commission).reduce((s, o) => s + Number(o.closer_commission || 0), 0);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 14 }}>
                    <p style={{ color: S.text2, fontSize: 11, margin: "0 0 6px 0" }}>📊 Mon taux confirmation</p>
                    <p style={{ color: myRate >= 70 ? S.success : myRate >= 50 ? S.warning : S.danger, fontSize: 26, fontWeight: 800, margin: "0 0 6px 0" }}>{myRate}%</p>
                    <div style={{ background: S.border, borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${myRate}%`, background: myRate >= 70 ? S.success : myRate >= 50 ? S.warning : S.danger, borderRadius: 4, height: "100%" }} />
                    </div>
                  </div>
                  <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                    <p style={{ color: S.text2, fontSize: 11, margin: "0 0 6px 0" }}>💰 Mes commissions</p>
                    <p style={{ color: S.gold, fontSize: 18, fontWeight: 800, margin: 0 }}>{fmt(myCommissions)}</p>
                    <p style={{ color: S.text3, fontSize: 10, margin: "4px 0 0 0" }}>{myOrders.length} commandes traitées</p>
                  </div>
                </div>
              );
            })()}

            {/* Livreurs disponibles en temps réel */}
            <p style={{ fontSize: 12, color: S.text2, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 8 }}>🚚 LIVREURS DISPONIBLES</p>
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
              {drivers.length === 0 ? (
                <p style={{ color: S.text3, fontSize: 13, textAlign: "center", margin: 0 }}>Aucun livreur enregistré</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...drivers].sort((a, b) => ((b as any).is_available ? 1 : 0) - ((a as any).is_available ? 1 : 0)).map(d => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: (d as any).is_available ? "rgba(37,211,102,0.06)" : "transparent", borderRadius: 10, border: `1px solid ${(d as any).is_available ? S.success + "30" : S.border}` }}>
                      <span style={{ fontSize: 18 }}>{(d as any).is_available ? "🟢" : "🔴"}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{d.full_name}</p>
                        <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>
                          {(d as any).is_available ? "Disponible" : "Indisponible"}
                          {(d as any).last_seen ? ` · vu ${new Date((d as any).last_seen).toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"})}` : ""}
                        </p>
                      </div>
                      {(d as any).is_available && <span style={{ color: S.success, fontSize: 11, fontWeight: 600 }}>✓ Disponible</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Total", value: orders.length, color: S.text },
                { label: "⚡ En cours", value: enCours.length, color: S.warning },
                { label: "✅ Confirmées", value: orders.filter(o => o.status === "Confirmé").length, color: S.info },
                { label: "🎯 Livrées", value: orders.filter(o => o.status === "Livré").length, color: S.success },
                { label: "🚌 Gare", value: orders.filter(o => o.logistic_status === "Envoyé à la gare").length, color: S.purple },
                { label: "💰 Payées", value: orders.filter(o => o.cash_collected).length, color: S.gold },
              ].map(s => (
                <div key={s.label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, textAlign: "center" }}>
                  <p style={{ fontSize: 11, color: S.text3, marginBottom: 6 }}>{s.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Stock par livreur */}
            <p style={{ fontSize: 11, color: S.text3, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>STOCK PAR LIVREUR</p>
            {drivers.length === 0 ? (
              <div style={{ background: S.card, borderRadius: 14, padding: 20, textAlign: "center", color: S.text3, fontSize: 13 }}>Aucun livreur</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                {drivers.map(d => {
                  const total = driverStocks.filter(s => s.driver_id === d.id).reduce((sum, s) => sum + s.quantity, 0);
                  return (
                    <div key={d.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, textAlign: "center" }}>
                      <p style={{ fontSize: 11, color: S.text2, marginBottom: 4 }}>{d.full_name}</p>
                      <p style={{ fontSize: 32, fontWeight: 800, color: total <= 3 ? S.danger : S.gold }}>{total}</p>
                      {total <= 3 && <p style={{ fontSize: 10, color: S.danger, marginTop: 2 }}>⚠️ Bas</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── COMMANDES ── */}
        {tab === "commandes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ fontSize: 16, fontWeight: 700 }}>📦 Commandes</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleRefresh} disabled={refreshing}
                  style={{ padding: "7px 12px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 20, color: S.text2, fontSize: 12, cursor: "pointer" }}>
                  {refreshing ? "..." : "🔄"}
                </button>
                <button onClick={() => setShowCreateForm(!showCreateForm)}
                  style={{ padding: "7px 14px", background: showCreateForm ? S.card : `linear-gradient(135deg, ${S.gold}, ${S.goldDark})`, border: `1px solid ${showCreateForm ? S.border : "transparent"}`, borderRadius: 20, color: showCreateForm ? S.text2 : "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {showCreateForm ? "✕ Fermer" : "+ Saisie manuelle"}
                </button>
              </div>
            </div>

            {/* Formulaire saisie manuelle */}
            {showCreateForm && (
              <div style={{ background: S.card, border: `1px solid ${S.gold}40`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: S.gold, marginBottom: 14 }}>📝 Saisie manuelle</p>
                <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  {[
                    { name: "customer_name", label: "Nom client", placeholder: "Ex: Kofi Mensah" },
                    { name: "phone", label: "Téléphone", placeholder: "Ex: 22890000000" },
                    { name: "city", label: "Ville", placeholder: "Ex: Lomé" },
                    { name: "address", label: "Adresse", placeholder: "Ex: Tokoin..." },
                    { name: "product", label: "Produit", placeholder: "Ex: THERAWOLF" },
                    { name: "amount", label: "Montant (FCFA)", placeholder: "25000" },
                    { name: "quantity", label: "Quantité", placeholder: "1" },
                  ].map(f => (
                    <div key={f.name}>
                      <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>{f.label}</label>
                      <input value={(createForm as Record<string, string>)[f.name]}
                        onChange={e => setCreateForm(p => ({ ...p, [f.name]: e.target.value }))}
                        placeholder={f.placeholder} required style={inp} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Livraison</label>
                    <select value={createForm.delivery_type} onChange={e => setCreateForm(p => ({ ...p, delivery_type: e.target.value }))} required style={inp}>
                      <option value="">Choisir...</option>
                      <option value="direct">🚚 Direct</option>
                      <option value="gare">🚌 Gare</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <button type="submit" disabled={createLoading}
                      style={{ width: "100%", padding: 14, background: `linear-gradient(135deg, ${S.gold}, ${S.goldDark})`, border: "none", borderRadius: 12, color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                      {createLoading ? "Création..." : "✅ Créer la commande"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filtres */}
            <input type="text" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 6, marginBottom: 14, background: S.card, borderRadius: 12, padding: 4 }}>
              <button onClick={() => setStatusFilter("encours")}
                style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, background: statusFilter === "encours" ? S.gold : "transparent", color: statusFilter === "encours" ? "#000" : S.text2 }}>
                ⚡ En cours ({enCours.length})
              </button>
              <button onClick={() => setStatusFilter("historique")}
                style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, background: statusFilter === "historique" ? S.gold : "transparent", color: statusFilter === "historique" ? "#000" : S.text2 }}>
                📋 Historique ({orders.filter(o => !isEnCours(o)).length})
              </button>
            </div>

            {/* Liste commandes */}
            {visibleOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", background: S.card, borderRadius: 16, color: S.text3 }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p><p>Aucune commande</p>
              </div>
            ) : visibleOrders.map(order => (
              <ClosureuseOrderCard key={order.id} order={order} onConfirm={handleConfirm} onCancel={handleCancel} onAssign={o => { setAssignModal(o); setSelectedDriver(o.assigned_driver_id || ""); }} />
            ))}
          </div>
        )}

        {/* ── ASSIGNER ── */}
        {tab === "assigner" && (
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>👤 Assigner les livreurs</p>
            <p style={{ fontSize: 13, color: S.text2, marginBottom: 16 }}>Commandes confirmées sans livreur assigné</p>
            {nonAssigned.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", background: S.card, borderRadius: 16, color: S.text3 }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🎉</p><p>Toutes les commandes sont assignées !</p>
              </div>
            ) : nonAssigned.map(order => (
              <div key={order.id} style={{ background: S.card, border: `1px solid ${S.gold}40`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{order.customer_name}</p>
                    <p style={{ fontSize: 12, color: S.text2 }}>📍 {order.city} · {order.delivery_type}</p>
                    <p style={{ fontSize: 12, color: S.text3 }}>📅 {fmtDate(order.created_at)}</p>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: S.gold }}>{fmt(order.amount)}</p>
                </div>
                <div style={{ background: "#0a0a0f", borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>
                  <p style={{ fontSize: 13 }}>{order.product} × {order.quantity || 1}</p>
                </div>
                <button onClick={() => { setAssignModal(order); setSelectedDriver(order.assigned_driver_id || ""); }}
                  style={{ width: "100%", padding: "11px 0", background: `linear-gradient(135deg, ${S.gold}, ${S.goldDark})`, border: "none", borderRadius: 10, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  👤 Assigner un livreur
                </button>
              </div>
            ))}

            {/* Toutes les commandes en cours avec livreur */}
            {enCours.filter(o => o.is_assigned).length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 12, color: S.text3, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>DÉJÀ ASSIGNÉES</p>
                {enCours.filter(o => o.is_assigned).map(order => (
                  <div key={order.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{order.customer_name}</p>
                      <p style={{ fontSize: 12, color: S.text2 }}>🚴 {order.driver_name}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: S.gold }}>{fmt(order.amount)}</p>
                      <button onClick={() => { setAssignModal(order); setSelectedDriver(order.assigned_driver_id || ""); }}
                        style={{ padding: "5px 10px", background: S.border, border: "none", borderRadius: 8, color: S.text2, fontSize: 11, cursor: "pointer" }}>
                        Changer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

            <div style={{ background: "linear-gradient(135deg, #1a1200, #2d1e00)", border: `1px solid ${S.gold}40`, borderRadius: 18, padding: 24, marginBottom: 20, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: S.text2, marginBottom: 8 }}>Mes commissions</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: S.gold }}>
                {filterByPeriod(myCommissions).reduce((s, o) => s + Number(o.closer_commission), 0).toLocaleString("fr-FR")} FCFA
              </p>
              <p style={{ fontSize: 13, color: S.text3, marginTop: 8 }}>
                {filterByPeriod(myCommissions).length} livraison(s) × 500 FCFA
              </p>
            </div>

            {filterByPeriod(myCommissions).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: S.card, borderRadius: 16, color: S.text3 }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>💰</p><p>Aucune commission sur cette période</p>
              </div>
            ) : filterByPeriod(myCommissions).map(order => (
              <div key={order.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{order.customer_name}</p>
                  <p style={{ fontSize: 11, color: S.text2 }}>{fmtDate(order.delivered_at)} · {order.driver_name}</p>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: S.gold }}>+{fmt(order.closer_commission)}</p>
              </div>
            ))}

            <div style={{ marginTop: 16, padding: 16, background: S.card, border: `1px solid ${S.border}`, borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: S.text2 }}>Total toutes périodes</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: S.gold }}>{totalMyCommission.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>
          </div>
        )}

        {/* ── STOCKS ── */}
        {tab === "stocks" && (
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📦 Stock par livreur</p>
            {drivers.map(d => {
              const items = driverStocks.filter(s => s.driver_id === d.id);
              const total = items.reduce((sum, s) => sum + s.quantity, 0);
              return (
                <div key={d.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>🚴 {d.full_name}</p>
                    <span style={{ fontSize: 18, fontWeight: 800, color: total <= 3 ? S.danger : S.gold }}>{total} unités</span>
                  </div>
                  {items.length === 0 ? (
                    <p style={{ fontSize: 12, color: S.text3 }}>Aucun stock</p>
                  ) : items.map(item => {
                    const isLow = item.quantity <= 3;
                    return (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a0f", borderRadius: 8, padding: "7px 10px", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: S.text2 }}>{item.product_name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: isLow ? S.dangerBg : S.successBg, color: isLow ? S.danger : S.success }}>
                          {item.quantity} {isLow ? "⚠️" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Carte commande closureuse ────────────────────────────────
function ClosureuseOrderCard({ order, onConfirm, onCancel, onAssign }: {
  order: Order;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
  onAssign: (order: Order) => void;
}) {
  const isEnAttente = order.status === "En attente";
  const isConfirme = order.status === "Confirmé";
  const isDone = order.status === "Livré" || order.status === "Annulé";

  return (
    <div style={{ background: S.card, border: `1px solid ${isEnAttente ? S.warning + "60" : isConfirme ? S.info + "40" : S.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
      {isEnAttente && <div style={{ height: 3, background: S.warning }} />}
      {isConfirme && <div style={{ height: 3, background: S.info }} />}

      <div style={{ padding: "12px 14px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{order.customer_name}</p>
          <p style={{ fontSize: 11, color: S.text3 }}>📍 {order.city} · {order.delivery_type || "direct"}</p>
          <p style={{ fontSize: 11, color: S.text2, marginTop: 2 }}>{order.address}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div style={{ margin: "0 12px 10px", background: "#0a0a0f", borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: S.text3, marginBottom: 2 }}>Montant</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: S.gold }}>{fmt(order.amount)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 13, fontWeight: 600 }}>{order.product} × {order.quantity || 1}</p>
          <p style={{ fontSize: 11, color: S.text3, marginTop: 2 }}>📅 {fmtDate(order.created_at)}</p>
        </div>
      </div>

      <div style={{ padding: "0 12px 8px" }}>
        <p style={{ fontSize: 12, color: S.text2 }}>📞 {order.phone}</p>
        {order.driver_name && <p style={{ fontSize: 12, color: S.info, marginTop: 2 }}>🚴 {order.driver_name}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 12px 8px" }}>
        <a href={callUrl(order.phone)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 0", background: S.infoBg, border: `1px solid ${S.info}30`, borderRadius: 10, color: S.info, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
          📞 Appeler
        </a>
        <a href={waUrl(order.phone, `Bonjour ${order.customer_name}, votre commande ${order.product} est confirmée. Livraison en cours.`)} target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 0", background: "#0a2e1a", border: "1px solid #25d36630", borderRadius: 10, color: "#25D366", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
          💬 WhatsApp
        </a>
      </div>

      {!isDone && (
        <div style={{ display: "grid", gridTemplateColumns: isEnAttente ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8, padding: "0 12px 12px" }}>
          {isEnAttente && (
            <button onClick={() => onConfirm(order.id)}
              style={{ padding: "10px 0", background: S.successBg, border: `1px solid ${S.success}40`, borderRadius: 10, color: S.success, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              ✅ Confirmer
            </button>
          )}
          <button onClick={() => onAssign(order)}
            style={{ padding: "10px 0", background: "#0c1e3e", border: `1px solid ${S.info}40`, borderRadius: 10, color: S.info, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            👤 {order.is_assigned ? "Changer" : "Assigner"}
          </button>
          <button onClick={() => onCancel(order.id)}
            style={{ padding: "10px 0", background: S.dangerBg, border: `1px solid ${S.danger}40`, borderRadius: 10, color: S.danger, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            ❌ Annuler
          </button>
        </div>
      )}
    </div>
  );
}
