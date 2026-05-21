// components/closureuse/ClosureuseView.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import type { Order, Profile } from "@/types";
import { normalizeRole } from "@/lib/utils";
import { OrderList } from "./OrderList";
import { ClosureuseStats } from "./ClosureuseStats";

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
    alert(`Modal assignation livreur pour commande #${id} — à implémenter`);
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0A0A0F" }}>
      <div className="text-sm" style={{ color: "#9898B0" }}>Chargement...</div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0F", color: "#F8F8FC" }}>
      <header className="sticky top-0 z-10 border-b px-4 py-3"
        style={{ backgroundColor: "#0A0A0F", borderColor: "#1E1E2E" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold" style={{ color: "#F59E0B" }}>Shipivo</h1>
            <p className="text-xs" style={{ color: "#55556A" }}>Espace Closureuse</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: "#9898B0" }}>{profile?.full_name}</p>
            </div>
            <button onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-xs border"
              style={{ borderColor: "#1E1E2E", color: "#9898B0" }}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
        <section className="mb-4">
          <ClosureuseStats orders={orders} commissionPerOrder={500} />
        </section>
        <OrderList orders={orders} onConfirm={handleConfirm} onAssign={handleAssign} onCancel={handleCancel} />
      </main>

      <button className="fixed bottom-6 right-4 flex items-center gap-2 rounded-full px-5 py-3 font-semibold shadow-xl"
        style={{ backgroundColor: "#F59E0B", color: "#000" }}
        onClick={() => alert("Formulaire nouvelle commande — à implémenter")}>
        <span>+</span><span className="text-sm">Nouvelle commande</span>
      </button>
    </div>
  );
}
