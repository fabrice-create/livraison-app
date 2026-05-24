-- Phase 9 — Google Analytics 4
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ga_measurement_id TEXT DEFAULT NULL;
