// components/livreur/LivreurView.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import type { Order, Profile, DriverStock } from "@/types";
import { normalizeRole } from "@/lib/utils";
import { DeliveryCard } from "./DeliveryCard";
import { StockWidget } from "./StockWidget";
import { LivreurStats } from "./LivreurStats";

const S = {
  gold: "#F59E0B", bg: "#0A0A0F", card: "#111118", border: "#1E1E2E",
  text: "#F8F8FC", text2: "#9898B0", text3: "#55556A",
};

export function LivreurView() {
  const router = useRouter();
  const [orders, setOrders]   = useState<Order[]>([]);
  const [stock, setStock]     = useState<DriverStock[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"livraisons" | "stock">("livraisons");

  useEffect(() => { void init(); }, []);

  const init = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { router.replace("/login"); return; }
    const { data: pd } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!pd) { router.replace("/login"); return; }
    const p = pd as Profile;
    if (normalizeRole(p.role) !== "livreur") {
      router.replace(normalizeRole(p.role) === "admin" ? "/admin" : "/closureuse");
      return;
    }
    setProfile(p);
    const { data: od } = await supabase.from("orders")
      .select("*").eq("assigned_driver_id", user.id).order("id", { ascending: false });
    setOrders((od as Order[]) || []);
    const { data: sd } = await supabase.from("driver_stock").select("*").eq("driver_id", user.id);
    setStock((sd as DriverStock[]) || []);
    setLoading(false);
  };

  const handleDeliver = useCallback(async (id: number) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const now = new Date().toISOString();
    const payload = {
      status: "Livré", logistic_status: "Livré", payment_status: "Payé",
      cash_collected: true, cash_collected_at: now,
      cash_collected_by: profile?.full_name || null,
      driver_commission: 2000, closer_commission: 500,
      commission_calculated: true, delivered_at: now,
    };
    const { error } = await supabase.from("orders").update(payload).eq("id", id);
    if (error) { alert("Erreur : " + error.message); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...payload } : o));
    alert("Livré + Payé ✅\nCommissions enregistrées !");
  }, [orders, profile]);

  const handleSendToGare = useCallback(async (id: number) => {
    const now = new Date().toISOString();
    const payload = {
      status: "Livré", logistic_status: "Envoyé à la gare", payment_status: "Payé",
      cash_collected: true, cash_collected_at: now,
      cash_collected_by: profile?.full_name || null,
      driver_commission: 2000, closer_commission: 500,
      commission_calculated: true, delivered_at: now,
    };
    const { error } = await supabase.from("orders").update(payload).eq("id", id);
    if (error) { alert("Erreur : " + error.message); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...payload } : o));
    alert("Envoyé à la gare ✅");
  }, [profile]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  const enCours  = orders.filter(o => o.status === "Confirmé");
  const termines = orders.filter(o => o.status === "Livré");

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: S.text2 }}>Chargement...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg, color: S.text, fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        backgroundColor: S.bg, borderBottom: `1px solid ${S.border}`,
        padding: "12px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: S.gold }}>Shipivo</div>
          <div style={{ fontSize: 11, color: S.text3 }}>Espace Livreur</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: S.text2 }}>{profile?.full_name}</div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            backgroundColor: "#2563EB", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700,
          }}>{profile?.full_name?.[0]?.toUpperCase() || "L"}</div>
          <button onClick={handleLogout} style={{
            padding: "6px 10px", borderRadius: 8, fontSize: 11,
            border: `1px solid ${S.border}`, color: S.text3,
            backgroundColor: "transparent", cursor: "pointer",
          }}>Quitter</button>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "14px 14px 100px" }}>

        {/* Stats */}
        <LivreurStats orders={orders} objective={10} commissionPerDelivery={2000} />

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 4, backgroundColor: S.card,
          border: `1px solid ${S.border}`, borderRadius: 12,
          padding: 4, marginBottom: 14,
        }}>
          {(["livraisons", "stock"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "8px 0", borderRadius: 9,
              fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
              backgroundColor: tab === t ? S.gold : "transparent",
              color: tab === t ? "#000" : S.text2,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {t === "livraisons" ? "Mes livraisons" : "Mon stock"}
              {t === "livraisons" && enCours.length > 0 && (
                <span style={{
                  backgroundColor: tab === t ? "rgba(0,0,0,0.2)" : S.gold,
                  color: "#000", borderRadius: 20,
                  padding: "1px 7px", fontSize: 11, fontWeight: 700,
                }}>{enCours.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Livraisons */}
        {tab === "livraisons" && (
          <div>
            {enCours.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: S.text3, marginBottom: 8 }}>
                  À livrer maintenant
                </div>
                {enCours.map(order => (
                  <DeliveryCard key={order.id} order={order}
                    onDeliver={handleDeliver}
                    onSendToGare={handleSendToGare}
                    onPhotoProof={id => alert(`Photo preuve #${id} — bientôt disponible`)} />
                ))}
              </div>
            )}

            {termines.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: S.text3, marginBottom: 8 }}>
                  Terminées aujourd'hui
                </div>
                {termines.map(order => (
                  <DeliveryCard key={order.id} order={order}
                    onDeliver={handleDeliver}
                    onSendToGare={handleSendToGare}
                    onPhotoProof={id => alert(`Photo #${id}`)} />
                ))}
              </div>
            )}

            {orders.length === 0 && (
              <div style={{
                border: `1px solid ${S.border}`, borderRadius: 14,
                padding: "48px 0", textAlign: "center",
                fontSize: 13, color: S.text3,
              }}>
                Aucune livraison assignée
              </div>
            )}
          </div>
        )}

        {/* Stock */}
        {tab === "stock" && (
          <StockWidget stock={stock} profile={profile} onRequestStock={() => alert("Demande de stock — bientôt disponible")} onStockUpdated={() => {
            supabase.from("driver_stock").select("*").eq("driver_id", profile?.id || "").then(({ data }) => { if (data) setStock(data as DriverStock[]); });
          }} />
        )}
      </div>
    </div>
  );
}
