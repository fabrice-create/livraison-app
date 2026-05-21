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
import { normalizeRole, normDT, isEnCours, isHistorique, isToday, fmt, fmtDate, filterByPeriod, type PeriodFilter, callUrl, waUrl, clientWaMsg, statusStyle } from "@/lib/utils";

// ─── Design tokens ───────────────────────────────────────────
const S = {
  gold: "#F59E0B", goldDark: "#D97706",
  bg: "#0A0A0F", card: "#111118", card2: "#16161F", border: "#1E1E2E",
  success: "#4ADE80", successBg: "#052E16",
  info: "#60A5FA", infoBg: "#0C1E3E",
  danger: "#F87171", dangerBg: "#2D0F0F",
  warning: "#FB923C", warningBg: "#2D1500",
  purple: "#C084FC", purpleBg: "#2E1065",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
  green: "#25D366",
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
  return (
    <button onClick={onClick} style={{
      padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
      border: "none", cursor: "pointer", whiteSpace: "nowrap" as const,
      backgroundColor: active ? S.gold : S.card,
      color: active ? "#000" : S.text2,
      borderBottom: active ? `2px solid ${S.gold}` : "2px solid transparent",
    }}>{label}</button>
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

// ─── Vue Dashboard ───────────────────────────────────────────
function DashboardView({ orders, driverStocks }: { orders: Order[]; driverStocks: DriverStock[] }) {
  const today = useMemo(() => ({
    created:   orders.filter(o => isToday(o.created_at)).length,
    delivered: orders.filter(o => isToday(o.delivered_at)).length,
    amount:    orders.filter(o => isToday(o.delivered_at) && o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0),
  }), [orders]);

  const global = useMemo(() => ({
    total:     orders.length,
    enCours:   orders.filter(isEnCours).length,
    confirmed: orders.filter(o => o.status === "Confirmé").length,
    delivered: orders.filter(o => o.status === "Livré").length,
    gare:      orders.filter(o => o.logistic_status === "Envoyé à la gare").length,
    collected: orders.filter(o => o.cash_collected).reduce((s, o) => s + Number(o.amount || 0), 0),
    pending:   orders.filter(o => !o.cash_collected && isEnCours(o)).reduce((s, o) => s + Number(o.amount || 0), 0),
    driverCommissions: orders.reduce((s, o) => s + Number(o.driver_commission || 0), 0),
    closerCommissions: orders.reduce((s, o) => s + Number(o.closer_commission || 0), 0),
  }), [orders]);

  const stockByDriver = useMemo(() =>
    driverStocks.reduce((acc: Record<string, number>, i) => {
      acc[i.driver_name] = (acc[i.driver_name] || 0) + Number(i.quantity || 0);
      return acc;
    }, {}), [driverStocks]);

  return (
    <div>
      <SectionTitle>Aujourd'hui</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 4 }}>
        <StatCard icon="📝" label="Créées"   value={today.created} />
        <StatCard icon="🎯" label="Livrées"  value={today.delivered} color={S.success} bg={S.successBg} border={S.success + "30"} />
        <StatCard icon="💵" label="Encaissé" value={fmt(today.amount)} color={S.gold} bg="#1A1200" border={S.gold + "30"} small />
      </div>

      <SectionTitle>Global</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 4 }}>
        <StatCard icon="📦" label="Total"     value={global.total} />
        <StatCard icon="⚡" label="En cours"  value={global.enCours} color={S.warning} />
        <StatCard icon="✅" label="Confirmées" value={global.confirmed} color={S.info} />
        <StatCard icon="🏁" label="Livrées"   value={global.delivered} color={S.success} />
        <StatCard icon="🚌" label="Gare"      value={global.gare} color={S.purple} />
        <StatCard icon="💰" label="Encaissé"  value={fmt(global.collected)} color={S.gold} bg="#1A1200" small />
      </div>

      <SectionTitle>Finances</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
        <StatCard icon="⏳" label="À encaisser"   value={fmt(global.pending)} color={S.warning} small />
        <StatCard icon="🛵" label="Comm. livreurs" value={fmt(global.driverCommissions)} color={S.info} small />
        <StatCard icon="👩" label="Comm. closeurs" value={fmt(global.closerCommissions)} color={S.purple} small />
      </div>

      {Object.keys(stockByDriver).length > 0 && (
        <>
          <SectionTitle>Stock par livreur</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(stockByDriver).map(([name, qty]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 14px" }}>
                <span style={{ fontSize: 13, color: S.text2 }}>🛵 {name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: Number(qty) <= 3 ? S.danger : S.success }}>{qty} unités</span>
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
  const [tab, setTab] = useState<"encours" | "historique">("encours");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = tab === "encours" ? orders.filter(isEnCours) : orders.filter(isHistorique);
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(o =>
      o.customer_name.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      o.city.toLowerCase().includes(q) ||
      (o.driver_name || "").toLowerCase().includes(q)
    );
  }, [orders, tab, search]);

  const enCoursCount    = orders.filter(isEnCours).length;
  const historiqueCount = orders.filter(isHistorique).length;

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 4, marginBottom: 12 }}>
        {(["encours", "historique"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px 0", borderRadius: 9, fontSize: 13, fontWeight: 600,
            border: "none", cursor: "pointer",
            backgroundColor: tab === t ? S.gold : "transparent",
            color: tab === t ? "#000" : S.text2,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {t === "encours" ? "En cours" : "Historique"}
            <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20, backgroundColor: tab === t ? "rgba(0,0,0,0.2)" : S.border, color: tab === t ? "#000" : S.text3 }}>
              {t === "encours" ? enCoursCount : historiqueCount}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input type="text" placeholder="🔍  Chercher client, ville, livreur..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${S.border}`, backgroundColor: S.card, color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const, marginBottom: 12 }} />

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={{ border: `1px solid ${S.border}`, borderRadius: 14, padding: "48px 0", textAlign: "center", fontSize: 13, color: S.text3 }}>Aucune commande</div>
      ) : (
        filtered.map(order => (
          <div key={order.id} style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px 8px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: S.text }}>{order.customer_name}</div>
                <div style={{ fontSize: 11, color: S.text3, marginTop: 2 }}>📍 {order.city} · #{order.id} · {fmtDate(order.created_at)}</div>
                <div style={{ fontSize: 11, color: S.text2, marginTop: 2 }}>{order.address}</div>
              </div>
              <Badge status={order.status} />
            </div>

            {/* Produit + montant */}
            <div style={{ margin: "0 12px 10px", backgroundColor: "#0A0A0F", borderRadius: 10, padding: "8px 12px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: S.text2 }}>{order.quantity ?? 1}× {order.product}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: S.gold }}>{fmt(order.amount)}</span>
            </div>

            {/* Livreur assigné */}
            {order.driver_name && (
              <div style={{ padding: "0 14px 8px", fontSize: 11, color: S.info }}>🛵 {order.driver_name}</div>
            )}

            {/* Actions */}
            <div style={{ borderTop: `1px solid ${S.border}`, padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <a href={callUrl(order.phone)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${S.border}`, color: S.success, textDecoration: "none" }}>📞 Appeler</a>
                <a href={waUrl(order.phone, clientWaMsg(order))} target="_blank" rel="noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${S.border}`, color: S.green, textDecoration: "none" }}>💬 WhatsApp</a>
                <button onClick={() => onEditClick(order)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${S.border}`, color: S.text2, backgroundColor: "transparent", cursor: "pointer" }}>✏️ Modifier</button>
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
                  <button onClick={() => onActionSubmit(order)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, backgroundColor: S.gold, color: "#000", border: "none", cursor: "pointer" }}>OK</button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Vue Commissions ─────────────────────────────────────────
function CommissionsView({ orders, closers }: { orders: Order[]; closers: Profile[] }) {
  const [period, setPeriod] = useState<PeriodFilter>("mois");

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

// ─── Vue Stock ───────────────────────────────────────────────
function StockView({ drivers, driverStocks, stockForm, stockLoading, onStockChange, onStockSubmit }: {
  drivers: Profile[]; driverStocks: DriverStock[];
  stockForm: StockFormData; stockLoading: boolean;
  onStockChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onStockSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div>
      {/* Formulaire ajout stock */}
      <div style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: S.text, marginBottom: 14 }}>➕ Ajouter du stock</div>
        <form onSubmit={onStockSubmit}>
          <Select label="Livreur" name="driver_id" value={stockForm.driver_id} onChange={onStockChange}
            options={drivers.map(d => ({ value: d.id, label: d.full_name }))} />
          <Input label="Produit" name="product_name" value={stockForm.product_name} onChange={onStockChange as any} placeholder="Nom du produit" />
          <Input label="Quantité" name="quantity" value={stockForm.quantity} onChange={onStockChange as any} type="number" placeholder="1" />
          <button type="submit" disabled={stockLoading} style={{
            width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
            backgroundColor: S.gold, color: "#000", border: "none", cursor: "pointer", marginTop: 4,
          }}>{stockLoading ? "Ajout en cours..." : "Ajouter au stock"}</button>
        </form>
      </div>

      {/* Stock par livreur */}
      <SectionTitle>Stock actuel</SectionTitle>
      {drivers.map(driver => {
        const items = driverStocks.filter(s => s.driver_id === driver.id);
        if (items.length === 0) return null;
        return (
          <div key={driver.id} style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.text, marginBottom: 10 }}>🛵 {driver.full_name}</div>
            {items.map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0A0A0F", borderRadius: 8, padding: "8px 12px", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: S.text2 }}>{item.product_name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20, backgroundColor: Number(item.quantity) <= 2 ? S.dangerBg : S.successBg, color: Number(item.quantity) <= 2 ? S.danger : S.success }}>
                  {item.quantity}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Vue Créer commande ──────────────────────────────────────
function CreerView({ form, loading, onChange, onSubmit }: {
  form: OrderFormData; loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

  const enCoursCount = useMemo(() => orders.filter(isEnCours).length, [orders]);

  useEffect(() => { void initPage(); }, []);

  const initPage = async () => {
    setAuthLoading(true);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { router.replace("/login"); return; }
    const { data: pd } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!pd) { router.replace("/login"); return; }
    const p = pd as Profile;
    if (normalizeRole(p.role) !== "admin") {
      router.replace(normalizeRole(p.role) === "closureuse" ? "/closureuse" : "/livreur");
      return;
    }
    setProfile(p);
    setTenantId((p as any).tenant_id || "");
    const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");
    if (profiles) {
      const all = profiles as Profile[];
      setDrivers(all.filter(pr => normalizeRole(pr.role) === "livreur"));
      setClosers(all.filter(pr => normalizeRole(pr.role) === "closureuse"));
    }
    const { data: od } = await supabase.from("orders").select("*").order("id", { ascending: false });
    const fetched = (od as Order[]) || [];
    setOrders(fetched);
    const sel: Record<number, string> = {}; const act: Record<number, string> = {};
    fetched.forEach(o => { sel[o.id] = o.assigned_driver_id || ""; act[o.id] = ""; });
    setSelectedDrivers(sel); setSelectedActions(act);
    const { data: sd } = await supabase.from("driver_stock").select("*").order("id", { ascending: false });
    setDriverStocks((sd as DriverStock[]) || []);
    const { data: hd } = await supabase.from("order_history").select("*").order("created_at", { ascending: false });
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
    if (error) { alert("Erreur : " + error.message); return false; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, ...extra } : o));
    await addHistory(id, "statut_modifie", `Statut → ${newStatus}`);
    return true;
  };

  const consumeStock = async (order: Order) => {
    const item = driverStocks.find(i => i.driver_id === order.assigned_driver_id && i.product_name.trim().toLowerCase() === (order.product || "").trim().toLowerCase());
    if (!item) { alert("Aucun stock trouvé pour ce livreur/produit."); return false; }
    const qty = Number(order.quantity || 1);
    if (Number(item.quantity) < qty) { alert("Stock insuffisant."); return false; }
    const newQty = Number(item.quantity) - qty;
    const { error } = await supabase.from("driver_stock").update({ quantity: newQty }).eq("id", item.id);
    if (error) { alert("Erreur stock : " + error.message); return false; }
    setDriverStocks(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
    return true;
  };

  const markDelivered = async (order: Order, isGare = false) => {
    const ok = await consumeStock(order);
    if (!ok) return false;
    const now = new Date().toISOString();
    const payload = {
      status: "Livré", logistic_status: isGare ? "Envoyé à la gare" : "Livré",
      payment_status: "Payé", cash_collected: true, cash_collected_at: now,
      cash_collected_by: profile?.full_name || null,
      driver_commission: 2000, closer_commission: 500, commission_calculated: true, delivered_at: now,
    };
    const { error } = await supabase.from("orders").update(payload).eq("id", order.id);
    if (error) { alert("Erreur : " + error.message); return false; }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...payload } : o));
    await addHistory(order.id, isGare ? "envoye_gare" : "livraison_payee", isGare ? "Gare — commissions enregistrées" : "Livré + Payé — commissions enregistrées");
    return true;
  };

  const assignDriver = async (orderId: number) => {
    const driverId = selectedDrivers[orderId];
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) { alert("Livreur introuvable."); return false; }
    const payload = { driver_name: driver.full_name, assigned_driver_id: driver.id, is_assigned: true, assigned_at: new Date().toISOString() };
    const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
    if (error) { alert("Erreur : " + error.message); return false; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payload } : o));
    await addHistory(orderId, "livreur_assigne", `Livreur : ${driver.full_name}`);
    return true;
  };

  const executeAction = async (order: Order, action: string) => {
    setConfirmAction(null);
    if (action === "confirmer")  { const ok = await updateStatus(order.id, "Confirmé"); if (ok) alert("Confirmée ✅"); }
    if (action === "livre_paye") { const ok = await markDelivered(order, false); if (ok) alert("Livrée et payée ✅\nCommissions enregistrées !"); }
    if (action === "gare")       { const ok = await markDelivered(order, true);  if (ok) alert("Envoyée à la gare ✅\nCommissions enregistrées !"); }
    if (action === "annuler")    { const ok = await updateStatus(order.id, "Annulé"); if (ok) alert("Annulée ✅"); }
    if (action === "assigner")   { const ok = await assignDriver(order.id); if (ok) alert("Livreur assigné ✅"); }
    setSelectedActions(prev => ({ ...prev, [order.id]: "" }));
  };

  const handleActionSubmit = (order: Order) => {
    const action = selectedActions[order.id];
    if (!action) { alert("Choisis une action."); return; }
    if (["livre_paye", "annuler", "gare"].includes(action)) setConfirmAction({ order, action });
    else void executeAction(order, action);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.from("orders").insert([{
      ...form, quantity: Number(form.quantity), delivery_type: normDT(form.delivery_type), amount: Number(form.amount),
      cash_collected: false, status: "En attente", logistic_status: "En attente", payment_status: "Non payé",
      is_assigned: false, closer_id: profile?.id || null, closer_name: profile?.full_name || null,
      closer_commission: 0, driver_commission: 0, commission_calculated: false,
    }]).select();
    if (error) alert("Erreur : " + error.message);
    else if (data) {
      const newOrders = data as Order[];
      setOrders([...newOrders, ...orders]);
      if (newOrders[0]) await addHistory(newOrders[0].id, "commande_creee", `Créée pour ${newOrders[0].customer_name}`);
      setForm(EMPTY_FORM);
      alert("Commande créée ✅");
    }
    setLoading(false);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOrder) return;
    const payload = { ...editForm, quantity: Number(editForm.quantity), amount: Number(editForm.amount), delivery_type: normDT(editForm.delivery_type) };
    const { error } = await supabase.from("orders").update(payload).eq("id", editingOrder.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, ...payload } : o));
    await addHistory(editingOrder.id, "commande_modifiee", `Modifiée par ${profile?.full_name}`);
    setEditingOrder(null);
    alert("Commande modifiée ✅");
  };

  const handleAddStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setStockLoading(true);
    const driver = drivers.find(d => d.id === stockForm.driver_id);
    if (!driver) { alert("Choisis un livreur."); setStockLoading(false); return; }
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
    setStockForm(EMPTY_STOCK); alert("Stock ajouté ✅"); setStockLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  if (authLoading) return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: S.text2 }}>Chargement...</div>
    </div>
  );

  const navItems = [
    { id: "dashboard",   label: "📊 Dashboard" },
    { id: "commandes",   label: `📦 Commandes (${enCoursCount})` },
    { id: "creer",       label: "➕ Créer" },
    { id: "stock",       label: "🗄️ Stock" },
    { id: "commissions", label: "💰 Commissions" },
    { id: "produits",    label: "📦 Produits" },
    { id: "equipe",      label: "👥 Équipe" },
    { id: "parametres",  label: "⚙️ Paramètres" },
    { id: "clients",     label: "👥 Clients" },
    { id: "import",      label: "📥 Import" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg, color: S.text, fontFamily: "Inter, system-ui, sans-serif" }}>

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
      <div style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: S.bg, borderBottom: `1px solid ${S.border}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: S.gold }}>Shipivo</div>
          <div style={{ fontSize: 11, color: S.text3 }}>Admin · {profile?.full_name}</div>
        </div>
        {tenantId && <NotificationBell tenantId={tenantId} />}
        <button onClick={handleLogout} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, border: `1px solid ${S.border}`, color: S.text3, backgroundColor: "transparent", cursor: "pointer" }}>Déconnexion</button>
      </div>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${S.border}`, padding: "0 12px", display: "flex", gap: 2, overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
        {navItems.map(n => <NavBtn key={n.id} id={n.id} label={n.label} active={activeView === n.id} onClick={() => setActiveView(n.id)} />)}
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 14px 80px" }}>
        {activeView === "dashboard"   && <DashboardView orders={orders} driverStocks={driverStocks} />}
        {activeView === "commandes"   && <CommandesView orders={orders} drivers={drivers} history={history} selectedDrivers={selectedDrivers} selectedActions={selectedActions} onDriverChange={(id, v) => setSelectedDrivers(p => ({ ...p, [id]: v }))} onActionChange={(id, v) => setSelectedActions(p => ({ ...p, [id]: v }))} onActionSubmit={handleActionSubmit} onEditClick={o => { setEditingOrder(o); setEditForm({ customer_name: o.customer_name, phone: o.phone, city: o.city, address: o.address, product: o.product, quantity: String(o.quantity || 1), amount: String(o.amount || ""), delivery_type: o.delivery_type }); }} />}
        {activeView === "creer"       && <CreerView form={form} loading={loading} onChange={e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))} onSubmit={handleSubmit} />}
        {activeView === "stock"       && <StockView drivers={drivers} driverStocks={driverStocks} stockForm={stockForm} stockLoading={stockLoading} onStockChange={handleStockChange} onStockSubmit={handleAddStock} />}
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
