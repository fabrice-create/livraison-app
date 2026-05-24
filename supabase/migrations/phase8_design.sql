-- Phase 8 Design — Personnalisation boutique
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#F59E0B',
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS boutique_description TEXT DEFAULT NULL;
