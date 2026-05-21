// components/livreur/LivreurView.tsx
"use client";

import { useState, useCallback } from "react";
import { Order, DriverStock } from "@/types/order";
import { DeliveryCard } from "./DeliveryCard";
import { StockWidget } from "./StockWidget";
import { LivreurStats } from "./LivreurStats";
import { colors } from "@/lib/design-tokens";

// --- Mock data (remplacer par Supabase) ---
const MOCK_DELIVERIES: Order[] = [
  {
    id: "ord-002",
    tenant_id: "t-001",
    customer_name: "Kossi Agbéko",
    customer_phone: "+22891223344",
    customer_address: "Adidogomé, rue du marché, maison bleue",
    zone: "Adidogomé",
    city: "Lomé",
    items: [
      { id: "i2", product_name: "TheraWolf Baume 50ml", quantity: 1, unit_price: 5000 },
      { id: "i3", product_name: "TheraWolf Spray", quantity: 1, unit_price: 6000 },
    ],
    total_amount: 11000,
    delivery_fee: 2000,
    status: "confirme",
    source: "direct",
    assigned_driver_name: "Kodjo Mensah",
    assigned_driver_phone: "+22892334455",
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ord-005",
    tenant_id: "t-001",
    customer_name: "Sena Kpakpo",
    customer_phone: "+22896778899",
    customer_address: "Baguida, deuxième maison après le pont",
    zone: "Baguida",
    city: "Lomé",
    items: [
      { id: "i6", product_name: "TheraWolf Baume 100ml", quantity: 1, unit_price: 8500 },
    ],
    total_amount: 8500,
    delivery_fee: 2000,
    status: "confirme",
    source: "whatsapp",
    assigned_driver_name: "Kodjo Mensah",
    assigned_driver_phone: "+22892334455",
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ord-003",
    tenant_id: "t-001",
    customer_name: "Fatou Diallo",
    customer_phone: "+22893445566",
    customer_address: "Tokoin, derrière l'école primaire",
    zone: "Tokoin",
    city: "Lomé",
    items: [
      { id: "i4", product_name: "TheraWolf Baume 100ml", quantity: 3, unit_price: 8500 },
    ],
    total_amount: 25500,
    delivery_fee: 2000,
    status: "livre_paye",
    source: "shopify",
    assigned_driver_name: "Kodjo Mensah",
    assigned_driver_phone: "+22892334455",
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_STOCK: DriverStock[] = [
  { product_id: "p1", product_name: "TheraWolf Baume 100ml", quantity: 8 },
  { product_id: "p2", product_name: "TheraWolf Baume 50ml", quantity: 2 },
  { product_id: "p3", product_name: "TheraWolf Spray", quantity: 5 },
];

function callCustomer(phone: string) {
  window.location.href = `tel:${phone}`;
}

function openWhatsApp(phone: string, name: string) {
  const msg = encodeURIComponent(
    `Bonjour ${name}, je suis en chemin pour votre livraison Shipivo.`
  );
  window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
}

export function LivreurView() {
  const [orders, setOrders] = useState<Order[]>(MOCK_DELIVERIES);
  const [tab, setTab] = useState<"livraisons" | "stock">("livraisons");

  const handleDeliver = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status: "livre_paye", updated_at: new Date().toISOString() }
          : o
      )
    );
  }, []);

  const handleSendToGare = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status: "gare", updated_at: new Date().toISOString() }
          : o
      )
    );
  }, []);

  const handlePhotoProof = useCallback((id: string) => {
    alert(`Ouvrir caméra pour commande ${id} — à implémenter`);
  }, []);

  const handleRequestStock = useCallback(() => {
    alert("Formulaire demande de stock — à implémenter");
  }, []);

  const enCoursCount = orders.filter((o) => o.status === "confirme").length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg, color: colors.textPrimary }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b px-4 py-3"
        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold" style={{ color: colors.gold }}>
              Shipivo
            </h1>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Espace Livreur
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                Kodjo Mensah
              </p>
              <p className="text-[10px]" style={{ color: colors.textMuted }}>
                Livreur · Lomé Nord
              </p>
            </div>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
              style={{ backgroundColor: "#2563EB", color: "#fff" }}
            >
              K
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
        {/* Stats */}
        <section className="mb-4">
          <LivreurStats
            orders={orders}
            objective={10}
            commissionPerDelivery={2000}
          />
        </section>

        {/* Tabs Livraisons / Stock */}
        <div
          className="mb-4 flex gap-1 rounded-xl p-1"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          {(["livraisons", "stock"] as const).map((t) => {
            const isActive = tab === t;
            const label = t === "livraisons" ? "Mes livraisons" : "Mon stock";
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: isActive ? colors.gold : "transparent",
                  color: isActive ? "#000" : colors.textSecondary,
                }}
              >
                {label}
                {t === "livraisons" && enCoursCount > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: isActive ? "rgba(0,0,0,0.2)" : colors.gold,
                      color: isActive ? "#000" : "#000",
                    }}
                  >
                    {enCoursCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenu tab */}
        {tab === "livraisons" ? (
          <div className="flex flex-col gap-3">
            {/* En cours */}
            {orders.filter((o) => o.status === "confirme").length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  À livrer maintenant
                </p>
                <div className="flex flex-col gap-3">
                  {orders
                    .filter((o) => o.status === "confirme")
                    .map((order) => (
                      <DeliveryCard
                        key={order.id}
                        order={order}
                        onDeliver={handleDeliver}
                        onSendToGare={handleSendToGare}
                        onCallCustomer={callCustomer}
                        onWhatsApp={openWhatsApp}
                        onPhotoProof={handlePhotoProof}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Historique */}
            {orders.filter((o) => o.status === "livre_paye" || o.status === "gare").length > 0 && (
              <div className="mt-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Terminées aujourd'hui
                </p>
                <div className="flex flex-col gap-3">
                  {orders
                    .filter((o) => o.status === "livre_paye" || o.status === "gare")
                    .map((order) => (
                      <DeliveryCard
                        key={order.id}
                        order={order}
                        onDeliver={handleDeliver}
                        onSendToGare={handleSendToGare}
                        onCallCustomer={callCustomer}
                        onWhatsApp={openWhatsApp}
                        onPhotoProof={handlePhotoProof}
                      />
                    ))}
                </div>
              </div>
            )}

            {orders.length === 0 && (
              <div
                className="rounded-xl border py-16 text-center text-sm"
                style={{ borderColor: colors.border, color: colors.textMuted }}
              >
                Aucune livraison assignée
              </div>
            )}
          </div>
        ) : (
          <StockWidget stock={MOCK_STOCK} onRequestStock={handleRequestStock} />
        )}
      </main>
    </div>
  );
}
