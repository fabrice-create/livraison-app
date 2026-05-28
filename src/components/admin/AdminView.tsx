// components/admin/AdminView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import InstallPWA from "@/components/pwa/InstallPWA";
import OrderCard from "@/components/order/OrderCard";

// ─── Icônes SVG inline — zéro dépendance ────────────────
const IC = {
  dashboard:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  commandes:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  creer:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  stock:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  finances:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  commissions: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  produits:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  equipe:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  parametres:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
  zones:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  clients:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  widget:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  import:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
}
// ─────────────────────────────────────────────────────────
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import type { Order, Profile, DriverStock, OrderHistory, OrderFormData, StockFormData, Zone } from "@/types";
import ProduitsView from "@/components/admin/ProduitsView";
import NotificationBell from "@/components/ui/NotificationBell";
import ClientsView from "@/components/admin/ClientsView";
import ImportView from "@/components/admin/ImportView";
import EquipeView from "@/components/admin/EquipeView";
import ParametresView from "@/components/admin/ParametresView";
import ZonesView from "@/components/admin/ZonesView";
import WidgetView from "@/components/admin/WidgetView";
import FinancesView from "@/components/admin/FinancesView";
import DashboardView from "@/components/admin/DashboardView";
import StockView from "@/components/admin/StockView";
import { normalizeRole, normDT, isEnCours, isHistorique, isToday, fmt, fmtDate, filterByPeriod, type PeriodFilter, callUrl, waUrl, clientWaMsg, statusStyle, setCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast, confirm, ToastContainer } from "@/components/ui/Toast";
import ProfileMenu from "@/components/ui/ProfileMenu";

// ─── Design tokens ───────────────────────────────────────────
const S = {
  gold: "#F59E0B", goldDark: "#D97706", goldBg: "#1A1200", goldBorder: "#F59E0B30",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  success: "#4ADE80", successBg: "#052E16",
  info: "#60A5FA", infoBg: "#0C1E3E",
  danger: "#F87171", dangerBg: "#2D0F0F",
  warning: "#FB923C", warningBg: "#2D1500",
  purple: "#C084FC", purpleBg: "#2E1065",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  green: "#4ADE80", greenBg: "#052E16", greenBorder: "#4ADE8030",
  blue: "#60A5FA", blueBg: "#0C1A2E", blueBorder: "#60A5FA30",
  red: "#F87171", redBg: "#450A0A", redBorder: "#F8717130",
};

// ─── Composants UI partagés ──────────────────────────────────
function StatCard({ icon, label, value, color = S.text, bg = S.card, border = S.border, small = false }: {
  icon: React.ReactNode; label: string; value: string | number;
  color?: string; bg?: string; border?: string; small?: boolean;
}) {
  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ marginBottom: 8, color }}>{icon}</div>
      <div style={{ fontSize: small ? 14 : 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: S.text3, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: S.text3, marginBottom: 10, marginTop: 20 }}>
      {children}
    </div>
  );
}

function Badge({ status }: { status?: string | null }) {
  const { bg, color } = statusStyle(status);
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, backgroundColor: bg, color }}>
      {status || "En attente"}
    </span>
  );
}

// Map des icônes par id
const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard:   IC.dashboard,
  commandes:   IC.commandes,
  creer:       IC.creer,
  stock:       IC.stock,
  finances:    IC.finances,
  commissions: IC.commissions,
  produits:    IC.produits,
  equipe:      IC.equipe,
  parametres:  IC.parametres,
  zones:       IC.zones,
  clients:     IC.clients,
  widget:      IC.widget,
  import:      IC.import,
}

function NavBtn({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  // Extraire le texte sans emoji
  const text = label.replace(/[\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[⚡✅📋📦💼💰👥⚙️🌍🎛️📥➕🗄️📊]/gu, "").trim()
  const shortText = text.split(" ")[0]
  const icon = NAV_ICONS[id] || IC.dashboard

  return (
    <button onClick={onClick} style={{
      padding: "10px 12px", border: "none", cursor: "pointer",
      whiteSpace: "nowrap" as const, flexShrink: 0,
      backgroundColor: "transparent",
      color: active ? S.gold : S.text2,
      fontWeight: active ? 700 : 500,
      fontSize: 12,
      borderBottom: active ? `2px solid ${S.gold}` : "2px solid transparent",
      display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4,
      minWidth: 52,
      transition: "color 0.15s",
    }}>
      <span style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>{icon}</span>
      <span style={{ fontSize: 10, letterSpacing:"0.02em" }}>{shortText}</span>
    </button>
  )
}

function Input({ label, name, value, onChange, type = "text", placeholder = "" }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: S.text2, display: "block", marginBottom: 4 }}>{label}</label>
      <input name={name} value={value} onChange={onChange} type={type} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${S.border}`, backgroundColor: S.card2, color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const }} />
    </div>
  );
}

function Select({ label, name, value, onChange, options }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: S.text2, display: "block", marginBottom: 4 }}>{label}</label>
      <select name={name} value={value} onChange={onChange}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${S.border}`, backgroundColor: S.card2, color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const }}>
        <option value="">— Choisir —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// DashboardView: voir src/components/admin/DashboardView.tsx
