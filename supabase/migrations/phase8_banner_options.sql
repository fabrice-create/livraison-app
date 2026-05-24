ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS banner_on_boutique BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS banner_on_produit BOOLEAN DEFAULT false;
