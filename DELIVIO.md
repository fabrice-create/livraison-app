# SHIPIVO — Plateforme SaaS de gestion de livraison

## VISION
Donner aux entrepreneurs africains et internationaux
les outils professionnels pour gérer leur e-commerce
et leurs livraisons, peu importe leur niveau technique.
Chaque e-commerçant est libre de gérer son équipe
comme il le souhaite. Shipivo ne impose rien.

## SLOGAN
"Ship smarter. Deliver faster."

## INFOS TECHNIQUES
- Nom : Shipivo
- Domaine : shipivo.app
- GitHub : github.com/fabrice-create/livraison-app
- Vercel : livraison-app-one.vercel.app
- Supabase : cghpvmktiqabngzqiblo.supabase.co
- Stack : Next.js + TypeScript + Supabase + Vercel
- Branche production : main
- Branche développement : dev

## CE QUI EST FAIT
- App complète : admin, closureuse, livreur
- Gestion commandes, stock, commissions
- Logique En cours / Historique
- Boutons appel direct + WhatsApp client
- Responsive mobile et desktop
- Numéros livreurs dans Supabase
- Livreurs utilisent app en production
- Domaine shipivo.app acheté
- Branche dev créée sur GitHub
- Fichier DELIVIO.md créé
- Phase 0 terminée à 100%
- Phase 1 terminée à 100%
- Phase 2 terminée à 100%

## LES 4 ESPACES DE L APPLICATION

### 1. ESPACE PUBLIC
- Page accueil Shipivo marketing (à faire)
- Page de commande par boutique ✅ FAIT
- Page boutique publique (à faire)
- Page inscription nouveau client ✅ FAIT
- Page connexion ✅ FAIT
- Page mot de passe oublié ✅ FAIT

### 2. SUPER ADMIN - Fabrice
- Voir TOUT : tous clients, tous pays
- Toutes les finances globales
- Gestion des abonnements clients
- Statistiques globales
- Alertes importantes

### 3. ADMIN CLIENT - chaque e-commerçant
- Dashboard de son business
- Gestion de son équipe
- Ses commandes, stock, finances
- Sa boutique en ligne
- Ses rapports et statistiques
- Gestion multi-pays
- Gestion partenaires locaux
- Configuration commissions selon ses accords

### 4. ESPACE EQUIPE
- Closureuse : reçoit et valide commandes
- Livreur : livre et finalise
- Partenaire pays : supervise son pays

## BASE DE DONNEES COMPLETE

### Plateforme
- super_admins ✅ créée + Fabrice ajouté
- tenants ✅ créée + THERAWOLF ajouté
- subscriptions ✅ créée

### Géographie
- countries (à créer)
- zones (à créer)

### Équipe
- profiles ✅ avec user_id ajouté
- partners (à créer)
- login_logs (à créer)

### Produits
- products ✅ créée + THERAWOLF Balm ajouté
- product_categories (à créer)
- stock_central (existante)
- driver_stock (existante)
- stock_movements (à créer)
- stock_requests (à créer)

### Commandes
- orders ✅ existante avec tenant_id
- customers (à créer)
- order_items (à créer)
- order_history ✅ existante
- order_returns (à créer)
- order_disputes (à créer)

### Finances
- commission_rules (existante)
- commissions (existante)
- commission_payments (à créer)
- cash_reconciliation (à créer)
- advances (à créer)
- delivery_fees → colonne delivery_fee sur tenants ✅

### Boutique
- boutiques (à créer)
- boutique_pages (à créer)

### Médias
- media_files (à créer)

### Communication
- notifications (à créer)
- messages (à créer)
- announcements (à créer)
- sms_logs (à créer)

### Performance
- driver_objectives (à créer)

### Intégrations
- webhooks (à créer)
- webhook_logs (à créer)

