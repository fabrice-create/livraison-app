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
- Vercel preview : livraison-app-git-dev-fabrice-creates-projects.vercel.app
- Supabase : cghpvmktiqabngzqiblo.supabase.co
- Stack : Next.js + TypeScript + Supabase + Vercel
- Branche production : main
- Branche développement : dev

## PLAN DE DEVELOPPEMENT

### PHASE 0 - Préparation ✅ TERMINÉE
- Domaine shipivo.app acheté
- Branche dev créée
- Restructuration code en composants
- Design tokens centralisés
- Types partagés
- RLS activé sur toutes les tables

### PHASE 1 - Auth + Multi-tenant ✅ TERMINÉE
- Page login redesignée avec logo premium ✅
- Redirection automatique par rôle ✅
- Page signup 3 étapes ✅
- Création tenant automatique à l inscription ✅
- Page forgot-password ✅
- lib/auth.ts : getUserProfile, getRedirectByRole, createTenantAndAdmin ✅
- Fabrice ajouté comme super_admin ✅
- Logo Shipivo premium S géométrique doré ✅
- Composant ShipivoLogo.tsx ✅

### PHASE 2 - Page commande publique ✅ TERMINÉE
- shipivo.app/commander/boutique ✅
- Catalogue produits avec photos et prix ✅
- Panier multi-produits ✅
- Total calculé automatiquement ✅
- Formulaire client complet ✅
- Frais livraison configurés par e-commerçant ✅
- 0 FCFA = livraison gratuite affiché automatiquement ✅
- Bouton WhatsApp après commande ✅
- Compatible mobile ✅
- THERAWOLF testé et fonctionnel ✅

### PHASE 2b - Dashboard Admin ← PROCHAINE ÉTAPE
L e-commerçant doit pouvoir tout gérer lui-même
sans passer par Supabase ou par Fabrice.

#### Gestion produits
- Voir tous ses produits
- Ajouter un produit (nom, prix, description, photo)
- Modifier un produit
- Activer / désactiver un produit

#### Gestion équipe
- Voir ses livreurs et closureuses
- Ajouter un membre (nom, téléphone, rôle)
- Désactiver un membre

#### Configuration boutique
- Modifier le nom de la boutique
- Changer les frais de livraison
- Configurer les commissions livreur et closureuse

#### Tracking et publicité
- Entrer son Pixel ID Facebook
- Entrer son Token API Conversions Facebook
- Entrer son Pixel TikTok
- Événements trackés automatiquement :
  ViewContent quand page chargée
  AddToCart quand produit ajouté
  Purchase quand commande confirmée
- Envoi événements côté serveur via API Conversions
  plus fiable que pixel seul depuis iOS 14

#### Vue rapide
- Nombre de commandes aujourd hui
- Chiffre affaires du jour
- Commandes en attente

### PHASE 3 - Commandes avancées
- Import commandes Excel et CSV
- Source commande trackée (WhatsApp Instagram Facebook TikTok)
- Base clients finaux
- Client fidèle et blacklist
- Historique complet par client

### PHASE 4 - Stock avancé
- Stock central entrepôt
- Distribution aux livreurs
- Transfert entre livreurs
- Alertes stock bas
- Demande stock par livreur
- Historique mouvements

### PHASE 5 - Finances avancées
- Réconciliation caisse journalière
- Paiement commissions enregistré
- Avances sur commission
- Rapport financier
- Multi-devises FCFA Naira Cedi Euro

### PHASE 6 - Multi-pays
- Gestion pays
- Partenaires locaux
- Dashboard par pays
- Rapport par pays
- Anti-fraude

### PHASE 7 - Communication
- Notifications temps réel
- SMS automatiques client et livreur
- Messagerie interne équipe
- Annonces à toute l équipe
- Résumé journalier WhatsApp admin

### PHASE 8 - Boutique intégrée
- shipivo.app/boutique/nom
- Page produit individuelle
- Personnalisable couleurs et logo

### PHASE 9 - Intégrations externes
- Webhook Tally
- Widget WordPress
- Shopify automatique
- YouCan automatique
- WooCommerce automatique
- Bot WhatsApp

### PHASE 10 - Analytics
- Graphiques chiffre d affaires
- Performance livreurs
- Produits les plus vendus
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

## DESIGN SYSTEM

### Logo Shipivo
- S géométrique dans carré doré #F59E0B
- Texte Shipivo bold 800 blanc
- Slogan SHIP SMARTER · DELIVER FASTER gris
- Composant : src/components/ui/ShipivoLogo.tsx

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

### Accessibilité
- Contraste élevé pour soleil africain
- Grands boutons tactiles minimum 44px
- Fonctionne sur connexion 2G et 3G
- Compatible vieux téléphones Android

## MODELE ECONOMIQUE

### Plans
- Essai gratuit : 14 jours sans carte bancaire
- Starter : 10 000 FCFA par mois
  2 livreurs, 1 closureuse, 300 commandes, 1 pays
- Pro : 25 000 FCFA par mois
  5 livreurs, 3 closureuses, illimité, 3 pays
- Business : 50 000 FCFA par mois
  Illimité, tous pays, boutique, intégrations
- Enterprise : Sur devis
  White label, support dédié

### Paiement
- FedaPay pour Afrique
- Stripe pour international
- Mobile Money prévu

### Projections
- Mois 3 : 10 clients = 150 000 FCFA
- Mois 6 : 30 clients = 500 000 FCFA
- Mois 12 : 100 clients = 2 000 000 FCFA
- An 2 : 300 clients = 6 000 000 FCFA

## MARCHES CIBLES

### Phase 1 : Afrique francophone
Mali, Togo, Sénégal, Côte d Ivoire,
Cameroun, Burkina, Bénin, Niger, Tchad,
Congo, Gabon, Madagascar, Guinée

### Phase 2 : Afrique anglophone
Nigeria, Ghana, Kenya, Rwanda, Tanzanie

### Phase 3 : Afrique lusophone
Angola, Mozambique, Cap-Vert

### Phase 4 : International
Diaspora africaine, COD partout dans le monde

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
- Numéros livreurs dans Supabase
- App déployée sur Vercel
- Domaine shipivo.app acheté
- Branche dev créée
- Fichier DELIVIO.md créé
- Structure complète Shipivo définie

### Session 2 - 21 Mai 2026
- Restructuration complète en composants React
- Design tokens centralisés dans lib/design-tokens.ts
- Types partagés dans types/order.ts
- AdminView complet : Dashboard + Commandes + Créer + Stock + Commissions
- Migration base de données Supabase complète
- 37 tables créées dont tenants, subscriptions, super_admins
- RLS activé sur toutes les nouvelles tables
- Phase 0 terminée à 100%

### Session 3 - 21 Mai 2026
- Phase 1 Auth + Multi-tenant terminée
- Phase 2 Page commande publique terminée
- Logo Shipivo premium S géométrique doré créé
- Fabrice ajouté comme super_admin dans Supabase
- Tenant THERAWOLF créé avec slug therawolf
- Produit THERAWOLF Balm 50ml 15000 FCFA créé
- Page commander/therawolf testée et fonctionnelle
- Frais livraison configurables par e-commerçant
- THERAWOLF livraison gratuite configurée
- Phase 2b Dashboard Admin définie
- Pixel Facebook et API Conversions ajoutés au plan
- DELIVIO.md mis à jour avec plan complet
- Prochaine étape : Phase 2b Dashboard Admin
