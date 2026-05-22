// components/livreur/StockWidget.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import type { DriverStock, Profile } from "@/types";

const S = {
  gold: "#F59E0B", goldDark: "#D97706", bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  success: "#4ADE80", successBg: "#052E16",
  info: "#60A5FA", infoBg: "#0C1E3E",
  danger: "#F87171", dangerBg: "#2D0F0F",
  purple: "#C084FC", purpleBg: "#2E1065",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
};

interface Props {
  stock: DriverStock[];
  profile: Profile | null;
  onRequestStock: () => void;
  onStockUpdated: () => void;
}

export function StockWidget({ stock, profile, onRequestStock, onStockUpdated }: Props) {
  const total = stock.reduce((sum, s) => sum + Number(s.quantity), 0);
  const lowStock = stock.filter(s => Number(s.quantity) <= 2);

  const [showTransfer, setShowTransfer] = useState(false);
  const [otherDrivers, setOtherDrivers] = useState<Profile[]>([]);
  const [otherStocks, setOtherStocks] = useState<DriverStock[]>([]);
  const [fromDriverId, setFromDriverId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showTransfer) void loadOtherDrivers();
  }, [showTransfer]);

  useEffect(() => {
    if (fromDriverId) void loadOtherStock(fromDriverId);
  }, [fromDriverId]);

  const loadOtherDrivers = async () => {
    if (!profile) return;
    const { data } = await supabase.from("profiles")
      .select("*").eq("role", "livreur").eq("tenant_id", profile.tenant_id).neq("id", profile.id);
    setOtherDrivers((data as Profile[]) || []);
  };

  const loadOtherStock = async (driverId: string) => {
    const { data } = await supabase.from("driver_stock")
      .select("*").eq("driver_id", driverId);
    setOtherStocks((data as DriverStock[]) || []);
    setProductName("");
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !fromDriverId || !productName) return;
    setLoading(true);
    const qty = Number(quantity);
    const fromStock = otherStocks.find(s => s.product_name === productName);
    if (!fromStock || fromStock.quantity < qty) {
      alert(`Stock insuffisant. Disponible : ${fromStock?.quantity || 0}`);
      setLoading(false); return;
    }
    // Déduire du livreur source
    const { error: e1 } = await supabase.from("driver_stock")
      .update({ quantity: fromStock.quantity - qty }).eq("id", fromStock.id);
    if (e1) { alert("Erreur : " + e1.message); setLoading(false); return; }

    // Ajouter au livreur actuel
    const myStock = stock.find(s => s.product_name.toLowerCase() === productName.toLowerCase());
    if (myStock) {
      await supabase.from("driver_stock").update({ quantity: myStock.quantity + qty }).eq("id", myStock.id);
    } else {
      await supabase.from("driver_stock").insert([{
        driver_id: profile.id, driver_name: profile.full_name,
        product_name: productName, quantity: qty,
      }]);
    }

    // Log mouvement
    const fromDriver = otherDrivers.find(d => d.id === fromDriverId);
    await supabase.from("stock_mouvements").insert([{
      product_name: productName, mouvement_type: "transfert_livreur", quantity: qty,
      from_location: fromDriver?.full_name || "Livreur", to_location: profile.full_name,
      created_by: profile.full_name,
    }]);

    alert(`✅ ${qty} × ${productName} transféré(s) depuis ${fromDriver?.full_name}`);
    setShowTransfer(false);
    setFromDriverId(""); setProductName(""); setQuantity("1");
    onStockUpdated();
    setLoading(false);
  };

  const inputSt = {
    width: "100%", padding: "10px 12px", background: S.bg, border: `1px solid ${S.border}`,
    borderRadius: 10, color: S.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const,
  };

  return (
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

      {/* Bouton transfert */}
      <button onClick={() => setShowTransfer(!showTransfer)}
        style={{ width: "100%", padding: "12px 0", background: showTransfer ? S.purpleBg : S.card, border: `1px solid ${showTransfer ? S.purple : S.border}`, borderRadius: 12, color: showTransfer ? S.purple : S.text2, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: showTransfer ? 14 : 0 }}>
        🔄 {showTransfer ? "Annuler le transfert" : "Prendre du stock chez un collègue"}
      </button>

      {/* Formulaire transfert */}
      {showTransfer && (
        <div style={{ backgroundColor: S.card, border: `1px solid ${S.purple}`, borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: S.purple, marginBottom: 14 }}>🔄 Transfert entre livreurs</p>
          <form onSubmit={handleTransfer} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Livreur source (celui qui a le stock)</label>
              <select value={fromDriverId} onChange={e => setFromDriverId(e.target.value)} required style={inputSt}>
                <option value="">Choisir un collègue</option>
                {otherDrivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>

            {fromDriverId && otherStocks.length === 0 && (
              <p style={{ fontSize: 12, color: S.danger }}>Ce livreur n&apos;a pas de stock disponible.</p>
            )}

            {fromDriverId && otherStocks.length > 0 && (
              <>
                <div>
                  <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Produit</label>
                  <select value={productName} onChange={e => setProductName(e.target.value)} required style={inputSt}>
                    <option value="">Choisir un produit</option>
                    {otherStocks.map(s => (
                      <option key={s.id} value={s.product_name}>{s.product_name} (dispo : {s.quantity})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: S.text2, display: "block", marginBottom: 4 }}>Quantité</label>
                  <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required style={inputSt} />
                </div>
                <button type="submit" disabled={loading}
                  style={{ padding: "12px 0", background: `linear-gradient(135deg, ${S.purple}, #6d28d9)`, border: "none", borderRadius: 10, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {loading ? "Transfert..." : "🔄 Confirmer le transfert"}
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