// ─── Vue Commandes ───────────────────────────────────────────
function CommandesView({ orders, drivers, history, selectedDrivers, selectedActions, onDriverChange, onActionChange, onActionSubmit, onEditClick }: {
  orders: Order[]; drivers: Profile[]; history: OrderHistory[];
  selectedDrivers: Record<number, string>; selectedActions: Record<number, string>;
  onDriverChange: (id: number, v: string) => void;
  onActionChange: (id: number, v: string) => void;
  onActionSubmit: (o: Order) => void;
  onEditClick: (o: Order) => void;
}) {
  const [activeTab, setActiveTab] = useState("aujourd_hui");
  const [search, setSearch]       = useState("");
  const [driverFilter, setDriverFilter] = useState("Tous");
  const [produitFilter, setProduitFilter] = useState("tous");
  const [zoneFilter, setZoneFilter] = useState("toutes");

  const now      = new Date();
  const todayStr = now.toDateString();

  // Produits uniques pour le filtre
  const produitsUniques = Array.from(new Set(orders.map(o => o.product || "").filter(Boolean))).sort();
  // Zones uniques pour le filtre
  const zonesUniques = Array.from(new Set(orders.map(o => o.zone_nom || "").filter(Boolean))).sort();

  const filterFn = (o: Order) => {
    const matchDriver  = driverFilter === "Tous" || o.driver_name === driverFilter;
    const matchProduit = produitFilter === "tous" || (o.product || "").toLowerCase().includes(produitFilter.toLowerCase());
    const q = search.toLowerCase();
    const matchSearch  = !q || [o.customer_name, o.phone, o.city, o.driver_name || "", o.product || ""].join(" ").toLowerCase().includes(q);
    const matchZone = zoneFilter === "toutes" || (o.zone_nom || "") === zoneFilter;
    return matchDriver && matchProduit && matchSearch && matchZone;
  };

  const enCours    = orders.filter(isEnCours);
  const historique = orders.filter(isHistorique);

  const section1 = enCours.filter(o => new Date(o.created_at || "").toDateString() === todayStr && o.status === "En attente").filter(filterFn);
  const section2 = enCours.filter(o => { const h = (now.getTime() - new Date(o.created_at || "").getTime()) / 3600000; return h > 24 && o.status === "En attente"; }).filter(filterFn);
  const section3 = enCours.filter(o => o.status === "Confirmé").filter(filterFn);
  const section4 = historique.filter(filterFn);

  const visible = activeTab === "aujourd_hui" ? section1
    : activeTab === "retard"   ? section2
    : activeTab === "confirme" ? section3
    : section4;

  const TABS = [
    { id: "aujourd_hui", label: "Aujourd'hui", count: section1.length, color: S.gold,   bg: "#1a1200" },
    { id: "retard",      label: "En retard",   count: section2.length, color: S.danger, bg: "#2D0F0F" },
    { id: "confirme",    label: "Confirmées",   count: section3.length, color: S.info,   bg: "#0C1E3E" },
    { id: "historique",  label: "Historique",   count: section4.length, color: S.text2,  bg: S.card },
  ];

  return (
    <div>
      {/* Barre de recherche */}
      <input type="text" placeholder="🔍 Recherche nom, ville, produit..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 14px", color:"#F8F8FC", fontSize:13, outline:"none", marginBottom:10, boxSizing:"border-box" as const }} />

      {/* Filtre par produit */}
      {produitsUniques.length >= 1 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const, marginBottom:14 }}>
          <button onClick={() => setProduitFilter("tous")}
            style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${produitFilter==="tous"?S.gold:"rgba(255,255,255,0.1)"}`, background:produitFilter==="tous"?"rgba(245,158,11,0.12)":"transparent", color:produitFilter==="tous"?S.gold:"#9898B0", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            Tous ({orders.length})
          </button>
          {produitsUniques.map(p => {
            const count = orders.filter(o => (o.product||"").toLowerCase().includes(p.toLowerCase())).length;
            return (
              <button key={p} onClick={() => setProduitFilter(p)}
                style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${produitFilter===p?S.gold:"rgba(255,255,255,0.1)"}`, background:produitFilter===p?"rgba(245,158,11,0.12)":"transparent", color:produitFilter===p?S.gold:"#9898B0", fontSize:12, fontWeight:600, cursor:"pointer", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                {p} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Filtre par zone */}
      {zonesUniques.length >= 2 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const, marginBottom:14 }}>
          <button onClick={() => setZoneFilter("toutes")}
            style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${zoneFilter==="toutes"?"#F59E0B":"rgba(255,255,255,0.1)"}`, background:zoneFilter==="toutes"?"rgba(245,158,11,0.1)":"transparent", color:zoneFilter==="toutes"?"#F59E0B":"#9898B0", fontSize:12, cursor:"pointer", fontWeight:zoneFilter==="toutes"?700:400 }}>
            🌍 Toutes zones ({orders.length})
          </button>
          {zonesUniques.map(z => {
            const count = orders.filter(o => o.zone_nom === z).length;
            return (
              <button key={z} onClick={() => setZoneFilter(z)}
                style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${zoneFilter===z?"#F59E0B":"rgba(255,255,255,0.1)"}`, background:zoneFilter===z?"rgba(245,158,11,0.1)":"transparent", color:zoneFilter===z?"#F59E0B":"#9898B0", fontSize:12, cursor:"pointer", fontWeight:zoneFilter===z?700:400 }}>
                {z} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* 4 onglets */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: "9px 16px", border: `1px solid ${activeTab === tab.id ? tab.color : "#2a2a3e"}`,
              borderRadius: 20, cursor: "pointer", fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 400,
              whiteSpace: "nowrap", flexShrink: 0,
              background: activeTab === tab.id ? tab.bg : "#111118",
              color: activeTab === tab.id ? tab.color : "#6b7280" }}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{ marginLeft: 6, background: activeTab === tab.id ? tab.color : "#2a2a3e",
                color: activeTab === tab.id ? "#000" : "#9ca3af",
                padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste commandes */}
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>{visible.length} commande(s)</p>
      {visible.length === 0 ? (
        <p style={{ textAlign:"center", color:"#6b7280", padding:32 }}>Aucune commande</p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {visible.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              drivers={drivers}
              actions={[
                { value:"", label:"Choisir une action..." },
                ...(order.status==="En attente"?[{value:"confirmer",label:"✅ Confirmer"}]:[]),
                ...(order.status==="Confirmé"?[{value:"assigner",label:"👤 Assigner livreur"},{value:"livre_paye",label:"🎯 Livré + Payé"}]:[]),
                {value:"annuler",label:"❌ Annuler"},
              ]}
              selectedDriver={selectedDrivers[order.id] || ""}
              selectedAction={selectedActions[order.id] || ""}
              onDriverChange={v => onDriverChange(order.id, v)}
              onActionChange={v => onActionChange(order.id, v)}
              onActionSubmit={() => onActionSubmit(order)}
              onEditClick={() => onEditClick(order)}
              history={history.filter(h => h.order_id === order.id)}
              showActions={true}
              showEditButton={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vue Commissions ─────────────────────────────────────────
function CommissionsView({ orders, closers }: { orders: Order[]; closers: Profile[] }) {
  const [period, setPeriod] = useState<PeriodFilter>("mois");
  const isMobile = useIsMobile();

  const stats = useMemo(() => {
    const filtered = filterByPeriod(orders, period);
    const byDriver: Record<string, { name: string; total: number; count: number }> = {};
    filtered.filter(o => o.driver_commission && o.driver_commission > 0).forEach(o => {
      const k = o.assigned_driver_id || "inconnu";
      if (!byDriver[k]) byDriver[k] = { name: o.driver_name || "Inconnu", total: 0, count: 0 };
      byDriver[k].total += Number(o.driver_commission);
      byDriver[k].count += 1;
    });
    const byCloser: Record<string, { name: string; total: number; count: number }> = {};
    filtered.filter(o => o.closer_id && o.closer_commission && o.closer_commission > 0).forEach(o => {
      const k = o.closer_id || "inconnu";
      const name = closers.find(c => c.id === k)?.full_name || o.closer_name || "Closureuse";
      if (!byCloser[k]) byCloser[k] = { name, total: 0, count: 0 };
      byCloser[k].total += Number(o.closer_commission);
      byCloser[k].count += 1;
    });
    return {
      byDriver, byCloser,
      totalDriver: Object.values(byDriver).reduce((s, v) => s + v.total, 0),
      totalCloser: Object.values(byCloser).reduce((s, v) => s + v.total, 0),
    };
  }, [orders, closers, period]);

  const periods: { value: PeriodFilter; label: string }[] = [
    { value: "today", label: "Aujourd'hui" },
    { value: "semaine", label: "Semaine" },
    { value: "mois", label: "Ce mois" },
  ];

  return (
    <div>
      {/* Filtre période */}
      <div style={{ display: "flex", gap: 4, backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 4, marginBottom: 16, maxWidth: 320 }}>
        {periods.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)} style={{
            flex: 1, padding: "7px 0", borderRadius: 9, fontSize: 12, fontWeight: 600,
            border: "none", cursor: "pointer",
            backgroundColor: period === p.value ? S.gold : "transparent",
            color: period === p.value ? "#000" : S.text2,
          }}>{p.label}</button>
        ))}
      </div>

      {/* Totaux */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>} label="Total livreurs" value={fmt(stats.totalDriver)} color={S.info} small />
        <StatCard icon={<span>👩</span>} label="Total closeurs"  value={fmt(stats.totalCloser)} color={S.purple} small />
      </div>

      {/* Détail livreurs */}
      <SectionTitle>Par livreur</SectionTitle>
      {Object.values(stats.byDriver).length === 0 ? (
        <div style={{ color: S.text3, fontSize: 13, padding: "12px 0" }}>Aucune commission sur cette période</div>
      ) : (
        Object.values(stats.byDriver).sort((a, b) => b.total - a.total).map(d => (
          <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>🛵 {d.name}</div>
              <div style={{ fontSize: 11, color: S.text3 }}>{d.count} livraison{d.count > 1 ? "s" : ""}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: S.info }}>{fmt(d.total)}</div>
          </div>
        ))
      )}

      {/* Détail closeurs */}
      <SectionTitle>Par closureuse</SectionTitle>
      {Object.values(stats.byCloser).length === 0 ? (
        <div style={{ color: S.text3, fontSize: 13, padding: "12px 0" }}>Aucune commission sur cette période</div>
      ) : (
        Object.values(stats.byCloser).sort((a, b) => b.total - a.total).map(c => (
          <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>👩 {c.name}</div>
              <div style={{ fontSize: 11, color: S.text3 }}>{c.count} commande{c.count > 1 ? "s" : ""}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: S.purple }}>{fmt(c.total)}</div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Types Phase 4 ───────────────────────────────────────────
type WarehouseStock = { id: string; tenant_id: string; product_name: string; quantity: number; alert_threshold: number; created_at?: string; updated_at?: string; };
type StockMouvement = { id: number; created_at: string; product_name: string; type: string; quantity: number; from_driver: string; to_driver: string; note?: string | null; created_by?: string | null; };
type StockDemande = { id: number; created_at: string; driver_id: string; driver_name: string; product_name: string; quantity_requested: number; status: string; note?: string | null; };

// StockView: voir src/components/admin/StockView.tsx
// ─── Vue Créer commande ──────────────────────────────────────
function CreerView({ form, loading, onChange, onSubmit }: {
  form: OrderFormData; loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const isMobile = useIsMobile();
  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: S.text, marginBottom: 16 }}>➕ Nouvelle commande</div>
        <form onSubmit={onSubmit}>
          <Input label="Client" name="customer_name" value={form.customer_name} onChange={onChange as any} placeholder="Nom complet" />
          <Input label="Téléphone" name="phone" value={form.phone} onChange={onChange as any} type="tel" placeholder="+228..." />
          <Input label="Ville" name="city" value={form.city} onChange={onChange as any} placeholder="Lomé, Sokodé..." />
          <Input label="Adresse" name="address" value={form.address} onChange={onChange as any} placeholder="Quartier, rue..." />
          <Input label="Produit" name="product" value={form.product} onChange={onChange as any} placeholder="Nom du produit" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <Input label="Quantité" name="quantity" value={form.quantity} onChange={onChange as any} type="number" placeholder="1" />
            <Input label="Montant (FCFA)" name="amount" value={form.amount} onChange={onChange as any} type="number" placeholder="0" />
          </div>
          <Select label="Type de livraison" name="delivery_type" value={form.delivery_type} onChange={onChange as any}
            options={[{ value: "direct", label: "Direct" }, { value: "gare", label: "Gare" }]} />
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
            backgroundColor: S.gold, color: "#000", border: "none", cursor: "pointer", marginTop: 8,
          }}>{loading ? "Création..." : "Créer la commande"}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Confirmation ──────────────────────────────────────
