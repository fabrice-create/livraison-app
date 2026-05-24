# BUGS CONNUS — Shipivo Dev

## ⚠️ BUG RÉCURRENT #1 — Mauvais fichier Dashboard modifié

### Symptôme
Le nouveau dashboard ne s'affiche pas malgré les modifications. L'ancien dashboard
reste affiché même après plusieurs pushs et rechargements.

### Cause
Il existe DEUX fichiers DashboardView dans le projet :
- `src/components/admin/DashboardView.tsx` — ❌ FICHIER ORPHELIN, NON UTILISÉ
- `src/components/admin/AdminView.tsx` — ✅ VRAI FICHIER, contient une fonction
  `DashboardView` intégrée à l'intérieur

**AdminView.tsx** contient toutes les vues en un seul fichier :
- `DashboardView` (ligne ~5441)
- `CommandesView` (ligne ~21039)
- `CommissionsView` (ligne ~29891)
- `StockView` (ligne ~35079)
- Vue Créer commande (ligne ~64114)

### Solution
Toujours modifier `src/components/admin/AdminView.tsx`
Chercher `// ─── Vue Dashboard ───` pour trouver la bonne section.

---

## ⚠️ BUG RÉCURRENT #2 — Cache Vercel (ancien build affiché)

### Symptôme
Après un push, la page admin affiche encore l'ancien code malgré build "Ready".

### Cause
Vercel met en cache les chunks JS. La branche `dev` est protégée par authentification
Vercel — les onglets incognito demandent une connexion Vercel.

### Solution
1. F12 → onglet Network → cocher "Disable cache"
2. Cliquer "Reload page"
OU
3. Si ça ne marche pas — le problème vient peut-être du mauvais fichier modifié (voir Bug #1)

---

## ⚠️ BUG RÉCURRENT #3 — TypeScript: propriété manquante dans un type

### Symptôme
`Property 'X' does not exist on type 'Y'` dans les logs Vercel.

### Cause fréquente
- Un nouveau champ ajouté en base (Supabase) mais pas dans `src/types/index.ts`
- Ou inversement — champ dans le mauvais type (ex: `is_available` mis dans `Order` au lieu de `Profile`)

### Solution
Toujours vérifier et mettre à jour `src/types/index.ts` avant de pousser du nouveau code
qui utilise de nouveaux champs.

Types concernés :
- `Order` — champs commandes
- `Profile` — champs utilisateurs (dont `is_available`, `last_seen`)
- `DriverStock` — stock livreurs

---

## ⚠️ BUG RÉCURRENT #4 — Propriété dupliquée dans objet S (styles)

### Symptôme
`An object literal cannot have multiple properties with the same name`

### Cause
Quand on ajoute des couleurs dans l'objet `const S = { ... }`, on oublie
qu'une propriété du même nom existe déjà (ex: `gold` ajouté deux fois).

### Solution
Avant d'ajouter une couleur dans S, vérifier ce qui existe déjà dans le fichier.
Ne jamais ajouter sans lire le S actuel.

---

## 📋 Architecture importante à retenir

```
src/components/admin/
├── AdminView.tsx        ← FICHIER PRINCIPAL (contient tout)
│   ├── DashboardView()  ← modifier ici pour le dashboard admin
│   ├── CommandesView()
│   ├── CommissionsView()
│   └── StockView()
├── DashboardView.tsx    ← ORPHELIN — NE PAS MODIFIER
└── AdminPage.tsx        ← routing + chargement données

src/components/closureuse/
└── ClosureuseView.tsx   ← dashboard + vues closureuse

src/components/livreur/
└── LivreurView.tsx      ← dashboard + vues livreur
```

---

## 📋 Colonnes importantes par table Supabase

**tenants** : name, slug, phone, currency, brand_color, logo_url,
  boutique_description, banner_text, banner_on_boutique, banner_on_produit,
  countdown_end, facebook_pixel_id, facebook_access_token, tiktok_pixel_id,
  ga_measurement_id, at_username, at_api_key, at_sender_id

**profiles** : id, email, role, full_name, phone, tenant_id, is_active,
  is_available, last_seen

**orders** : id, tenant_id, customer_name, phone, city, address, product,
  quantity, amount, status, driver_name, closer_name, source, note,
  cash_collected, created_at, confirmed_at, delivered_at

**products** : id, tenant_id, name, price, description, image_url, badge, is_active

**product_images** : id, product_id, tenant_id, image_url, position
