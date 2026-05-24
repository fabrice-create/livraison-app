# SHIPIVO — Plateforme SaaS de gestion de livraison

## VISION
Donner aux entrepreneurs africains et internationaux
les outils professionnels pour gérer leur e-commerce
et leurs livraisons, peu importe leur niveau technique.
Chaque e-commerçant est libre de gérer son équipe
comme il le souhaite. Shipivo n'impose rien.

## SLOGAN
"Ship smarter. Deliver faster."

## INFOS TECHNIQUES
- Nom : Shipivo
- Domaine : shipivo.app
- GitHub : github.com/fabrice-create/livraison-app
- Supabase : cghpvmktiqabngzqiblo.supabase.co
- Stack : Next.js + TypeScript + Supabase + Vercel
- Branche dev : dev (travail en cours)
- Branche main : ancienne app — NE PAS TOUCHER

## COMPTES TEST
- Admin test : admin-test@shipivo.app / Admin2026!
- Super Admin : bosbokarbou@gmail.com / Shipivo2026!
- Tenant THERAWOLF : f0b7d463-133b-4f4c-b697-98bd594e5fb1

## INTÉGRATIONS EXTERNES
- Africa's Talking SMS : Username=sandbox, API Key=atsk_6be3d92ee74af8963d1da7899d40fa41aae46972708abd780ef859386f615e9227bc8ff9
- Supabase Storage bucket : shipivo-images (PUBLIC)

## MODÈLE ÉCONOMIQUE
- Starter : 10 000 FCFA/mois
- Pro : 25 000 FCFA/mois
- Business : 50 000 FCFA/mois
- Essai gratuit 14 jours sans carte bancaire

## RÔLES
- super_admin : accès total Shipivo
- admin : e-commerçant, voit uniquement ses données
- manager : accès limité (pas équipe, commissions, produits, paramètres)
- closureuse : confirme/assigne commandes
- livreur : livre commandes, gère son stock

## RÈGLES MÉTIER
- Commission livreur : configurable dans Paramètres (défaut 2000 FCFA)
- Commission closureuse : configurable dans Paramètres (défaut 500 FCFA)
- Commission closureuse = 0 si closer_id absent
- Livreur déduit sa commission avant versement
- Versements par Mobile Money (Flooz, T-Money, Wave) avec capture d'écran obligatoire
- Admin confirme versement après vérification
- Commandes jamais supprimées
- Multi-tenant : chaque e-commerçant voit UNIQUEMENT ses données

## TABLES SUPABASE (RLS désactivé sur toutes)
orders, profiles, tenants, driver_stock, stock_mouvements,
stock_demandes, warehouse_stock, versements, commission_payments, invitations

## COLONNES IMPORTANTES
- tenants : trial_ends_at, driver_commission, closer_commission, currency
- profiles : is_active, tenant_id, role, email
- stock_mouvements : type, from_driver, to_driver (PAS mouvement_type/from_location/to_location)
- versements : driver_id, montant, operateur, capture_url, status, confirmed_at
- invitations : token, role, tenant_id, used, expires_at

## PHASES COMPLÉTÉES ✅

### Phase 0 — Infrastructure
- Next.js + TypeScript + Supabase + Vercel
- Auth Supabase, routing par rôle

### Phase 1 — Commandes
- CRUD commandes complet
- Statuts : En attente → Confirmé → Livré/Gare/Annulé
- Import Excel/CSV

### Phase 2 — Équipe
- Rôles : Admin, Manager, Closureuse, Livreur
- Invitation par lien WhatsApp (7 jours, token unique)
- Page /rejoindre/[token] — création compte automatique
- Activation/désactivation membres

### Phase 3 — Stock
- Entrepôt (warehouse_stock)
- Stock livreur (driver_stock)
- Transferts entrepôt → livreur
- Transferts livreur → livreur
- Demandes de stock (livreur → admin)
- Historique mouvements (admin + livreur)
- Notifications temps réel demandes approuvées