## SOURCES DE COMMANDES
Toutes arrivent au même endroit chez la closureuse :
- Widget WordPress intégré
- Connexion Shopify automatique
- Connexion YouCan automatique
- Connexion WooCommerce automatique
- Connexion Tally automatique
- Lien direct shipivo.app/commander/boutique ✅ FAIT
- Lien WhatsApp optimisé
- Boutique Shipivo intégrée
- Google Forms via script

## DESIGN SYSTEM

### Logo Shipivo
- S géométrique dans carré doré #F59E0B ✅ FAIT
- Texte "Shipivo" bold 800 blanc
- Slogan "SHIP SMARTER · DELIVER FASTER" gris
- Composant réutilisable : src/components/ui/ShipivoLogo.tsx ✅

### Identité visuelle
- Style : moderne sombre professionnel
- Référence : Stripe, Linear, Notion
- Effet voulu : WAOUH à l ouverture

### Couleurs
- Or principal : #F59E0B
- Fond : #0A0A0F
- Cartes : #111118
- Bordures : #1E1E2E
- Succès : #4ADE80
- Info : #60A5FA
- Danger : #F87171
- Warning : #FB923C

### Typographie
- Police : Inter
- Titres : 24-32px gras
- Corps : 14-16px normal
- Petit texte : 12-13px

### Responsive
- Téléphone : moins de 768px
- Tablette : 768 à 1024px
- Ordinateur : plus de 1024px
- Grand écran : plus de 1440px

## MODELE ECONOMIQUE

### Plans
- Essai gratuit : 14 jours sans carte bancaire
- Starter : 10 000 FCFA par mois
- Pro : 25 000 FCFA par mois
- Business : 50 000 FCFA par mois
- Enterprise : Sur devis

### Paiement
- FedaPay pour Afrique
- Stripe pour international
- Mobile Money prévu

## PLAN DE DEVELOPPEMENT

### PHASE 0 - Préparation ✅ TERMINÉE
- Domaine shipivo.app acheté
- Branche dev créée
- Restructuration code en composants
- Mise à jour base de données Supabase
- Configuration sécurité RLS

### PHASE 1 - Multi-tenant ✅ TERMINÉE
- Chaque client a son espace isolé ✅
- Page inscription nouveau client ✅
- Page connexion améliorée ✅
- Mot de passe oublié ✅
- Redirection automatique selon rôle ✅
- Fabrice créé comme super admin ✅
- lib/auth.ts avec getUserProfile + getRedirectByRole ✅
- createTenantAndAdmin automatique à l inscription ✅
- Logo Shipivo premium S géométrique doré ✅

### PHASE 2 - Page commande publique ✅ TERMINÉE
- shipivo.app/commander/boutique ✅
- Catalogue produits avec photos et prix ✅
- Panier multi-produits ✅
- Total calculé automatiquement ✅
- Formulaire client nom téléphone ville adresse ✅
- Compatible mobile ✅
- Frais livraison configurés par e-commerçant ✅
- 0 FCFA = livraison gratuite affiché en vert ✅
- Bouton WhatsApp après commande ✅
- THERAWOLF Balm 15 000 FCFA testé et fonctionnel ✅

### PHASE 3 - Dashboard Admin ← PROCHAINE ÉTAPE
- Interface pour gérer ses produits
- Voir et gérer ses commandes
- Configurer son équipe (ajouter livreur, closureuse)
- Configurer frais livraison et commissions
- Voir ses statistiques

### PHASE 4 - Stock avancé
- Stock central
- Distribution livreurs
- Transfert entre livreurs
- Alertes stock bas
- Demande stock par livreur
- Historique mouvements

### PHASE 5 - Finances avancées
- Réconciliation caisse journalière
- Paiement commissions enregistré
- Avances sur commission
- Rapport financier par pays
- Multi-devises

### PHASE 6 - Multi-pays
- Gestion pays
- Partenaires locaux
- Dashboard par pays
- Rapport par pays
- Anti-fraude

