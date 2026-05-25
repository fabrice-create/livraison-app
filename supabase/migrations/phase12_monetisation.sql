-- ============================================================
-- Phase 12 — Monétisation Shipivo
-- Abonnements + Paiements (Manuel + CinetPay)
-- ============================================================

-- 1. Colonnes sur tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','expired','cancelled')),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS cinetpay_customer_id TEXT DEFAULT NULL;

-- 2. Table subscriptions (historique abonnements)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('trial','starter','pro','business','enterprise')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','cancelled','pending')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  payment_method TEXT DEFAULT 'manual'
    CHECK (payment_method IN ('manual','cinetpay','virement')),
  payment_ref TEXT DEFAULT NULL,
  note TEXT DEFAULT NULL,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table payments (log paiements)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  method TEXT NOT NULL DEFAULT 'manual'
    CHECK (method IN ('manual','cinetpay','virement')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','success','failed','refunded')),
  cinetpay_transaction_id TEXT DEFAULT NULL,
  cinetpay_payment_url TEXT DEFAULT NULL,
  reference TEXT DEFAULT NULL,
  note TEXT DEFAULT NULL,
  paid_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Index performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 5. RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_subscriptions" ON subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "super_admin_all_payments" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_read_own_subscription" ON subscriptions
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "tenant_read_own_payments" ON payments
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
