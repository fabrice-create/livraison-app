// components/closureuse/ClosureuseView.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import type { Order, Profile } from "@/types";
import { normalizeRole } from "@/lib/utils";
import { OrderList } from "./OrderList";
import { ClosureuseStats } from "./ClosureuseStats";

const S = {
  gold: "#F59E0B", bg: "#0A0A0F", border: "#1E1E2E",
  text2: "#9898B0", text3: "#55556A",
};

export function ClosureuseView() {
  const router = useRouter();
  const [orders, setOrders]   = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void init(); }, []);

  const init = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { router.replace("/login"); return; }
    const { data: pd } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!pd) { router.replace("/login"); return; }
    const p = pd as Profile;
    if (normalizeRole(p.role) !== "closureuse") {
      router.replace(normalizeRole(p.role) === "admin" ? "/admin" : "/livreur");
      return;
    }
    setProfile(p);
    const { data: od } = await supabase.from("orders").select("*").order("id", { ascending: false });
    setOrders((od as Order[]) || []);
    setLoading(false);
  };

  const handleConfirm = useCallback(async (id: number) => {
    const { error } = await supabase.from("orders").update({
      status: "Confirmé", confirmed_at: new Date().toISOString()
    }).eq("id", id);
    if (error) { alert("Erreur : " + error.message); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "Confirmé" } : o));
  }, []);

  const handleCancel = useCallback(async (id: number) => {
    const { error } = await supabase.from("orders").update({
      status: "Annulé", cancelled_at: new Date().toISOString()
    }).eq("id", id);
    if (error) { alert("Erreur : " + error.message); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "Annulé" } : o));
  }, []);

  const handleAssign = useCallback((id: number) => {
    alert(`Modal assignation livreur #${id} — bientôt disponible`);
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: S.text2 }}>Chargement...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg, color: "#F8F8FC", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        backgroundColor: S.bg, borderBottom: `1px solid ${S.border}`,
        padding: "12px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: S.gold }}>Shipivo</div>
          <div style={{ fontSize: 11, color: S.text3 }}>Espace Closureuse</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: S.text2 }}>{profile?.full_name}</div>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            backgroundColor: S.gold, color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700,
          }}>{profile?.full_name?.[0]?.toUpperCase() || "C"}</div>
          <button onClick={handleLogout} style={{
            padding: "6px 10px", borderRadius: 8, fontSize: 11,
            border: `1px solid ${S.border}`, color: S.text3,
            backgroundColor: "transparent", cursor: "pointer",
          }}>Quitter</button>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "14px 14px 100px" }}>
        <ClosureuseStats orders={orders} commissionPerOrder={500} />
        <OrderList orders={orders} onConfirm={handleConfirm} onAssign={handleAssign} onCancel={handleCancel} />
      </div>

      {/* FAB */}
      <button
        onClick={() => alert("Formulaire nouvelle commande — bientôt disponible")}
        style={{
          position: "fixed", bottom: 20, right: 16,
          backgroundColor: S.gold, color: "#000",
          borderRadius: 28, padding: "12px 20px",
          fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
        }}>
        + Nouvelle commande
      </button>
    </div>
  );
}
