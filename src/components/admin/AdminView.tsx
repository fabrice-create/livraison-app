// components/admin/AdminView.tsx
"use client";

import { colors } from "@/lib/design-tokens";

/**
 * AdminView - Espace Admin Client (chaque e-commerçant)
 * Ce composant sera enrichi en Phase 1 avec :
 * - Dashboard revenus
 * - Gestion commandes globales
 * - Gestion équipe (livreurs, closureuses)
 * - Rapports et statistiques
 * - Configuration commissions et zones
 */
export function AdminView() {
  const cards = [
    { icon: "📦", label: "Commandes", value: "47", sub: "12 en cours", color: colors.info },
    { icon: "💰", label: "Revenus du jour", value: "284 500 F", sub: "+18% vs hier", color: colors.success },
    { icon: "🛵", label: "Livreurs actifs", value: "3 / 5", sub: "2 indisponibles", color: colors.gold },
    { icon: "📊", label: "Taux livraison", value: "91%", sub: "Cette semaine", color: colors.success },
  ];

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
              Espace Admin · TheraWolf Shop
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: colors.card, color: colors.textSecondary, border: `1px solid ${colors.border}` }}
            >
              ⚙️ Config
            </button>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
              style={{ backgroundColor: colors.gold, color: "#000" }}
            >
              F
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {/* Titre */}
        <div className="mb-4">
          <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
            Bonjour, Fabrice 👋
          </h2>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>

        {/* Stats grid */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border p-4"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{c.icon}</span>
              </div>
              <div className="text-xl font-bold" style={{ color: c.color }}>
                {c.value}
              </div>
              <div className="text-xs font-medium mt-0.5" style={{ color: colors.textPrimary }}>
                {c.label}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
                {c.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Menu navigation */}
        <div className="grid grid-cols-1 gap-2">
          {[
            { icon: "📋", label: "Toutes les commandes", desc: "Voir et gérer toutes les commandes", path: "/admin/commandes" },
            { icon: "👥", label: "Mon équipe", desc: "Livreurs, closureuses, partenaires", path: "/admin/equipe" },
            { icon: "🏪", label: "Ma boutique", desc: "Produits, catalogue, boutique en ligne", path: "/admin/boutique" },
            { icon: "💳", label: "Finances & commissions", desc: "Caisse, paiements, rapports", path: "/admin/finances" },
            { icon: "📊", label: "Statistiques", desc: "Performance, graphiques, exports", path: "/admin/stats" },
            { icon: "⚙️", label: "Configuration", desc: "Zones, tarifs livraison, commissions", path: "/admin/config" },
          ].map((item) => (
            <button
              key={item.label}
              className="flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors hover:border-yellow-500/30"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              onClick={() => alert(`Navigation vers ${item.path} — à implémenter`)}
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                  {item.label}
                </span>
                <span className="text-xs" style={{ color: colors.textMuted }}>
                  {item.desc}
                </span>
              </div>
              <span className="ml-auto" style={{ color: colors.textMuted }}>›</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