function ConfirmModal({ title, message, danger, confirmLabel, onConfirm, onCancel }: {
  title: string; message: string; danger?: boolean;
  confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 24, maxWidth: 400, width: "100%" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: S.text, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: S.text2, marginBottom: 20 }}>{message}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: 600, border: `1px solid ${S.border}`, color: S.text2, backgroundColor: "transparent", cursor: "pointer" }}>Annuler</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: 700, border: "none", backgroundColor: danger ? S.danger : S.gold, color: danger ? "#fff" : "#000", cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Edit ──────────────────────────────────────────────
function EditModal({ form, onClose, onSubmit, onChange }: {
  form: OrderFormData; onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 20, maxWidth: 440, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: S.text }}>✏️ Modifier la commande</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: S.text3, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          <Input label="Client" name="customer_name" value={form.customer_name} onChange={onChange as any} />
          <Input label="Téléphone" name="phone" value={form.phone} onChange={onChange as any} />
          <Input label="Ville" name="city" value={form.city} onChange={onChange as any} />
          <Input label="Adresse" name="address" value={form.address} onChange={onChange as any} />
          <Input label="Produit" name="product" value={form.product} onChange={onChange as any} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Quantité" name="quantity" value={form.quantity} onChange={onChange as any} type="number" />
            <Input label="Montant" name="amount" value={form.amount} onChange={onChange as any} type="number" />
          </div>
          <Select label="Type livraison" name="delivery_type" value={form.delivery_type} onChange={onChange as any}
            options={[{ value: "direct", label: "Direct" }, { value: "gare", label: "Gare" }]} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: 600, border: `1px solid ${S.border}`, color: S.text2, backgroundColor: "transparent", cursor: "pointer" }}>Annuler</button>
            <button type="submit" style={{ flex: 1, padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: 700, border: "none", backgroundColor: S.gold, color: "#000", cursor: "pointer" }}>Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── AdminView principal ─────────────────────────────────────