### PHASE 7 - Communication
- Notifications temps réel
- SMS automatiques
- Messagerie interne
- Annonces équipe
- Résumé journalier WhatsApp

### PHASE 8 - Boutique intégrée
- shipivo.app/boutique/nom
- Catalogue public
- Pages produit
- Panier simple
- Personnalisable

### PHASE 9 - Intégrations externes
- Webhook Tally
- Widget WordPress
- Shopify automatique
- YouCan automatique
- WooCommerce automatique
- Bot WhatsApp

### PHASE 10 - Analytics
- Graphiques revenus
- Performance livreurs
- Export PDF Excel

### PHASE 11 - PWA Mobile
- Installable sur téléphone
- Notifications push
- Mode hors ligne partiel

### PHASE 12 - Monétisation
- Plans et limites automatiques
- Paiement FedaPay et Stripe
- Période essai 14 jours
- Factures automatiques

### PHASE 13 - Play Store
- App Android native
- Publication Google Play
- Mode hors ligne complet

## COMMENT BRIEFER CLAUDE
Au début de chaque nouveau chat copie-colle
tout le contenu de ce fichier puis ajoute :
Aujourd hui on va faire : [ce que tu veux faire]

## JOURNAL DES SESSIONS

### Session 1 - Mai 2026
- Création app complète admin closureuse livreur
- Design responsive mobile desktop
- Commissions automatiques livreur et closureuse
- Boutons appel direct et WhatsApp
- Logique En cours Historique
- Numéros livreurs ajoutés dans Supabase
- App déployée sur Vercel utilisée par les livreurs
- Domaine shipivo.app acheté
- Branche dev créée sur GitHub
- Fichier DELIVIO.md créé
- Structure complète Shipivo définie
- Commissions flexibles par e-commerçant
- Frais livraison configurables
- Photos et médias ajoutés à la structure
- Table media_files ajoutée base de données

### Session 2 - 21 Mai 2026
- Restructuration complète en composants React
- Nouveaux composants : ClosureuseView, LivreurView, AdminView
- Composants partagés : OrderStatusBadge, SourceBadge
- Pages slim page.tsx pour admin, closureuse, livreur
- Design 100% styles inline (abandon Tailwind v4 instable)
- Design tokens centralisés dans lib/design-tokens.ts
- Types partagés dans types/order.ts
- AdminView complet : Dashboard + Commandes + Créer + Stock + Commissions
- Vues connectées à Supabase avec auth et redirection par rôle
- Migration base de données Supabase complète
- 37 tables créées dont tenants, subscriptions, super_admins
- RLS activé sur toutes les nouvelles tables
- Phase 0 terminée à 100%

### Session 3 - 21 Mai 2026
- Phase 1 Multi-tenant terminée à 100%
- Page login redesignée avec logo premium S doré
- Redirection automatique par rôle (super_admin admin closureuse livreur)
- Page signup 3 étapes avec création tenant automatique
- Page forgot-password avec envoi email
- lib/auth.ts : getUserProfile getRedirectByRole createTenantAndAdmin
- Fabrice ajouté comme super_admin dans Supabase
- Colonne user_id ajoutée sur profiles et super_admins
- URL Supabase configurée pour Vercel preview
- Logo Shipivo premium créé : S géométrique dans carré doré
- Composant ShipivoLogo.tsx réutilisable créé
- Logo intégré sur login signup forgot-password
- Phase 2 Page commande publique terminée à 100%
- src/app/commander/[boutique]/page.tsx créé
- Catalogue produits avec panier multi-produits
- Frais livraison configurés par e-commerçant (delivery_fee sur tenants)
- THERAWOLF : delivery_fee = 0 livraison gratuite
- Tenant THERAWOLF créé avec slug therawolf
- Produit THERAWOLF Balm 50ml 15000 FCFA créé
- RLS public read activé sur tenants et products
- Page testée et fonctionnelle sur Vercel
- Prochaine étape : Phase 3 Dashboard Admin
