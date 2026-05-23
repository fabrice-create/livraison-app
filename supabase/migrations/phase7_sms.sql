-- Phase 7 — SMS Africa's Talking
-- Ajouter les colonnes AT dans la table tenants

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS at_username   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS at_api_key    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS at_sender_id  TEXT DEFAULT 'Shipivo';
