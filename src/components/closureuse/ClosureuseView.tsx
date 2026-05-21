// components/closureuse/ClosureuseView.tsx
"use client";

import { useState, useCallback } from "react";
import { Order } from "@/types/order";
import { OrderList } from "./OrderList";
import { ClosureuseStats } from "./ClosureuseStats";
import { colors } from "@/lib/design-tokens";

// --- Données de test (à remplacer par Supabase) ---
const MOCK_ORDERS: Order[] = [
  {
    id: "ord-001",
    tenant_id: "t-001",
    customer_name: "Aminata Koné",
    customer_phone: "+22890112233",
    customer_address: "Quartier Bè, près de la pharmacie centrale",
    zone: "Bè",
    city: "Lomé",
    items: [
      { id: "i1", product_name: "TheraWolf Baume 100ml", quantity: 2, unit_price: 8500 },
    ],
    total_amount: 17000,
    delivery_fee: 2000,
    status: "en_attente",
    source: "whatsapp",
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ord-002",
    tenant_id: "t-001",
    customer_name: "Kossi Agbéko",
    customer_phone: "+22891223344",
    customer_address: "Adidogomé, rue du marché",
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
    assigned_driver_name: "Koffi Atayi",
    assigned_driver_phone: "+22894556677",
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ord-004",
    tenant_id: "t-001",
    customer_name: "Abibou Traoré",
    customer_phone: "+22895667788",
    customer_address: "Avénou",
    zone: "Avénou",
    city: "Lomé",
    items: [
      { id: "i5", product_name: "TheraWolf Baume 50ml", quantity: 1, unit_price: 5000 },
    ],
    total_amount: 5000,
    delivery_fee: 2000,
    status: "en_attente",
    source: "tally",
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function ClosureuseView() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);

  const handleConfirm = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, status: "confirme", updated_at: new Date().toISOString() } : o
      )
    );
  }, []);

  const handleCancel = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, status: "annule", updated_at: new Date().toISOString() } : o
      )
    );
  }, []);

  const handleAssign = useCallback((id: string) => {
    // À connecter à la modal d'assignation livreur
    alert(`Modal d'assignation pour commande ${id} — à implémenter`);
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: colors.bg, color: colors.textPrimary }}
    >
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
              Espace Closureuse
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                Marie Adjoua
              </p>
              <p className="text-[10px]" style={{ color: colors.textMuted }}>
                Closureuse
              </p>
            </div>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
              style={{ backgroundColor: colors.gold, color: "#000" }}
            >
              M
            </div>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
        {/* Stats */}
        <section className="mb-4">
          <ClosureuseStats orders={orders} commissionPerOrder={500} />
        </section>

        {/* Commandes */}
        <section>
          <OrderList
            orders={orders}
            onConfirm={handleConfirm}
            onAssign={handleAssign}
            onCancel={handleCancel}
          />
        </section>
      </main>

      {/* FAB Nouvelle commande */}
      <button
        className="fixed bottom-6 right-4 flex items-center gap-2 rounded-full px-5 py-3 font-semibold shadow-2xl"
        style={{ backgroundColor: colors.gold, color: "#000" }}
      >
        <span className="text-lg">+</span>
        <span className="text-sm">Nouvelle commande</span>
      </button>
    </div>
  );
}
