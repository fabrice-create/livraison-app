// components/admin/AdminView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import type { Order, Profile, DriverStock, OrderHistory, OrderFormData, StockFormData } from "@/types";
import ProduitsView from "@/components/admin/ProduitsView";
import NotificationBell from "@/components/ui/NotificationBell";
import ClientsView from "@/components/admin/ClientsView";
import ImportView from "@/components/admin/ImportView";
import EquipeView from "@/components/admin/EquipeView";
import ParametresView from "@/components/admin/ParametresView";
import FinancesView from "@/components/admin/FinancesView";
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
  icon: string; label: string; value: string | number;
  color?: string; bg?: string; border?: string; small?: boolean;
}) {
  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
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

function NavBtn({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  // Extraire emoji + texte court pour mobile
  const parts = label.split(" ");
  const emoji = parts[0];
  const text = parts.slice(1).join(" ");
  return (
    <button onClick={onClick} style={{
      padding: "10px 12px", border: "none", cursor: "pointer",
      whiteSpace: "nowrap" as const, flexShrink: 0,
      backgroundColor: "transparent",
      color: active ? S.gold : S.text2,
      fontWeight: active ? 700 : 500,
      fontSize: 12,
      borderBottom: active ? `2px solid ${S.gold}` : "2px solid transparent",
      display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2,
      minWidth: 52,
    }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ fontSize: 10 }}>{text.split(" ")[0]}</span>
    </button>
  );
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

// ─── Vue Dashboard — Phase 10 Analytics Pro ──────────────────
function DashboardView({ orders, driverStocks }: { orders: Order[]; driverStocks: DriverStock[] }) {
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [chartMetric, setChartMetric] = useState<"total" | "livrees" | "ca">("total");

  function inPeriod(dateStr: string | null | undefined, p: string): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    if (p === "today") return d.toDateString() === now.toDateString();
    if (p === "7d") return d >= new Date(now.getTime() - 7 * 86400000);
    if (p === "30d") return d >= new Date(now.getTime() - 30 * 86400000);
    return true;
  }

  const periodOrders = useMemo(() =>
    orders.filter(o => inPeriod(o.created_at, period)),
    [orders, period]
  );

  const today = useMemo(() => ({
    created:   orders.filter(o => isToday(o.created_at)).length,
    delivered: orders.filter(o => isToday(o.delivered_at)).length,
    amount:    orders.filter(o => isToday(o.delivered_at) && o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0),
  }), [orders]);

  const stats = useMemo(() => {
    const total = periodOrders.length;
    const confirmed = periodOrders.filter(o => ["Confirmé","Assigné","En livraison","Livré"].includes(o.status ?? "")).length;
    const delivered = periodOrders.filter(o => (o.status ?? "") === "Livré").length;
    const cancelled = periodOrders.filter(o => (o.status ?? "") === "Annulé").length;
    const ca = periodOrders.filter(o => o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0);
    const pending = periodOrders.filter(o => !o.cash_collected && isEnCours(o)).reduce((s, o) => s + Number(o.amount || 0), 0);
    const confirmRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    const deliveryRate = confirmed > 0 ? Math.round((delivered / confirmed) * 100) : 0;
    return { total, confirmed, delivered, cancelled, ca, pending, confirmRate, deliveryRate };
  }, [periodOrders]);

  // Graphique 7 jours
  const chartData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      const dayOrders = orders.filter(o => o.created_at && new Date(o.created_at).toDateString() === ds);
      const livrees = orders.filter(o => o.delivered_at && new Date(o.delivered_at).toDateString() === ds);
      const ca = livrees.filter(o => o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0);
      days.push({ label, total: dayOrders.length, livrees: livrees.length, ca });
    }
    return days;
  }, [orders]);

  const chartMax = useMemo(() => {
    const vals = chartData.map(d => chartMetric === "ca" ? d.ca : chartMetric === "livrees" ? d.livrees : d.total);
    return Math.max(...vals, 1);
  }, [chartData, chartMetric]);

  // Top produits
  const topProducts = useMemo(() => {
    const map: Record<string, { count: number; ca: number }> = {};
    periodOrders.forEach(o => {
      const name = o.product || "Inconnu";
      if (!map[name]) map[name] = { count: 0, ca: 0 };
      map[name].count++;
      if (o.cash_collected) map[name].ca += Number(o.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  }, [periodOrders]);

  // Performance closureuses
  const closeuseStats = useMemo(() => {
    const map: Record<string, { confirmed: number; cancelled: number; total: number }> = {};
    periodOrders.forEach(o => {
      const name = o.closer_name || "Non assigné";
      if (!map[name]) map[name] = { confirmed: 0, cancelled: 0, total: 0 };
      map[name].total++;
      if (["Confirmé","Livré","Assigné","En livraison"].includes(o.status ?? "")) map[name].confirmed++;
      if ((o.status ?? "") === "Annulé") map[name].cancelled++;
    });
    return Object.entries(map).filter(([n]) => n !== "Non assigné").sort((a, b) => b[1].confirmed - a[1].confirmed);
  }, [periodOrders]);

  // Performance livreurs
  const livreurStats = useMemo(() => {
    const map: Record<string, { delivered: number; total: number; ca: number }> = {};
    periodOrders.forEach(o => {
      if (!o.driver_name) return;
      if (!map[o.driver_name]) map[o.driver_name] = { delivered: 0, total: 0, ca: 0 };
      map[o.driver_name].total++;
      if ((o.status ?? "") === "Livré") {
        map[o.driver_name].delivered++;
        if (o.cash_collected) map[o.driver_name].ca += Number(o.amount || 0);
      }
    });
    return Object.entries(map).sort((a, b) => b[1].delivered - a[1].delivered);
  }, [periodOrders]);

  const periodLabel: Record<string, string> = { today: "Aujourd'hui", "7d": "7 jours", "30d": "30 jours", all: "Tout" };

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Filtre période */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {(["today","7d","30d","all"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${period === p ? S.gold : S.border}`, background: period === p ? "rgba(245,158,11,0.12)" : S.card, color: period === p ? S.gold : S.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {periodLabel[p]}
          </button>
        ))}
      </div>

      {/* Stats aujourd'hui */}
      <p style={{ fontSize: 12, color: S.text2, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>AUJOURD&apos;HUI</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <StatCard icon="📝" label="Créées" value={today.created} />
        <StatCard icon="🎯" label="Livrées" value={today.delivered} color={S.green} bg={S.greenBg} border={S.greenBorder} />
        <StatCard icon="💵" label="Encaissé" value={fmt(today.amount)} color={S.gold} bg={S.goldBg} border={S.goldBorder} small />
      </div>

      {/* KPIs période */}
      <p style={{ fontSize: 12, color: S.text2, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>PÉRIODE — {periodLabel[period]}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 10 }}>
        <StatCard icon="📥" label="Reçues" value={stats.total} color={S.blue} bg={S.blueBg} border={S.blueBorder} />
        <StatCard icon="✅" label="Confirmées" value={stats.confirmed} color={S.green} bg={S.greenBg} border={S.greenBorder} />
        <StatCard icon="🎯" label="Livrées" value={stats.delivered} color={S.gold} bg={S.goldBg} border={S.goldBorder} />
        <StatCard icon="❌" label="Annulées" value={stats.cancelled} color={S.red} bg={S.redBg} border={S.redBorder} />
      </div>

      {/* Taux */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {[
          { label: "Taux confirmation", rate: stats.confirmRate, color: S.blue },
          { label: "Taux livraison", rate: stats.deliveryRate, color: S.green },
        ].map(({ label, rate, color }) => (
          <div key={label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 14 }}>
            <p style={{ color: S.text2, fontSize: 11, margin: "0 0 8px 0" }}>{label}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ color, fontSize: 22, fontWeight: 800, margin: 0 }}>{rate}%</p>
              <div style={{ flex: 1, background: S.border, borderRadius: 4, height: 8 }}>
                <div style={{ width: `${rate}%`, background: color, borderRadius: 4, height: "100%" }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Montants */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg,#052E16,#065F46)", border: `1px solid ${S.greenBorder}`, borderRadius: 14, padding: 16 }}>
          <p style={{ color: S.text2, fontSize: 12, margin: "0 0 6px 0" }}>💵 Chiffre d&apos;affaires</p>
          <p style={{ color: S.green, fontSize: 20, fontWeight: 800, margin: 0 }}>{fmt(stats.ca)}</p>
        </div>
        <div style={{ background: "linear-gradient(135deg,#450A0A,#7F1D1D)", border: `1px solid ${S.redBorder}`, borderRadius: 14, padding: 16 }}>
          <p style={{ color: S.text2, fontSize: 12, margin: "0 0 6px 0" }}>⏳ En attente</p>
          <p style={{ color: S.red, fontSize: 20, fontWeight: 800, margin: 0 }}>{fmt(stats.pending)}</p>
        </div>
      </div>

      {/* Graphique */}
      <p style={{ fontSize: 12, color: S.text2, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>📈 ÉVOLUTION 7 JOURS</p>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {([["total","Commandes"],["livrees","Livrées"],["ca","CA"]] as const).map(([m, label]) => (
            <button key={m} onClick={() => setChartMetric(m)}
              style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${chartMetric === m ? S.gold : S.border}`, background: chartMetric === m ? "rgba(245,158,11,0.1)" : "transparent", color: chartMetric === m ? S.gold : S.text3, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
          {chartData.map((d, i) => {
            const val = chartMetric === "ca" ? d.ca : chartMetric === "livrees" ? d.livrees : d.total;
            const h = Math.max(Math.round((val / chartMax) * 100), val > 0 ? 8 : 2);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ color: S.text3, fontSize: 9, fontWeight: 600 }}>{val > 0 ? (chartMetric === "ca" ? `${Math.round(val/1000)}k` : val) : ""}</span>
                <div style={{ width: "100%", height: `${h}%`, background: val > 0 ? `linear-gradient(to top, ${S.gold}, ${S.gold}88)` : S.border, borderRadius: "4px 4px 0 0", minHeight: 3 }} />
                <span style={{ color: S.text3, fontSize: 9, textAlign: "center", lineHeight: 1.2 }}>{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top produits */}
      {topProducts.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: S.text2, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>🏆 TOP PRODUITS</p>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, marginBottom: 20 }}>
            {topProducts.map(([name, data], i) => (
              <div key={name} style={{ marginBottom: i < topProducts.length - 1 ? 12 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: S.text, fontSize: 13, fontWeight: 600 }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  "} {name}
                  </span>
                  <span style={{ color: S.gold, fontSize: 12, fontWeight: 700 }}>{data.count} ventes</span>
                </div>
                <div style={{ background: S.border, borderRadius: 4, height: 5 }}>
                  <div style={{ width: `${Math.round((data.count / topProducts[0][1].count) * 100)}%`, background: S.gold, borderRadius: 4, height: "100%" }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Performance closureuses */}
      {closeuseStats.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: S.text2, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>📞 CLOSUREUSES</p>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            {closeuseStats.map(([name, data], i) => {
              const rate = data.total > 0 ? Math.round((data.confirmed / data.total) * 100) : 0;
              return (
                <div key={name} style={{ padding: "10px 14px", borderBottom: i < closeuseStats.length - 1 ? `1px solid ${S.border}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>👩</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{name}</p>
                    <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>{data.confirmed} conf. · {data.cancelled} ann.</p>
                  </div>
                  <p style={{ color: rate >= 70 ? S.green : rate >= 50 ? S.gold : S.red, fontSize: 18, fontWeight: 800, margin: 0 }}>{rate}%</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Performance livreurs */}
      {livreurStats.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: S.text2, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>🚚 LIVREURS</p>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            {livreurStats.map(([name, data], i) => {
              const rate = data.total > 0 ? Math.round((data.delivered / data.total) * 100) : 0;
              return (
                <div key={name} style={{ padding: "10px 14px", borderBottom: i < livreurStats.length - 1 ? `1px solid ${S.border}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🛵</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{name}</p>
                    <p style={{ color: S.text3, fontSize: 11, margin: 0 }}>{data.delivered}/{data.total} liv. · {fmt(data.ca)}</p>
                  </div>
                  <p style={{ color: rate >= 80 ? S.green : rate >= 60 ? S.gold : S.red, fontSize: 18, fontWeight: 800, margin: 0 }}>{rate}%</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Stock par livreur */}
      {driverStocks.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: S.text2, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10 }}>📦 STOCK PAR LIVREUR</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
            {Object.entries(driverStocks.reduce((acc: Record<string, number>, i) => {
              acc[i.driver_name] = (acc[i.driver_name] || 0) + Number(i.quantity || 0); return acc;
            }, {})).map(([driver, qty]) => (
              <div key={driver} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <p style={{ fontSize: 11, color: S.text2, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{driver}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: S.gold, margin: 0 }}>{qty}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


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

  const now      = new Date();
  const todayStr = now.toDateString();

  const filterFn = (o: Order) => {
    const matchDriver = driverFilter === "Tous" || o.driver_name === driverFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || [o.customer_name, o.phone, o.city, o.driver_name || "", o.product || ""].join(" ").toLowerCase().includes(q);
    return matchDriver && matchSearch;
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
    { id: "aujourd_hui", label: "⚡ Aujourd'hui", count: section1.length, color: S.gold,    bg: "#1a1200" },
    { id: "retard",      label: "🔴 En retard",   count: section2.length, color: S.danger,  bg: "#2D0F0F" },
    { id: "confirme",    label: "✅ Confirmées",   count: section3.length, color: S.info,    bg: "#0C1E3E" },
    { id: "historique",  label: "📋 Historique",   count: section4.length, color: S.text2,   bg: S.card },
  ];

  return (
    <div>
      {/* 4 onglets */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "9px 14px", border: `1px solid ${activeTab === tab.id ? tab.color : S.border}`,
            borderRadius: 20, cursor: "pointer", fontSize: 13,
            fontWeight: activeTab === tab.id ? 700 : 400,
            whiteSpace: "nowrap" as const, flexShrink: 0,
            background: activeTab === tab.id ? tab.bg : S.card,
            color: activeTab === tab.id ? tab.color : S.text2,
          }}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{ marginLeft: 6, background: activeTab === tab.id ? tab.color : S.border,
                color: activeTab === tab.id ? "#000" : S.text3,
                padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <input type="text" placeholder="🔍 Chercher client, ville, livreur..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${S.border}`, backgroundColor: S.card, color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const, marginBottom: 10 }} />

      {/* Filtre livreur */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
        {["Tous", ...drivers.map(d => d.full_name)].map(name => (
          <button key={name} onClick={() => setDriverFilter(name)} style={{
            padding: "7px 13px", border: `1px solid ${driverFilter === name ? S.gold : S.border}`,
            borderRadius: 20, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" as const, flexShrink: 0,
            fontWeight: driverFilter === name ? 700 : 400,
            background: driverFilter === name ? S.gold : S.card,
            color:      driverFilter === name ? "#000" : S.text2,
          }}>
            {name === "Tous" ? "Tous livreurs" : name}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: S.text3, marginBottom: 12 }}>{visible.length} commande(s)</p>

      {visible.length === 0 ? (
        <div style={{ border: `1px solid ${S.border}`, borderRadius: 14, padding: "48px 0", textAlign: "center", fontSize: 13, color: S.text3 }}>Aucune commande dans cet onglet</div>
      ) : visible.map(order => (
        <div key={order.id} style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px 8px" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: S.text }}>{order.customer_name}</div>
              <div style={{ fontSize: 11, color: S.text3, marginTop: 2 }}>📍 {order.city} · #{order.id} · {fmtDate(order.created_at)}</div>
              <div style={{ fontSize: 11, color: S.text2, marginTop: 2 }}>{order.address}</div>
            </div>
            <Badge status={order.status} />
          </div>
          <div style={{ margin: "0 12px 10px", backgroundColor: "#0A0A0F", borderRadius: 10, padding: "8px 12px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: S.text2 }}>{order.quantity ?? 1}× {order.product}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: S.gold }}>{fmt(order.amount)}</span>
          </div>
          {order.driver_name && (
            <div style={{ padding: "0 14px 8px", fontSize: 11, color: S.info }}>🛵 {order.driver_name}</div>
          )}
          <div style={{ borderTop: `1px solid ${S.border}`, padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <a href={callUrl(order.phone)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, border: `1px solid ${S.border}`, color: S.success, textDecoration: "none" }}>📞 Appeler</a>
              <a href={waUrl(order.phone, clientWaMsg(order))} target="_blank" rel="noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, border: `1px solid ${S.border}`, color: S.green, textDecoration: "none" }}>💬 WhatsApp</a>
              <button onClick={() => onEditClick(order)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, border: `1px solid ${S.border}`, color: S.text2, backgroundColor: "transparent", cursor: "pointer" }}>✏️ Modifier</button>
            </div>
            {isEnCours(order) && (
              <div style={{ display: "flex", gap: 6 }}>
                <select value={selectedDrivers[order.id] || ""} onChange={e => onDriverChange(order.id, e.target.value)}
                  style={{ flex: 1, padding: "7px 8px", borderRadius: 8, border: `1px solid ${S.border}`, backgroundColor: S.card2, color: S.text, fontSize: 12, outline: "none" }}>
                  <option value="">Livreur...</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
                <select value={selectedActions[order.id] || ""} onChange={e => onActionChange(order.id, e.target.value)}
                  style={{ flex: 1, padding: "7px 8px", borderRadius: 8, border: `1px solid ${S.border}`, backgroundColor: S.card2, color: S.text, fontSize: 12, outline: "none" }}>
                  <option value="">Action...</option>
                  <option value="confirmer">✓ Confirmer</option>
                  <option value="assigner">🛵 Assigner</option>
                  <option value="livre_paye">🎯 Livré + Payé</option>
                  <option value="gare">🚌 Gare</option>
                  <option value="annuler">❌ Annuler</option>
                </select>
                <button onClick={() => onActionSubmit(order)} style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, backgroundColor: S.gold, color: "#000", border: "none", cursor: "pointer" }}>OK</button>
              </div>
            )}
          </div>
        </div>
      ))}
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
        <StatCard icon="🛵" label="Total livreurs" value={fmt(stats.totalDriver)} color={S.info} small />
        <StatCard icon="👩" label="Total closeurs"  value={fmt(stats.totalCloser)} color={S.purple} small />
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
type WarehouseStock = { id: number; product_name: string; quantity: number; alert_threshold: number; created_at?: string | null; updated_at?: string | null; };
type StockMouvement = { id: number; created_at: string; product_name: string; type: string; quantity: number; from_driver: string; to_driver: string; note?: string | null; created_by?: string | null; };
type StockDemande = { id: number; created_at: string; driver_id: string; driver_name: string; product_name: string; quantity_requested: number; status: string; note?: string | null; };

// ─── Vue Stock Phase 4 ───────────────────────────────────────
function StockView({ drivers, driverStocks, stockForm, stockLoading, onStockChange, onStockSubmit, profile, tenantId }: {
  drivers: Profile[]; driverStocks: DriverStock[];
  stockForm: StockFormData; stockLoading: boolean;
  onStockChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onStockSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  profile: Profile | null;
  tenantId: string;
}) {
  const isMobile = useIsMobile();
  const [subView, setSubView] = useState<"overview"|"warehouse"|"drivers"|"transfer"|"history"|"demandes">("overview");
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [stockMouvements, setStockMouvements] = useState<StockMouvement[]>([]);
  const [stockDemandes, setStockDemandes] = useState<StockDemande[]>([]);
  const [p4Loading, setP4Loading] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({ product_name: "", quantity: "1", alert_threshold: "5" });
  const [transferForm, setTransferForm] = useState({ product_name: "", from_driver_id: "", to_driver_id: "", quantity: "1" });
  const [w2dForm, setW2dForm] = useState({ product_name: "", driver_id: "", quantity: "1" });

  useEffect(() => { void loadData(); }, []);

  const loadData = async () => {
    try { const { data } = await supabase.from("warehouse_stock").select("*").eq("tenant_id", tenantId).order("product_name"); if (data) setWarehouseStocks(data as WarehouseStock[]); } catch (_) {}
    try { const { data } = await supabase.from("stock_mouvements").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100); if (data) setStockMouvements(data as StockMouvement[]); } catch (_) {}
    try { const { data } = await supabase.from("stock_demandes").select("*").order("created_at", { ascending: false }); if (data) setStockDemandes(data as StockDemande[]); } catch (_) {}
  };

  const pendingDemandes = stockDemandes.filter(d => d.status === "en_attente");
  const lowWarehouse = warehouseStocks.filter(w => w.quantity <= w.alert_threshold);

  const handleAddWarehouse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setP4Loading(true);
    const name = warehouseForm.product_name.trim(); const qty = Number(warehouseForm.quantity); const threshold = Number(warehouseForm.alert_threshold);
    if (!name || qty <= 0) { toast("Données invalides.", "error"); setP4Loading(false); return; }
    const existing = warehouseStocks.find(w => w.product_name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await supabase.from("warehouse_stock").update({ quantity: existing.quantity + qty, alert_threshold: threshold, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("warehouse_stock").insert([{ tenant_id: tenantId, product_name: name, quantity: qty, alert_threshold: threshold }]);
    }
    await supabase.from("stock_mouvements").insert([{ tenant_id: profile?.tenant_id || "", product_name: name, type: "entree_entrepot", quantity: qty, from_driver: "Fournisseur", to_driver: "Entrepôt" }]);
    await loadData(); setWarehouseForm({ product_name: "", quantity: "1", alert_threshold: "5" }); toast("✅ Stock entrepôt mis à jour"); setP4Loading(false);
  };

  const handleW2D = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setP4Loading(true);
    const driver = drivers.find(d => d.id === w2dForm.driver_id);
    if (!driver) { toast("Choisis un livreur.", "error"); setP4Loading(false); return; }
    const name = w2dForm.product_name.trim(); const qty = Number(w2dForm.quantity);
    const wStock = warehouseStocks.find(w => w.product_name.toLowerCase() === name.toLowerCase());
    if (!wStock || wStock.quantity < qty) { toast(`Stock insuffisant. Disponible : ${wStock?.quantity || 0}`, "error"); setP4Loading(false); return; }
    await supabase.from("warehouse_stock").update({ quantity: wStock.quantity - qty, updated_at: new Date().toISOString() }).eq("id", wStock.id);
    const existing = driverStocks.find(i => i.driver_id === driver.id && i.product_name.toLowerCase() === name.toLowerCase());
    if (existing) { await supabase.from("driver_stock").update({ quantity: existing.quantity + qty }).eq("id", existing.id); }
    else { await supabase.from("driver_stock").insert([{ driver_id: driver.id, driver_name: driver.full_name, product_name: name, quantity: qty }]); }
    await supabase.from("stock_mouvements").insert([{ tenant_id: profile?.tenant_id || "", product_name: name, type: "transfert_entrepot_livreur", quantity: qty, from_driver: "Entrepôt", to_driver: driver.full_name }]);
    await loadData(); setW2dForm({ product_name: "", driver_id: "", quantity: "1" }); toast(`✅ ${qty} unité(s) transférée(s) à ${driver.full_name}`); setP4Loading(false);
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setP4Loading(true);
    const from = drivers.find(d => d.id === transferForm.from_driver_id); const to = drivers.find(d => d.id === transferForm.to_driver_id);
    if (!from || !to || from.id === to.id) { toast("Choisis deux livreurs différents.", "error"); setP4Loading(false); return; }
    const name = transferForm.product_name.trim(); const qty = Number(transferForm.quantity);
    const fromStock = driverStocks.find(i => i.driver_id === from.id && i.product_name.toLowerCase() === name.toLowerCase());
    if (!fromStock || fromStock.quantity < qty) { toast(`Stock insuffisant pour ${from.full_name}. Disponible : ${fromStock?.quantity || 0}`); setP4Loading(false); return; }
    await supabase.from("driver_stock").update({ quantity: fromStock.quantity - qty }).eq("id", fromStock.id);
    const toStock = driverStocks.find(i => i.driver_id === to.id && i.product_name.toLowerCase() === name.toLowerCase());
    if (toStock) { await supabase.from("driver_stock").update({ quantity: toStock.quantity + qty }).eq("id", toStock.id); }
    else { await supabase.from("driver_stock").insert([{ driver_id: to.id, driver_name: to.full_name, product_name: name, quantity: qty }]); }
    await supabase.from("stock_mouvements").insert([{ tenant_id: profile?.tenant_id || "", product_name: name, type: "transfert_livreur", quantity: qty, from_driver: from.full_name, to_driver: to.full_name }]);
    await loadData(); setTransferForm({ product_name: "", from_driver_id: "", to_driver_id: "", quantity: "1" }); toast(`✅ Transfert : ${from.full_name} → ${to.full_name}`); setP4Loading(false);
  };

  const handleApprove = async (d: StockDemande) => {
    confirm({
      message: `Approuver ${d.quantity_requested} × ${d.product_name} pour ${d.driver_name} ?`,
      confirmLabel: "✅ Approuver",
      onConfirm: async () => {
        setP4Loading(true);
        const wStock = warehouseStocks.find(w => w.product_name.toLowerCase() === d.product_name.toLowerCase());
        if (!wStock || wStock.quantity < d.quantity_requested) { toast(`Stock insuffisant. Disponible : ${wStock?.quantity || 0}`, "error"); setP4Loading(false); return; }
        await supabase.from("warehouse_stock").update({ quantity: wStock.quantity - d.quantity_requested, updated_at: new Date().toISOString() }).eq("id", wStock.id);
        const existing = driverStocks.find(i => i.driver_id === d.driver_id && i.product_name.toLowerCase() === d.product_name.toLowerCase());
        if (existing) { await supabase.from("driver_stock").update({ quantity: existing.quantity + d.quantity_requested }).eq("id", existing.id); }
        else { await supabase.from("driver_stock").insert([{ driver_id: d.driver_id, driver_name: d.driver_name, product_name: d.product_name, quantity: d.quantity_requested }]); }
        await supabase.from("stock_demandes").update({ status: "approuvée" }).eq("id", d.id);
        await supabase.from("stock_mouvements").insert([{ tenant_id: profile?.tenant_id || "", product_name: d.product_name, type: "demande_approuvee", quantity: d.quantity_requested, from_driver: "Entrepôt", to_driver: d.driver_name }]);
        await loadData(); toast("✅ Demande approuvée", "success"); setP4Loading(false);
      }
    });
  };

  const handleReject = (d: StockDemande) => {
    confirm({
      message: `Refuser la demande de ${d.driver_name} pour ${d.quantity_requested}× ${d.product_name} ?`,
      confirmLabel: "❌ Refuser",
      danger: true,
      onConfirm: async () => {
        await supabase.from("stock_demandes").update({ status: "refusée" }).eq("id", d.id);
        setStockDemandes(prev => prev.map(x => x.id === d.id ? { ...x, status: "refusée" } : x));
        toast("Demande refusée", "info");
      }
    });
  };

  const subTabs = [
    { id: "overview", label: "📊 Vue d'ensemble" },
    { id: "warehouse", label: "🏭 Entrepôt" },
    { id: "drivers", label: "🚴 Livreurs" },
    { id: "transfer", label: "🔄 Transferts" },
    { id: "history", label: "📋 Historique" },
    { id: "demandes", label: `📬 Demandes${pendingDemandes.length > 0 ? ` (${pendingDemandes.length})` : ""}` },
  ];

  const inputSt = { width: "100%", padding: "10px 12px", background: "#0A0A0F", border: `1px solid ${S.border}`, borderRadius: 10, color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const };

  return (
    <div>
      {/* Sous-onglets */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 20, paddingBottom: 4 }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubView(t.id as typeof subView)}
            style={{ padding: "8px 14px", border: `1px solid ${subView === t.id ? S.gold : S.border}`, background: subView === t.id ? "#1a1200" : S.card, color: subView === t.id ? S.gold : S.text2, borderRadius: 20, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0, fontWeight: subView === t.id ? 700 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Alertes stock bas */}
      {lowWarehouse.length > 0 && subView === "overview" && (
        <div style={{ marginBottom: 16, padding: 12, background: S.dangerBg, border: `1px solid ${S.danger}`, borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: S.danger, fontWeight: 700, marginBottom: 8 }}>⚠️ ALERTES STOCK BAS</p>
          {lowWarehouse.map(w => (
            <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid #3d0a0a` }}>
              <span style={{ fontSize: 13 }}>{w.product_name}</span>
              <span style={{ color: S.danger, fontWeight: 700, fontSize: 13 }}>{w.quantity} / seuil {w.alert_threshold}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Vue d'ensemble ── */}
      {subView === "overview" && (
        <div>
          <p style={{ fontSize: 12, color: S.text3, fontWeight: 600, marginBottom: 10 }}>STOCK ENTREPÔT</p>
          {warehouseStocks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: S.text2, background: S.card, borderRadius: 14, marginBottom: 16 }}>
              <p style={{ fontSize: 28, marginBottom: 6 }}>🏭</p><p style={{ fontSize: 13 }}>Aucun stock entrepôt. Utilisez l&apos;onglet &ldquo;Entrepôt&rdquo; pour en ajouter.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
              {warehouseStocks.map(w => {
                const isLow = w.quantity <= w.alert_threshold;
                return (
                  <div key={w.id} style={{ background: isLow ? S.dangerBg : S.card, border: `1px solid ${isLow ? S.danger : S.border}`, borderRadius: 14, padding: 14, textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: S.text2, marginBottom: 4 }}>ENTREPÔT</p>
                    <p style={{ fontSize: 22, marginBottom: 4 }}>🏭</p>
                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{w.product_name}</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: isLow ? S.danger : S.gold }}>{w.quantity}</p>
                    {isLow && <p style={{ fontSize: 10, color: S.danger, marginTop: 4, fontWeight: 700 }}>⚠️ Stock bas</p>}
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ fontSize: 12, color: S.text3, fontWeight: 600, marginBottom: 10 }}>STOCK PAR LIVREUR</p>
          {driverStocks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: S.text2, background: S.card, borderRadius: 14 }}><p style={{ fontSize: 28, marginBottom: 6 }}>📭</p><p style={{ fontSize: 13 }}>Aucun stock livreur.</p></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {driverStocks.map(s => {
                const isLow = s.quantity <= 3;
                return (
                  <div key={s.id} style={{ background: isLow ? "#1a0a00" : S.card, border: `1px solid ${isLow ? S.danger : S.border}`, borderRadius: 14, padding: 14, textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: S.text2, marginBottom: 4 }}>{s.driver_name}</p>
                    <p style={{ fontSize: 22, marginBottom: 4 }}>📦</p>
                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{s.product_name}</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: isLow ? S.danger : S.gold }}>{s.quantity}</p>
                    {isLow && <p style={{ fontSize: 10, color: S.danger, marginTop: 4, fontWeight: 700 }}>⚠️ Stock bas</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Entrepôt ── */}
      {subView === "warehouse" && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🏭 Ajouter au stock entrepôt</p>
          <form onSubmit={handleAddWarehouse} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, maxWidth: 500 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10 }}>
              <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Produit</label><input value={warehouseForm.product_name} onChange={e => setWarehouseForm(f => ({ ...f, product_name: e.target.value }))} required placeholder="Ex: THERAWOLF" style={inputSt} /></div>
              <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Quantité</label><input type="number" min="1" value={warehouseForm.quantity} onChange={e => setWarehouseForm(f => ({ ...f, quantity: e.target.value }))} required style={inputSt} /></div>
              <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Seuil alerte</label><input type="number" min="1" value={warehouseForm.alert_threshold} onChange={e => setWarehouseForm(f => ({ ...f, alert_threshold: e.target.value }))} required style={inputSt} /></div>
            </div>
            <button type="submit" disabled={p4Loading} style={{ padding: "11px 0", background: `linear-gradient(135deg, ${S.gold}, ${S.goldDark})`, border: "none", borderRadius: 10, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{p4Loading ? "En cours..." : "➕ Ajouter au stock entrepôt"}</button>
          </form>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Stock actuel entrepôt</p>
          {warehouseStocks.length === 0 ? <p style={{ color: S.text2, fontSize: 13 }}>Aucun stock entrepôt.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {warehouseStocks.map(w => {
                const isLow = w.quantity <= w.alert_threshold;
                return (
                  <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: isLow ? S.dangerBg : S.card, border: `1px solid ${isLow ? S.danger : S.border}`, borderRadius: 12 }}>
                    <div><p style={{ fontSize: 14, fontWeight: 700 }}>{w.product_name}</p><p style={{ fontSize: 12, color: S.text2 }}>Seuil : {w.alert_threshold}</p></div>
                    <div style={{ textAlign: "right" }}><p style={{ fontSize: 28, fontWeight: 700, color: isLow ? S.danger : S.gold }}>{w.quantity}</p>{isLow && <p style={{ fontSize: 10, color: S.danger, fontWeight: 700 }}>⚠️ Stock bas</p>}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Livreurs ── */}
      {subView === "drivers" && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>➕ Ajouter stock direct à un livreur</p>
          <form onSubmit={onStockSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, maxWidth: 500 }}>
            <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Livreur</label>
              <select name="driver_id" value={stockForm.driver_id} onChange={onStockChange} required style={inputSt}>
                <option value="">Choisir un livreur</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Produit</label><input name="product_name" value={stockForm.product_name} onChange={onStockChange} required placeholder="Ex: THERAWOLF" style={inputSt} /></div>
              <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Quantité</label><input name="quantity" type="number" min="1" value={stockForm.quantity} onChange={onStockChange} required style={inputSt} /></div>
            </div>
            <button type="submit" disabled={stockLoading} style={{ padding: "11px 0", background: `linear-gradient(135deg, ${S.gold}, ${S.goldDark})`, border: "none", borderRadius: 10, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{stockLoading ? "Ajout..." : "➕ Ajouter"}</button>
          </form>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Stock actuel livreurs</p>
          {driverStocks.length === 0 ? <p style={{ color: S.text2, fontSize: 13 }}>Aucun stock livreur.</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {driverStocks.map(s => {
                const isLow = s.quantity <= 3;
                return (
                  <div key={s.id} style={{ background: isLow ? "#1a0a00" : S.card, border: `1px solid ${isLow ? S.danger : S.border}`, borderRadius: 14, padding: 14, textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: S.text2, marginBottom: 4 }}>{s.driver_name}</p>
                    <p style={{ fontSize: 22, marginBottom: 4 }}>📦</p>
                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{s.product_name}</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: isLow ? S.danger : S.gold }}>{s.quantity}</p>
                    {isLow && <p style={{ fontSize: 10, color: S.danger, marginTop: 4, fontWeight: 700 }}>⚠️ Stock bas</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Transferts ── */}
      {subView === "transfer" && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🔄 Entrepôt → Livreur</p>
          <p style={{ fontSize: 12, color: S.text2, marginBottom: 12 }}>Déduire de l&apos;entrepôt et ajouter au livreur</p>
          <form onSubmit={handleW2D} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, maxWidth: 500 }}>
            <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Produit (entrepôt)</label>
              <select value={w2dForm.product_name} onChange={e => setW2dForm(f => ({ ...f, product_name: e.target.value }))} required style={inputSt}>
                <option value="">Choisir un produit</option>
                {warehouseStocks.map(w => <option key={w.id} value={w.product_name}>{w.product_name} (dispo : {w.quantity})</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Livreur</label>
                <select value={w2dForm.driver_id} onChange={e => setW2dForm(f => ({ ...f, driver_id: e.target.value }))} required style={inputSt}>
                  <option value="">Choisir</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Quantité</label><input type="number" min="1" value={w2dForm.quantity} onChange={e => setW2dForm(f => ({ ...f, quantity: e.target.value }))} required style={inputSt} /></div>
            </div>
            <button type="submit" disabled={p4Loading} style={{ padding: "11px 0", background: "linear-gradient(135deg, #1d4ed8, #1e40af)", border: "none", borderRadius: 10, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{p4Loading ? "..." : "🔄 Transférer vers livreur"}</button>
          </form>

          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, paddingTop: 16, borderTop: `1px solid ${S.border}` }}>↔️ Livreur → Livreur</p>
          <p style={{ fontSize: 12, color: S.text2, marginBottom: 12 }}>Déplacer du stock entre deux livreurs</p>
          <form onSubmit={handleTransfer} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 500 }}>
            <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Produit</label>
              <select value={transferForm.product_name} onChange={e => setTransferForm(f => ({ ...f, product_name: e.target.value }))} required style={inputSt}>
                <option value="">Choisir</option>
                {Array.from(new Set(driverStocks.map(s => s.product_name))).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>De</label>
                <select value={transferForm.from_driver_id} onChange={e => setTransferForm(f => ({ ...f, from_driver_id: e.target.value }))} required style={inputSt}>
                  <option value="">Source</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Vers</label>
                <select value={transferForm.to_driver_id} onChange={e => setTransferForm(f => ({ ...f, to_driver_id: e.target.value }))} required style={inputSt}>
                  <option value="">Dest.</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
            </div>
            <div><label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Quantité</label><input type="number" min="1" value={transferForm.quantity} onChange={e => setTransferForm(f => ({ ...f, quantity: e.target.value }))} required style={inputSt} /></div>
            <button type="submit" disabled={p4Loading} style={{ padding: "11px 0", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", borderRadius: 10, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{p4Loading ? "..." : "↔️ Transférer"}</button>
          </form>
        </div>
      )}

      {/* ── Historique ── */}
      {subView === "history" && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📋 Historique des mouvements</p>
          {stockMouvements.length === 0 ? <p style={{ color: S.text2, fontSize: 13 }}>Aucun mouvement.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stockMouvements.map(m => {
                const colors: Record<string, string> = { entree_entrepot: S.success, transfert_entrepot_livreur: S.info, transfert_livreur: S.purple, vente_livraison: S.warning, demande_approuvee: S.success };
                const labels: Record<string, string> = { entree_entrepot: "➕ Entrée entrepôt", transfert_entrepot_livreur: "🔄 Entrepôt→Livreur", transfert_livreur: "↔️ Livreur→Livreur", vente_livraison: "🎯 Vendu", demande_approuvee: "✅ Demande approuvée" };
                const c = colors[m.type] || S.text2;
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 12 }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: c, marginBottom: 2 }}>{labels[m.type] || m.type}</p>
                      <p style={{ fontSize: 13, color: S.text, marginBottom: 2 }}>{m.product_name}</p>
                      <p style={{ fontSize: 11, color: S.text2 }}>{m.from_driver} → {m.to_driver}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                      <p style={{ fontSize: 20, fontWeight: 700, color: c }}>{m.quantity}</p>
                      <p style={{ fontSize: 10, color: S.text2 }}>{fmtDate(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Demandes ── */}
      {subView === "demandes" && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📬 Demandes de stock</p>
          <p style={{ fontSize: 12, color: S.text2, marginBottom: 16 }}>Les livreurs peuvent demander du stock depuis leur interface.</p>
          {stockDemandes.length === 0 ? <p style={{ color: S.text2, fontSize: 13 }}>Aucune demande.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stockDemandes.map(d => {
                const isPending = d.status === "en_attente";
                const sc = d.status === "approuvée" ? { bg: S.successBg, color: S.success } : d.status === "refusée" ? { bg: S.dangerBg, color: S.danger } : { bg: "#1a1200", color: S.gold };
                return (
                  <div key={d.id} style={{ padding: 14, background: S.card, border: `1px solid ${S.border}`, borderRadius: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{d.driver_name}</p>
                        <p style={{ fontSize: 13, color: S.text2 }}>📦 {d.product_name} × {d.quantity_requested}</p>
                        {d.note && <p style={{ fontSize: 12, color: S.text2, marginTop: 4 }}>💬 {d.note}</p>}
                        <p style={{ fontSize: 11, color: S.text3, marginTop: 4 }}>{fmtDate(d.created_at)}</p>
                      </div>
                      <span style={{ background: sc.bg, color: sc.color, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {d.status === "en_attente" ? "⏳ En attente" : d.status === "approuvée" ? "✅ Approuvée" : "❌ Refusée"}
                      </span>
                    </div>
                    {isPending && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button onClick={() => handleApprove(d)} disabled={p4Loading} style={{ padding: "9px 0", background: S.successBg, border: `1px solid ${S.success}40`, borderRadius: 10, color: S.success, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✅ Approuver</button>
                        <button onClick={() => handleReject(d)} style={{ padding: "9px 0", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, color: S.danger, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>❌ Refuser</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [commissionRules, setCommissionRules] = useState({ driver: 2000, closer: 500 });
  const [authLoading, setAuthLoading]   = useState(true);
  const [loading, setLoading]           = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [activeView, setActiveView]     = useState("dashboard");
  const [form, setForm]                 = useState<OrderFormData>(EMPTY_FORM);
  const [stockForm, setStockForm]       = useState<StockFormData>(EMPTY_STOCK);
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
    const { data: pd } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!pd) { router.replace("/login"); return; }
    const p = pd as Profile;
    const role = normalizeRole(p.role);
    if (role !== "admin" && role !== "manager") {
      router.replace(role === "closureuse" ? "/closureuse" : "/livreur");
      return;
    }
    setProfile(p);
    const tid = (p as any).tenant_id || "";
    setTenantId(tid);
    // Charger les règles de commission depuis les paramètres de la boutique
    if (tid) {
      const { data: tenantData } = await supabase.from("tenants")
        .select("driver_commission, closer_commission, currency, name")
        .eq("id", tid).single();
      if (tenantData) {
        if (tenantData.name) setTenantName(tenantData.name);
        setCommissionRules({
          driver: Number(tenantData.driver_commission) || 2000,
          closer: Number(tenantData.closer_commission) || 500,
        });
        setCurrency(tenantData.currency || "FCFA");
      }
    }
    const { data: profiles } = await supabase.from("profiles").select("*").eq("tenant_id", tid).order("full_name");
    if (profiles) {
      const all = profiles as Profile[];
      setDrivers(all.filter(pr => normalizeRole(pr.role) === "livreur"));
      setClosers(all.filter(pr => normalizeRole(pr.role) === "closureuse"));
    }
    const { data: od } = await supabase.from("orders").select("*").eq("tenant_id", tid).order("id", { ascending: false });
    const fetched = (od as Order[]) || [];
    setOrders(fetched);
    const sel: Record<number, string> = {}; const act: Record<number, string> = {};
    fetched.forEach(o => { sel[o.id] = o.assigned_driver_id || ""; act[o.id] = ""; });
    setSelectedDrivers(sel); setSelectedActions(act);
    const driverIds = (profiles as Profile[])?.filter(p => normalizeRole(p.role) === "livreur").map(p => p.id) || [];
    const { data: sd } = driverIds.length > 0
      ? await supabase.from("driver_stock").select("*").in("driver_id", driverIds).order("id", { ascending: false })
      : { data: [] };
    setDriverStocks((sd as DriverStock[]) || []);
    const { data: hd } = await supabase.from("order_history").select("*")
      .in("order_id", (od as Order[]).map(o => o.id))
      .order("created_at", { ascending: false });
    setHistory((hd as OrderHistory[]) || []);
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
    { id: "clients",     label: "👥 Clients" },
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
        {activeView === "stock"       && <StockView drivers={drivers} driverStocks={driverStocks} stockForm={stockForm} stockLoading={stockLoading} onStockChange={handleStockChange} onStockSubmit={handleAddStock} profile={profile} tenantId={tenantId} />}
        {activeView === "finances"    && <FinancesView orders={orders} drivers={drivers} closers={closers} profile={profile} tenantId={tenantId} />}
        {activeView === "commissions" && <CommissionsView orders={orders} closers={closers} />}
        {activeView === "produits"    && tenantId && <ProduitsView tenantId={tenantId} />}
        {activeView === "equipe"      && tenantId && <EquipeView tenantId={tenantId} />}
        {activeView === "parametres"  && tenantId && <ParametresView tenantId={tenantId} />}
        {activeView === "clients"     && tenantId && <ClientsView tenantId={tenantId} />}
        {activeView === "import"      && tenantId && <ImportView tenantId={tenantId} />}
      </div>
    </div>
  );
}
