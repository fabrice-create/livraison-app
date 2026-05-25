-- ============================================================
-- Phase 14 — Page de vente produit Shipivo
-- ============================================================

-- Table produits enrichie
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Infos de base
  nom TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  prix INTEGER NOT NULL DEFAULT 0,
  prix_barre INTEGER DEFAULT NULL,
  devise TEXT DEFAULT 'FCFA',
  badge TEXT DEFAULT NULL, -- PROMO, NOUVEAU, BEST-SELLER, RUPTURE
  is_active BOOLEAN DEFAULT true,

  -- Images (jusqu'à 5)
  image_principale TEXT DEFAULT NULL,
  images JSONB DEFAULT '[]',

  -- Page de vente — Sections
  -- Hero
  hero_titre TEXT DEFAULT NULL,
  hero_sous_titre TEXT DEFAULT NULL,
  hero_cta_texte TEXT DEFAULT 'Commander maintenant',
  hero_cta_couleur TEXT DEFAULT NULL,

  -- Problème
  section_probleme_active BOOLEAN DEFAULT false,
  section_probleme_titre TEXT DEFAULT 'Vous souffrez de ça ?',
  section_probleme_items JSONB DEFAULT '[]', -- [{emoji, texte}]

  -- Solution / Bénéfices
  section_benefices_active BOOLEAN DEFAULT false,
  section_benefices_titre TEXT DEFAULT 'La solution',
  section_benefices_items JSONB DEFAULT '[]', -- [{emoji, titre, texte}]

  -- Composition / Ingrédients
  section_composition_active BOOLEAN DEFAULT false,
  section_composition_titre TEXT DEFAULT 'Composition',
  section_composition_items JSONB DEFAULT '[]', -- [{nom, description, image}]

  -- Témoignages
  section_temoignages_active BOOLEAN DEFAULT false,
  section_temoignages_titre TEXT DEFAULT 'Ce qu''ils en disent',
  section_temoignages_items JSONB DEFAULT '[]', -- [{nom, ville, texte, note, photo}]

  -- Comparaison
  section_comparaison_active BOOLEAN DEFAULT false,
  section_comparaison_titre TEXT DEFAULT 'Pourquoi nous ?',
  section_comparaison_items JSONB DEFAULT '[]', -- [{critere, nous, concurrents}]

  -- FAQ
  section_faq_active BOOLEAN DEFAULT false,
  section_faq_titre TEXT DEFAULT 'Questions fréquentes',
  section_faq_items JSONB DEFAULT '[]', -- [{question, reponse}]

  -- Garantie
  section_garantie_active BOOLEAN DEFAULT false,
  section_garantie_texte TEXT DEFAULT 'Satisfait ou remboursé 30 jours',
  section_garantie_icone TEXT DEFAULT '🛡️',

  -- Comment ça marche
  section_utilisation_active BOOLEAN DEFAULT false,
  section_utilisation_titre TEXT DEFAULT 'Comment ça marche ?',
  section_utilisation_items JSONB DEFAULT '[]', -- [{etape, titre, texte, image}]

  -- Compte à rebours
  countdown_active BOOLEAN DEFAULT false,
  countdown_texte TEXT DEFAULT 'Offre expire dans',
  countdown_end TIMESTAMPTZ DEFAULT NULL,

  -- Design de la page
  theme TEXT DEFAULT 'dark', -- dark, light, custom
  font TEXT DEFAULT 'Inter', -- Inter, Poppins, Montserrat, Playfair Display, Bebas Neue
  couleur_fond TEXT DEFAULT '#080810',
  couleur_accent TEXT DEFAULT NULL, -- hérite de brand_color si null
  couleur_texte TEXT DEFAULT '#F8F8FC',
  couleur_bouton TEXT DEFAULT NULL,

  -- Stats
  vues INTEGER DEFAULT 0,
  commandes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_manage_own_products" ON products
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "public_read_active_products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "super_admin_all_products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
  );
