-- Phase 10: Disponibilité livreurs
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NULL;