### Phase 4 — Espaces rôles
- AdminView : 4 onglets commandes (Aujourd'hui/En retard/Confirmées/Historique)
- ClosureuseView : 5 onglets
- LivreurView : 5 onglets
- Rôle Manager : accès limité

### Phase 4b — UX
- Toast élégant remplace tous les alert()
- Modal confirm élégant remplace tous les confirm()
- Menu profil (avatar coloré par rôle, déconnexion, paramètres)
- Navigation mobile : emoji + texte court
- Boutons tap targets agrandis

### Phase 5 — Finances ✅ COMPLÈTE
- Caisse par livreur (encaissé − commissions − versements confirmés)
- Versements Mobile Money avec capture d'écran (bucket: shipivo-images)
- Opérateurs : Flooz, T-Money, Wave, Autre
- Notification temps réel admin quand versement reçu
- Admin : confirmer/rejeter versement avec vue capture
- Commissions : payer et donner avances (livreurs + closeurs)
- Rapport financier par période (aujourd'hui/semaine/mois/tout)
- Export Excel (3 feuilles : Rapport, Versements, Commissions)
- Dashboard livreur : bannière montant dû + bouton Verser
- Onglet Commissions livreur : historique commissions + historique versements
- Caisse se remet à zéro après confirmation du versement

### Phase 6 — Multi-pays ✅ COMPLÈTE
- 60+ pays avec drapeaux dans l'inscription
- Sélecteur pays avec barre de recherche
- Devise automatique selon pays (FCFA, NGN, GHS, EUR, USD...)
- Devise configurable dans Paramètres boutique (25+ devises)
- Devise stockée par tenant, appliquée partout

### Système Invitation par lien ✅
- Admin → Équipe → "🔗 Inviter"
- Choix rôle + nom optionnel
- Génération lien avec token (7 jours)
- Bouton WhatsApp pré-rempli + Copier
- Page /rejoindre/[token] : email + mot de passe → compte créé
- Vérification token valide/non expiré/non utilisé
- Redirection vers bon espace selon rôle

### Fix Multi-tenant CRITIQUE ✅
- Toutes les requêtes filtrées par tenant_id
- Chaque e-commerçant voit UNIQUEMENT ses données
- driver_stock, warehouse, mouvements, demandes isolés par tenant

### Fix Inscription e-commerçant ✅
- email + id dans INSERT profiles
- Nettoyage compte Auth si création boutique échoue
- Sélecteur pays avec recherche

## FICHIERS CLÉS
- src/components/admin/AdminView.tsx — espace admin principal
- src/components/admin/FinancesView.tsx — Phase 5 Finances
- src/components/admin/EquipeView.tsx — gestion équipe + invitation
- src/components/admin/ParametresView.tsx — profil + commissions + devise
- src/components/closureuse/ClosureuseView.tsx — 5 onglets closureuse
- src/components/livreur/LivreurView.tsx — 5 onglets livreur
- src/components/livreur/StockWidget.tsx — stock livreur
- src/components/livreur/VersementForm.tsx — versement Mobile Money
- src/components/ui/Toast.tsx — toast + confirm modal
- src/components/ui/ProfileMenu.tsx — menu profil avatar
- src/components/ui/NotificationBell.tsx — cloche notifications
- src/hooks/useIsMobile.ts — hook responsive
- src/lib/auth.ts — createTenantAndAdmin
- src/lib/utils.ts — fmt(), setCurrency(), COUNTRY_CURRENCY
- src/app/signup/page.tsx — inscription e-commerçant (3 étapes)
- src/app/rejoindre/[token]/page.tsx — page invitation membre
- src/app/lib/supabase.js — client Supabase

## PROCHAINES ÉTAPES

### Phase 7 — Communication SMS ✅ COMPLÈTE
- SMS automatique au client à la confirmation (ClosureuseView)
- SMS automatique au client à la livraison (LivreurView)
- Provider : Africa's Talking (Option B — chaque tenant connecte son propre compte)
- Champs AT dans tenants : at_username, at_api_key, at_sender_id
- Section SMS dans ParametresView
- Route API : /api/sms
- Helper : src/lib/sendSms.ts
- Migration SQL : supabase/migrations/phase7_sms.sql
- ⚠️ Test sandbox AT en cours — à valider en production

### Phase 8 — Boutique intégrée ✅ COMPLÈTE
- Devise dynamique selon pays du client (détection IP + conversion taux de change)
- Table exchange_rates — cache taux de change 24h
- Route API /api/rates — taux de change via exchangerate-api.com
- Hook useClientCurrency — détection pays + conversion automatique
- Ville — champ texte libre (tous les pays)
- Galerie multi-photos produit (jusqu'à 10 photos)
- Table product_images en base
- ProduitsView — upload multi-photos avec compression
- Page produit — galerie swipeable + miniatures cliquables
- Page produit — 2 boutons: Ajouter au panier + Commander maintenant
- Catalogue — bouton "Voir le panier" après ajout
- Page confirmation — numéro de commande, récap, infos livraison, WhatsApp
- Formulaire — sélecteur indicatif téléphonique avec détection pays auto
- SEO/Meta dynamique par boutique (Open Graph, titre, description)
- Layout /commander/[boutique]/layout.tsx

### Phase 9 — Intégrations externes ← PROCHAINE
- Facebook Pixel (déjà partiel dans Paramètres)
- TikTok Pixel (déjà partiel dans Paramètres)
- Google Analytics

### Phase 10 — Analytics avancés
- Tableaux de bord avancés
- Taux de conversion, retours

### Phase 11 — PWA Mobile + Photos profil
- App installable sur téléphone (sans Play Store)
- Photos de profil livreurs/admin

### Phase 12 — Monétisation
- Paiement abonnements Starter/Pro/Business

### Phase 13 — Play Store
- App Android (après PWA validée)

## JOURNAL DES SESSIONS

### Session 6 — 24 Mai 2026
- Phase 8 Boutique intégrée complète
- Devise dynamique, galerie photos, page confirmation
- Sélecteur indicatif téléphonique, SEO Meta
- Fix RLS sur products et product_images
- DELIVIO.md mis à jour

### Session 5 — 23 Mai 2026
- Phase 7 SMS Africa's Talking codée complète
- Option B : chaque tenant connecte son propre compte AT
- 2 SMS automatiques : confirmation + livraison
- Route /api/sms + helper sendSms + migration SQL
- Debug sandbox AT en cours (à finaliser en production)
- DELIVIO.md mis à jour

## DÉCISIONS ARCHITECTURE
- CommandesView interne dans AdminView.tsx
- VersementForm : formulaire sur Dashboard, historique dans Commissions
- Invitation par lien plutôt que création manuelle de mot de passe
- PWA avant Play Store
- RLS désactivé pour le dev — à réactiver en production avec politiques correctes
- Devise flexible par tenant (pas imposée par pays)
- Refonte Tailwind complète prévue Phase 11 (avec PWA)
