-- ============================================================
-- Phase 13 — Multi-Zones/Pays Shipivo
-- ============================================================

-- 1. Table zones
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  pays TEXT NOT NULL,
  emoji TEXT DEFAULT '🌍',
  frais_livraison INTEGER DEFAULT 0,
  devise TEXT DEFAULT 'FCFA',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zones_tenant ON zones(tenant_id);

-- 2. Colonne zone_id sur orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zone_nom TEXT DEFAULT NULL;

-- 3. Colonne zone_id sur profiles (livreurs/closeurs)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zone_nom TEXT DEFAULT NULL;

-- 4. RLS zones
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_manage_own_zones" ON zones
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "super_admin_all_zones" ON zones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
  );
