-- Phase 8 — Conversion devises
-- Table pour stocker les taux de change en cache

CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  base_currency TEXT NOT NULL,
  rates JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour accès rapide
CREATE INDEX IF NOT EXISTS idx_exchange_rates_base ON exchange_rates(base_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated ON exchange_rates(updated_at DESC);
