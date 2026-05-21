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
    const { data: sd } = await supabase.from("driver_stock")
      .select("*").eq("driver_id", user.id);
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

  const enCoursCount = orders.filter(o => o.status === "Confirmé").length;

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
            <p className="text-xs" style={{ color: "#55556A" }}>Espace Livreur</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium" style={{ color: "#9898B0" }}>{profile?.full_name}</p>
            <button onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-xs border"
              style={{ borderColor: "#1E1E2E", color: "#9898B0" }}>Déconnexion</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
        <section className="mb-4">
          <LivreurStats orders={orders} objective={10} commissionPerDelivery={2000} />
        </section>

        <div className="mb-4 flex gap-1 rounded-xl p-1"
          style={{ backgroundColor: "#111118", border: "1px solid #1E1E2E" }}>
          {(["livraisons", "stock"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all"
              style={{ backgroundColor: tab === t ? "#F59E0B" : "transparent", color: tab === t ? "#000" : "#9898B0" }}>
              {t === "livraisons" ? "Mes livraisons" : "Mon stock"}
              {t === "livraisons" && enCoursCount > 0 && (
                <span className="rounded-full px-1.5 py-0.5 text-[11px] font-bold"
                  style={{ backgroundColor: tab === t ? "rgba(0,0,0,0.2)" : "#F59E0B", color: "#000" }}>
                  {enCoursCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "livraisons" ? (
          <div className="flex flex-col gap-3">
            {orders.filter(o => o.status === "Confirmé").length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#55556A" }}>
                  À livrer maintenant
                </p>
                {orders.filter(o => o.status === "Confirmé").map(order => (
                  <DeliveryCard key={order.id} order={order}
                    onDeliver={handleDeliver} onSendToGare={handleSendToGare}
                    onPhotoProof={id => alert(`Photo preuve #${id} — à implémenter`)} />
                ))}
              </div>
            )}
            {orders.filter(o => o.status === "Livré").length > 0 && (
              <div className="mt-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#55556A" }}>
                  Terminées aujourd'hui
                </p>
                {orders.filter(o => o.status === "Livré").map(order => (
                  <DeliveryCard key={order.id} order={order}
                    onDeliver={handleDeliver} onSendToGare={handleSendToGare}
                    onPhotoProof={id => alert(`Photo #${id}`)} />
                ))}
              </div>
            )}
            {orders.length === 0 && (
              <div className="rounded-xl border py-16 text-center text-sm"
                style={{ borderColor: "#1E1E2E", color: "#55556A" }}>
                Aucune livraison assignée
              </div>
            )}
          </div>
        ) : (
          <StockWidget stock={stock} onRequestStock={() => alert("Demande de stock — à implémenter")} />
        )}
      </main>
    </div>
  );
}
