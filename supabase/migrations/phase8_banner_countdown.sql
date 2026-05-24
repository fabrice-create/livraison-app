-- Phase 8 — Bandeau défilant + compte à rebours
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS banner_text TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS countdown_end TIMESTAMPTZ DEFAULT NULL;

-- Badge sur les produits
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT NULL;