const EMPTY_FORM: OrderFormData = { customer_name: "", phone: "", city: "", address: "", product: "", quantity: "1", amount: "", delivery_type: "" };
const EMPTY_STOCK: StockFormData = { driver_id: "", product_name: "", quantity: "1" };

export function AdminView() {
  const router = useRouter();
  const [orders, setOrders]             = useState<Order[]>([]);
  const [drivers, setDrivers]           = useState<Profile[]>([]);
  const [closers, setClosers]           = useState<Profile[]>([]);
  const [driverStocks, setDriverStocks] = useState<DriverStock[]>([]);
  const [history, setHistory]           = useState<OrderHistory[]>([]);
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [tenantId, setTenantId]         = useState<string>("");
  const [zones, setZones]               = useState<Zone[]>([]);
  const [tenantSlug, setTenantSlug]     = useState<string>("");
  const [commissionRules, setCommissionRules] = useState({ driver: 2000, closer: 500 });
  const [authLoading, setAuthLoading]   = useState(true);
  const [loading, setLoading]           = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [activeView, setActiveView]     = useState("dashboard");
  const [form, setForm]                 = useState<OrderFormData>(EMPTY_FORM);
  const [stockForm, setStockForm]       = useState<StockFormData>(EMPTY_STOCK);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<number, string>>({});
  const [selectedActions, setSelectedActions] = useState<Record<number, string>>({});
  const [confirmAction, setConfirmAction]     = useState<{ order: Order; action: string } | null>(null);
  const [editingOrder, setEditingOrder]       = useState<Order | null>(null);
  const [editForm, setEditForm]               = useState<OrderFormData>(EMPTY_FORM);
  const [tenantName, setTenantName]           = useState<string>("Shipivo");

  const enCoursCount = useMemo(() => orders.filter(isEnCours).length, [orders]);

  useEffect(() => { void initPage(); }, []);

  const initPage = async () => {
    setAuthLoading(true);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { router.replace("/login"); return; }

    const { data: pd } = await supabase.from("profiles")
      .select("*").eq("id", user.id).single();
    if (!pd) { router.replace("/login"); return; }

    const p = pd as Profile;
    const role = normalizeRole(p.role);
    if (role !== "admin" && role !== "manager" && role !== "super_admin") {
      router.replace(role === "closureuse" ? "/closureuse" : role === "livreur" ? "/livreur" : "/login");
      return;
    }

    setProfile(p);
    const tid = (p as any).tenant_id || "";
    setTenantId(tid)
    const { data: td } = await supabase.from("tenants").select("slug").eq("id", tid).single()
    if (td) setTenantSlug(td.slug || "");

    // Tout en parallèle — beaucoup plus rapide
    const [tenantRes, profilesRes, ordersRes, stockRes, zonesRes, warehouseRes] = await Promise.all([
      tid ? supabase.from("tenants")
        .select("driver_commission, closer_commission, currency, name")
        .eq("id", tid).single()
        : Promise.resolve({ data: null }),
      tid ? supabase.from("profiles")
        .select("id, full_name, role, is_active, is_available, last_seen, tenant_id")
        .eq("tenant_id", tid).eq("is_active", true).order("full_name")
        : Promise.resolve({ data: [] }),
      tid ? supabase.from("orders")
        .select("id, customer_name, phone, city, address, product, quantity, amount, status, logistic_status, driver_name, closer_name, closer_id, assigned_driver_id, cash_collected, source, created_at, confirmed_at, delivered_at, cancelled_at, driver_commission, closer_commission, note, tenant_id, payment_status")
        .eq("tenant_id", tid).order("id", { ascending: false }).limit(500)
        : Promise.resolve({ data: [] }),
      tid ? supabase.from("driver_stock")
        .select("id, driver_id, driver_name, product_name, quantity")
        .eq("tenant_id", tid)
        : Promise.resolve({ data: [] }),
      tid ? supabase.from("zones").select("*").eq("tenant_id", tid).eq("is_active", true)
        : Promise.resolve({ data: [] }),
      tid ? supabase.from("warehouse_stock").select("*").eq("tenant_id", tid).order("product_name")
        : Promise.resolve({ data: [] }),
    ]);

    if (tenantRes.data) {
      const td = tenantRes.data as any;
      if (td.name) setTenantName(td.name);
      setCommissionRules({ driver: td.driver_commission || 2000, closer: td.closer_commission || 500 });
      if (td.currency) setCurrency(td.currency);
    }

    const allProfiles = (profilesRes.data || []) as Profile[];
    setDrivers(allProfiles.filter(pr => ["livreur","Livreur","LIVREUR","driver"].includes((pr.role||"").trim())));
    setClosers(allProfiles.filter(pr => ["closureuse","Closureuse","CLOSUREUSE","closer"].includes((pr.role||"").trim())));
    setOrders((ordersRes.data || []) as Order[]);
    setDriverStocks((stockRes.data || []) as DriverStock[]);
    if (zonesRes?.data) setZones(zonesRes.data as Zone[]);
    setWarehouseStocks((warehouseRes?.data || []) as WarehouseStock[]);
    setAuthLoading(false);
  };

  const addHistory = async (orderId: number, actionType: string, details: string) => {
    if (!profile) return;
    const { data } = await supabase.from("order_history").insert([{ order_id: orderId, action_type: actionType, action_by_user_id: profile.id, action_by_name: profile.full_name, action_details: details }]).select();
    if (data) setHistory(prev => [...(data as OrderHistory[]), ...prev]);
  };

  const updateStatus = async (id: number, newStatus: string) => {
    const extra: Record<string, string | null> = {};
    if (newStatus === "Confirmé") extra.confirmed_at = new Date().toISOString();
    if (newStatus === "Annulé")   extra.cancelled_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update({ status: newStatus, ...extra }).eq("id", id);
    if (error) { toast("Erreur : " + error.message, "error"); return false; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, ...extra } : o));
    await addHistory(id, "statut_modifie", `Statut → ${newStatus}`);
    return true;
  };

  const consumeStock = async (order: Order) => {
    const item = driverStocks.find(i => i.driver_id === order.assigned_driver_id && i.product_name.trim().toLowerCase() === (order.product || "").trim().toLowerCase());
    if (!item) { toast("Aucun stock trouvé.", "error"); return false; }
    const qty = Number(order.quantity || 1);
    if (Number(item.quantity) < qty) { toast("Stock insuffisant.", "error"); return false; }
    const newQty = Number(item.quantity) - qty;
    const { error } = await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", item.id);
    if (error) { toast("Erreur stock : " + error.message, "error"); return false; }
    setDriverStocks(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
    return true;
  };

  const markDelivered = async (order: Order, isGare = false) => {
    const ok = await consumeStock(order);
    if (!ok) return false;
    const now = new Date().toISOString();
    // Commission closureuse seulement si la commande a été confirmée par une closureuse
    const closerComm = order.closer_id ? commissionRules.closer : 0;
    const payload = {
      status: "Livré", logistic_status: isGare ? "Envoyé à la gare" : "Livré",
      payment_status: "Payé", cash_collected: true, cash_collected_at: now,
      cash_collected_by: profile?.full_name || null,
      driver_commission: commissionRules.driver, closer_commission: closerComm, commission_calculated: true, delivered_at: now,
    };
    const { error } = await supabase.from("orders").update(payload).eq("id", order.id);
    if (error) { toast("Erreur : " + error.message, "error"); return false; }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...payload } : o));
    await addHistory(order.id, isGare ? "envoye_gare" : "livraison_payee", isGare ? "Gare — commissions enregistrées" : "Livré + Payé — commissions enregistrées");
    return true;
  };

  const assignDriver = async (orderId: number) => {
    const driverId = selectedDrivers[orderId];
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) { toast("Livreur introuvable.", "error"); return false; }
    const payload = { driver_name: driver.full_name, assigned_driver_id: driver.id, is_assigned: true, assigned_at: new Date().toISOString() };
    const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
    if (error) { toast("Erreur : " + error.message, "error"); return false; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payload } : o));
    await addHistory(orderId, "livreur_assigne", `Livreur : ${driver.full_name}`);
    return true;
  };

  const executeAction = async (order: Order, action: string) => {
    setConfirmAction(null);
    if (action === "confirmer")  { const ok = await updateStatus(order.id, "Confirmé"); if (ok) toast("Confirmée ✅", "success"); }
    if (action === "livre_paye") { const ok = await markDelivered(order, false); if (ok) toast("Livrée et payée ✅ — Commissions enregistrées !", "success"); }
    if (action === "gare")       { const ok = await markDelivered(order, true);  if (ok) toast("Envoyée à la gare ✅ — Commissions enregistrées !", "success"); }
    if (action === "annuler")    { const ok = await updateStatus(order.id, "Annulé"); if (ok) toast("Annulée ✅", "success"); }
    if (action === "assigner")   { const ok = await assignDriver(order.id); if (ok) toast("Livreur assigné ✅", "success"); }
    setSelectedActions(prev => ({ ...prev, [order.id]: "" }));
  };

  const handleActionSubmit = (order: Order) => {
    const action = selectedActions[order.id];
    if (!action) { toast("Choisis une action.", "error"); return; }
    if (["livre_paye", "annuler", "gare"].includes(action)) setConfirmAction({ order, action });
    else void executeAction(order, action);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.from("orders").insert([{
      ...form, quantity: Number(form.quantity), delivery_type: normDT(form.delivery_type), amount: Number(form.amount),
      tenant_id: tenantId,
      cash_collected: false, status: "En attente", logistic_status: "En attente", payment_status: "Non payé",
      is_assigned: false, closer_id: profile?.id || null, closer_name: profile?.full_name || null,
      closer_commission: 0, driver_commission: 0, commission_calculated: false,
    }]).select();
    if (error) toast("Erreur : " + error.message, "error");
    else if (data) {
      const newOrders = data as Order[];
      setOrders([...newOrders, ...orders]);
      if (newOrders[0]) await addHistory(newOrders[0].id, "commande_creee", `Créée pour ${newOrders[0].customer_name}`);
      setForm(EMPTY_FORM);
      toast("Commande créée ✅", "success");
    }
    setLoading(false);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOrder) return;
    const payload = { ...editForm, quantity: Number(editForm.quantity), amount: Number(editForm.amount), delivery_type: normDT(editForm.delivery_type) };
    const { error } = await supabase.from("orders").update(payload).eq("id", editingOrder.id);
    if (error) { toast("Erreur : " + error.message, "error"); return; }
    setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, ...payload } : o));
    await addHistory(editingOrder.id, "commande_modifiee", `Modifiée par ${profile?.full_name}`);
    setEditingOrder(null);
    toast("Commande modifiée ✅", "success");
  };

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setStockForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleAddStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setStockLoading(true);
    const driver = drivers.find(d => d.id === stockForm.driver_id);
    if (!driver) { toast("Choisis un livreur.", "error"); setStockLoading(false); return; }
    const productName = stockForm.product_name.trim(); const qty = Number(stockForm.quantity);
    const existing = driverStocks.find(i => i.driver_id === driver.id && i.product_name.trim().toLowerCase() === productName.toLowerCase());
    if (existing) {
      const newQty = Number(existing.quantity) + qty;
      await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", existing.id);
      setDriverStocks(prev => prev.map(i => i.id === existing.id ? { ...i, quantity: newQty } : i));
    } else {
      const { data } = await supabase.from("driver_stock").insert([{ driver_id: driver.id, driver_name: driver.full_name, product_name: productName, quantity: qty }]).select();
      if (data) setDriverStocks([...(data as DriverStock[]), ...driverStocks]);
    }
    setStockForm(EMPTY_STOCK); toast("Stock ajouté ✅", "success"); setStockLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  if (authLoading) return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: S.text2 }}>Chargement...</div>
    </div>
  );

  const isManager = normalizeRole(profile?.role) === "manager";
  const allNavItems = [
    { id: "dashboard",   label: "📊 Dashboard" },
    { id: "commandes",   label: `📦 Commandes (${enCoursCount})` },
    { id: "creer",       label: "➕ Créer" },
    { id: "stock",       label: "🗄️ Stock" },
    { id: "finances",    label: "💼 Finances" },
    { id: "commissions", label: "💰 Commissions" },
    { id: "produits",    label: "📦 Produits" },
    { id: "equipe",      label: "👥 Équipe" },
    { id: "parametres",  label: "⚙️ Paramètres" },
    { id: "zones",       label: "🌍 Zones" },
    { id: "clients",     label: "👥 Clients" },
    { id: "widget",      label: "🎛️ Widget" },
    { id: "import",      label: "📥 Import" },
  ];
  // Manager voit seulement : Dashboard, Commandes, Créer, Stock
  const managerAllowed = ["dashboard", "commandes", "creer", "stock", "finances"];
  const navItems = isManager ? allNavItems.filter(n => managerAllowed.includes(n.id)) : allNavItems;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg, color: S.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <ToastContainer />

      {/* Modals */}
      {editingOrder && <EditModal form={editForm} onClose={() => setEditingOrder(null)} onSubmit={handleEditSubmit} onChange={e => setEditForm(f => ({ ...f, [e.target.name]: e.target.value }))} />}
      <InstallPWA />
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.action === "livre_paye" ? "🎯 Confirmer la livraison ?" : confirmAction.action === "gare" ? "🚌 Envoi à la gare ?" : "❌ Annuler la commande ?"}
          message={`Commande de ${confirmAction.order.customer_name} — action irréversible.`}
          danger={confirmAction.action === "annuler"}
          confirmLabel={confirmAction.action === "annuler" ? "Oui, annuler" : "Confirmer"}
          onConfirm={() => void executeAction(confirmAction.order, confirmAction.action)}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: S.bg, borderBottom: `1px solid ${S.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: S.gold }}>{tenantName}</div>
          <div style={{ fontSize: 10, color: S.text3 }}>{isManager ? "Manager" : "Admin"} · {profile?.full_name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {tenantId && <NotificationBell tenantId={tenantId} />}
          <ProfileMenu
            name={profile?.full_name || "Admin"}
            email={profile?.email}
            role={isManager ? "manager" : "admin"}
            onLogout={handleLogout}
            onSettings={() => setActiveView("parametres")}
          />
        </div>
      </div>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${S.border}`, backgroundColor: S.card, display: "flex", overflowX: "auto" as const, scrollbarWidth: "none" as const, WebkitOverflowScrolling: "touch" as unknown as undefined }}>
        {navItems.map(n => <NavBtn key={n.id} id={n.id} label={n.label} active={activeView === n.id} onClick={() => setActiveView(n.id)} />)}
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 14px 80px" }}>
        {activeView === "dashboard"   && <DashboardView orders={orders} driverStocks={driverStocks} />}
        {activeView === "commandes"   && <CommandesView orders={orders} drivers={drivers} history={history} selectedDrivers={selectedDrivers} selectedActions={selectedActions} onDriverChange={(id, v) => setSelectedDrivers(p => ({ ...p, [id]: v }))} onActionChange={(id, v) => setSelectedActions(p => ({ ...p, [id]: v }))} onActionSubmit={handleActionSubmit} onEditClick={o => { setEditingOrder(o); setEditForm({ customer_name: o.customer_name, phone: o.phone, city: o.city, address: o.address, product: o.product, quantity: String(o.quantity || 1), amount: String(o.amount || ""), delivery_type: o.delivery_type }); }} />}
        {activeView === "creer"       && <CreerView form={form} loading={loading} onChange={e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))} onSubmit={handleSubmit} />}
        {activeView === "stock"       && <StockView drivers={drivers} driverStocks={driverStocks} warehouseStocks={warehouseStocks} stockForm={stockForm} stockLoading={stockLoading} tenantId={tenantId} onStockChange={handleStockChange} onStockSubmit={handleAddStock} onRefresh={() => { void supabase.from("driver_stock").select("*").eq("tenant_id", tenantId).then(({data}) => { if(data) setDriverStocks(data as DriverStock[]) }); void supabase.from("warehouse_stock").select("*").eq("tenant_id", tenantId).then(({data}) => { if(data) setWarehouseStocks(data as WarehouseStock[]) }) }} />}
        {activeView === "finances"    && <FinancesView orders={orders} drivers={drivers} closers={closers} profile={profile} tenantId={tenantId || ""} />}
        {activeView === "commissions" && <CommissionsView orders={orders} closers={closers} />}
        {activeView === "produits"    && tenantId && <ProduitsView tenantId={tenantId} tenantSlug={tenantSlug} />}
        {activeView === "equipe"      && tenantId && <EquipeView tenantId={tenantId} />}
        {activeView === "parametres"  && tenantId && <ParametresView tenantId={tenantId} />}
          {activeView === "zones"        && tenantId && <ZonesView tenantId={tenantId} tenantSlug={tenantSlug} />}
        {activeView === "clients"     && tenantId && <ClientsView tenantId={tenantId} />}
        {activeView === "widget"      && tenantId && <WidgetView tenantId={tenantId} tenantSlug={tenantSlug} />}
        {activeView === "import"      && tenantId && <ImportView tenantId={tenantId} />}
      </div>
    </div>
  );
}
