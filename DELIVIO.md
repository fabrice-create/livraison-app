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

### PHASE 1 - Auth + Multi-tenant ✅ TERMINÉE
- Page login avec logo premium ✅
- Redirection automatique par rôle ✅
- Page signup 3 étapes + création tenant auto ✅
- Page forgot-password ✅
- lib/auth.ts complet ✅
- Logo Shipivo S géométrique doré ✅

### PHASE 2 - Page commande publique ✅ TERMINÉE
- shipivo.app/commander/boutique ✅
- Grille produits 2 colonnes ✅
- Page détail produit (photo 1:1, description, quantité) ✅
- Panier multi-produits avec sessionStorage ✅
- Formulaire client complet ✅
- Frais livraison configurés par e-commerçant ✅
- Bouton WhatsApp après commande ✅

### PHASE 2b - Dashboard Admin ✅ TERMINÉE
- Gestion produits : ajouter, modifier, activer/désactiver ✅
- Upload photo avec compression automatique 1:1 ✅
- Formats JPG PNG WebP acceptés ✅
- Optimisation 2G/3G automatique ✅
- Bouton copier lien boutique et lien produit ✅
- Gestion équipe : ajouter livreur, closureuse, partenaire ✅
- Paramètres boutique : nom, téléphone, frais livraison ✅
- Commissions livreur et closureuse configurables ✅
- Pixel Facebook ID + Token API Conversions ✅
- Pixel TikTok ✅
- Tracking automatique ViewContent AddToCart Purchase ✅
- API Conversions côté serveur (fiable iOS 14) ✅
- lib/facebookPixel.ts créé ✅
- lib/tiktokPixel.ts créé ✅
- lib/imageUtils.ts compression + crop carré 1:1 ✅

### PHASE 3 - Commandes avancées ← PROCHAINE ÉTAPE
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
- Pro : 25 000 FCFA par mois
- Business : 50 000 FCFA par mois
- Enterprise : Sur devis

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
- Numéros livreurs dans Supabase
- App déployée sur Vercel
- Domaine shipivo.app acheté

### Session 2 - 21 Mai 2026
- Restructuration complète en composants React
- Design tokens centralisés
- AdminView complet
- Migration base de données Supabase complète
- 37 tables créées
- Phase 0 terminée

### Session 3 - 21 Mai 2026
- Phase 1 Auth + Multi-tenant terminée
- Phase 2 Page commande publique terminée
- Phase 2b Dashboard Admin terminée
- Logo Shipivo premium créé
- Tenant THERAWOLF configuré et testé
- Upload photo compression 1:1 automatique
- Grille produits 2 colonnes
- Page détail produit
- Tracking Facebook Pixel + API Conversions
- Tracking TikTok Pixel
- Prochaine étape : Phase 3 Commandes avancées
