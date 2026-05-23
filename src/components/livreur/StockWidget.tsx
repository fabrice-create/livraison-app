// components/livreur/StockWidget.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import type { DriverStock, Profile } from "@/types";
import { toast } from "@/components/ui/Toast";

const S = {
  gold: "#F59E0B", goldDark: "#D97706", bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  success: "#4ADE80", successBg: "#052E16",
  info: "#60A5FA", infoBg: "#0C1E3E",
  danger: "#F87171", dangerBg: "#2D0F0F",
  purple: "#C084FC", purpleBg: "#2E1065",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
};

type StockMouvement = {
  id: number; created_at: string; product_name: string;
  mouvement_type: string; quantity: number;
  from_location: string; to_location: string; note?: string | null;
};

interface Props {
  stock: DriverStock[];
  profile: Profile | null;
  onRequestStock: () => void;
  onStockUpdated: () => void;
}

const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function StockWidget({ stock, profile, onRequestStock, onStockUpdated }: Props) {
  const total = stock.reduce((sum, s) => sum + Number(s.quantity), 0);
  const lowStock = stock.filter(s => Number(s.quantity) <= 2);

  const [activeTab, setActiveTab] = useState<"stock" | "historique">("stock");
  const [mouvements, setMouvements] = useState<StockMouvement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [showGive, setShowGive] = useState(false);
  const [otherDrivers, setOtherDrivers] = useState<Profile[]>([]);
  const [otherStocks, setOtherStocks] = useState<DriverStock[]>([]);
  const [fromDriverId, setFromDriverId] = useState("");
  const [toDriverId, setToDriverId] = useState("");
  const [productName, setProductName] = useState("");
  const [giveProductName, setGiveProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [giveQuantity, setGiveQuantity] = useState("1");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showTransfer || showGive) void loadOtherDrivers();
  }, [showTransfer, showGive]);

  useEffect(() => {
    if (activeTab === "historique" && profile) void loadHistory();
  }, [activeTab, profile]);

  useEffect(() => {
    if (fromDriverId) void loadOtherStock(fromDriverId);
  }, [fromDriverId]);

  const loadHistory = async () => {
    if (!profile) return;
    setLoadingHistory(true);
    const { data } = await supabase.from("stock_mouvements")
      .select("*")
      .or(`from_location.eq.${profile.full_name},to_location.eq.${profile.full_name}`)
      .order("created_at", { ascending: false })
      .limit(50);
    setMouvements((data as StockMouvement[]) || []);
    setLoadingHistory(false);
  };

  const loadOtherDrivers = async () => {
    if (!profile) return;
    const { data } = await supabase.from("profiles")
      .select("*").ilike("role", "livreur").eq("tenant_id", profile.tenant_id).neq("id", profile.id);
    setOtherDrivers((data as Profile[]) || []);
  };

  const loadOtherStock = async (driverId: string) => {
    const { data } = await supabase.from("driver_stock")
      .select("*").eq("driver_id", driverId);
    setOtherStocks((data as DriverStock[]) || []);
    setProductName("");
  };

  // Prendre stock chez un collègue
  const handleTake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !fromDriverId || !productName) return;
    setLoading(true);
    const qty = Number(quantity);
    const fromStock = otherStocks.find(s => s.product_name === productName);
    if (!fromStock || fromStock.quantity < qty) {
      toast(`Stock insuffisant. Disponible : ${fromStock?.quantity || 0}`);
      setLoading(false); return;
    }
    await supabase.from("driver_stock").update({ quantity: fromStock.quantity - qty }).eq("id", fromStock.id);
    const myStock = stock.find(s => s.product_name.toLowerCase() === productName.toLowerCase());
    if (myStock) {
      await supabase.from("driver_stock").update({ quantity: myStock.quantity + qty }).eq("id", myStock.id);
    } else {
      await supabase.from("driver_stock").insert([{ driver_id: profile.id, driver_name: profile.full_name, product_name: productName, quantity: qty }]);
    }
    const fromDriver = otherDrivers.find(d => d.id === fromDriverId);
    await supabase.from("stock_mouvements").insert([{
      product_name: productName, mouvement_type: "transfert_livreur", quantity: qty,
      from_location: fromDriver?.full_name || "Livreur", to_location: profile.full_name,
      created_by: profile.full_name,
    }]);
    toast(`✅ ${qty} × ${productName} pris chez ${fromDriver?.full_name}`);
    setShowTransfer(false);
    setFromDriverId(""); setProductName(""); setQuantity("1");
    onStockUpdated();
    setLoading(false);
  };

  // Donner stock à un collègue
  const handleGive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !toDriverId || !giveProductName) return;
    setLoading(true);
    const qty = Number(giveQuantity);
    const myStock = stock.find(s => s.product_name.toLowerCase() === giveProductName.toLowerCase());
    if (!myStock || myStock.quantity < qty) {
      toast(`Stock insuffisant. Tu as : ${myStock?.quantity || 0}`);
      setLoading(false); return;
    }
    await supabase.from("driver_stock").update({ quantity: myStock.quantity - qty }).eq("id", myStock.id);
    const { data: toStockData } = await supabase.from("driver_stock").select("*").eq("driver_id", toDriverId).eq("product_name", giveProductName);
    const toStock = toStockData?.[0];
    if (toStock) {
      await supabase.from("driver_stock").update({ quantity: toStock.quantity + qty }).eq("id", toStock.id);
    } else {
      const toDriver = otherDrivers.find(d => d.id === toDriverId);
      await supabase.from("driver_stock").insert([{ driver_id: toDriverId, driver_name: toDriver?.full_name || "", product_name: giveProductName, quantity: qty }]);
    }
    const toDriver = otherDrivers.find(d => d.id === toDriverId);
    await supabase.from("stock_mouvements").insert([{
      product_name: giveProductName, mouvement_type: "transfert_livreur", quantity: qty,
      from_location: profile.full_name, to_location: toDriver?.full_name || "Livreur",
      created_by: profile.full_name,
    }]);
    toast(`✅ ${qty} × ${giveProductName} donné(s) à ${toDriver?.full_name}`);
    setShowGive(false);
    setToDriverId(""); setGiveProductName(""); setGiveQuantity("1");
    onStockUpdated();
    setLoading(false);
  };

  const inputSt = {
    width: "100%", padding: "10px 12px", background: S.bg, border: `1px solid ${S.border}`,
    borderRadius: 10, color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const,
  };

  return (
    <div>
      {/* Tabs Stock / Historique */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, background: S.card, borderRadius: 12, padding: 4 }}>
        <button onClick={() => setActiveTab("stock")}
          style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeTab === "stock" ? S.gold : "transparent", color: activeTab === "stock" ? "#000" : S.text2 }}>
          📦 Mon stock
        </button>
        <button onClick={() => setActiveTab("historique")}
          style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeTab === "historique" ? S.gold : "transparent", color: activeTab === "historique" ? "#000" : S.text2 }}>
          📋 Historique
        </button>
      </div>

      {/* ── Historique ── */}
      {activeTab === "historique" && (
        <div>
          {loadingHistory ? (
            <p style={{ color: S.text2, fontSize: 13, textAlign: "center", padding: 20 }}>Chargement...</p>
          ) : mouvements.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: S.text3 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📋</p>
              <p style={{ fontSize: 13 }}>Aucun mouvement de stock</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mouvements.map(m => {
                const isIn = m.to_location === profile?.full_name;
                const color = isIn ? S.success : S.danger;
                const labels: Record<string, string> = {
                  entree_entrepot: "➕ Reçu de l'entrepôt",
                  transfert_entrepot_livreur: "➕ Reçu de l'entrepôt",
                  transfert_livreur: isIn ? "📥 Reçu d'un collègue" : "📤 Donné à un collègue",
                  vente_livraison: "🎯 Vendu (livraison)",
                  demande_approuvee: "✅ Demande approuvée",
                };
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 12 }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>{labels[m.mouvement_type] || m.mouvement_type}</p>
                      <p style={{ fontSize: 13, color: S.text, marginBottom: 2 }}>{m.product_name}</p>
                      <p style={{ fontSize: 11, color: S.text2 }}>{m.from_location} → {m.to_location}</p>
                      <p style={{ fontSize: 10, color: S.text3, marginTop: 2 }}>{fmtDate(m.created_at)}</p>
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 700, color }}>{isIn ? "+" : "-"}{m.quantity}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Stock actuel ── */}
      {activeTab === "stock" && (
      <div>
      {/* Stock actuel */}
      <div style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📦</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: S.text }}>Mon stock</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, backgroundColor: S.border, color: S.text3 }}>{total} unités</span>
          </div>
          <button onClick={onRequestStock} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: S.infoBg, color: S.info, border: "none", cursor: "pointer" }}>
            + Demander
          </button>
        </div>

        {lowStock.length > 0 && (
          <div style={{ backgroundColor: S.dangerBg, color: S.danger, borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>
            ⚠️ Stock bas : {lowStock.map(s => s.product_name).join(", ")}
          </div>
        )}

        {stock.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: S.text3 }}>Aucun stock actuellement</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stock.map(item => {
              const isLow = Number(item.quantity) <= 2;
              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: S.bg, borderRadius: 8, padding: "8px 12px" }}>
                  <span style={{ fontSize: 13, color: S.text2 }}>{item.product_name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20, backgroundColor: isLow ? S.dangerBg : S.successBg, color: isLow ? S.danger : S.success }}>{item.quantity}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deux boutons transfert */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <button onClick={() => { setShowTransfer(!showTransfer); setShowGive(false); }}
          style={{ padding: "11px 0", background: showTransfer ? S.purpleBg : S.card, border: `1px solid ${showTransfer ? S.purple : S.border}`, borderRadius: 12, color: showTransfer ? S.purple : S.text2, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          📥 Prendre chez un collègue
        </button>
        <button onClick={() => { setShowGive(!showGive); setShowTransfer(false); }}
          style={{ padding: "11px 0", background: showGive ? "#0c2e1e" : S.card, border: `1px solid ${showGive ? S.success : S.border}`, borderRadius: 12, color: showGive ? S.success : S.text2, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          📤 Donner à un collègue
        </button>
      </div>

      {/* Formulaire — Prendre */}
      {showTransfer && (
        <div style={{ backgroundColor: S.card, border: `1px solid ${S.purple}`, borderRadius: 14, padding: 16, marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: S.purple, marginBottom: 14 }}>📥 Prendre du stock chez un collègue</p>
          <form onSubmit={handleTake} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Collègue source</label>
              <select value={fromDriverId} onChange={e => setFromDriverId(e.target.value)} required style={inputSt}>
                <option value="">Choisir un collègue</option>
                {otherDrivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            {fromDriverId && otherStocks.length === 0 && (
              <p style={{ fontSize: 12, color: S.danger }}>Ce collègue n&apos;a pas de stock disponible.</p>
            )}
            {fromDriverId && otherStocks.length > 0 && (
              <>
                <div>
                  <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Produit</label>
                  <select value={productName} onChange={e => setProductName(e.target.value)} required style={inputSt}>
                    <option value="">Choisir un produit</option>
                    {otherStocks.map(s => <option key={s.id} value={s.product_name}>{s.product_name} (dispo : {s.quantity})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Quantité</label>
                  <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required style={inputSt} />
                </div>
                <button type="submit" disabled={loading}
                  style={{ padding: "11px 0", background: `linear-gradient(135deg, ${S.purple}, #6d28d9)`, border: "none", borderRadius: 10, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {loading ? "..." : "📥 Confirmer"}
                </button>
              </>
            )}
          </form>
        </div>
      )}

      {/* Formulaire — Donner */}
      {showGive && (
        <div style={{ backgroundColor: S.card, border: `1px solid ${S.success}`, borderRadius: 14, padding: 16, marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: S.success, marginBottom: 14 }}>📤 Donner du stock à un collègue</p>
          <form onSubmit={handleGive} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Produit à donner</label>
              <select value={giveProductName} onChange={e => setGiveProductName(e.target.value)} required style={inputSt}>
                <option value="">Choisir un produit</option>
                {stock.map(s => <option key={s.id} value={s.product_name}>{s.product_name} (tu as : {s.quantity})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Collègue destinataire</label>
              <select value={toDriverId} onChange={e => setToDriverId(e.target.value)} required style={inputSt}>
                <option value="">Choisir un collègue</option>
                {otherDrivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Quantité</label>
              <input type="number" min="1" value={giveQuantity} onChange={e => setGiveQuantity(e.target.value)} required style={inputSt} />
            </div>
            <button type="submit" disabled={loading}
              style={{ padding: "11px 0", background: `linear-gradient(135deg, ${S.success}, #16a34a)`, border: "none", borderRadius: 10, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {loading ? "..." : "📤 Confirmer le don"}
            </button>
          </form>
        </div>
      )}
      </div>
      )}
    </div>
  );
}
