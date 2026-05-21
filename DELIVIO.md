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

## COMPTES
- Super Admin : bosbokarbou@gmail.com / Shipivo2026!
- Boutique test : therawolf (slug)
- URL test : /commander/therawolf

## PLAN DE DEVELOPPEMENT

### PHASE 0 - Préparation ✅ TERMINÉE

### PHASE 1 - Auth + Multi-tenant ✅ TERMINÉE
- Page login avec logo premium S géométrique doré ✅
- Redirection automatique par rôle ✅
- Page signup 3 étapes + création tenant automatique ✅
- Page forgot-password ✅
- lib/auth.ts complet ✅
- Fabrice ajouté comme super_admin ✅
- Logo Shipivo S géométrique dans carré doré ✅

### PHASE 2 - Page commande publique ✅ TERMINÉE
- shipivo.app/commander/boutique ✅
- Grille produits 2 colonnes ✅
- Page détail produit photo 1:1 ✅
- Panier multi-produits sessionStorage ✅
- Formulaire client complet ✅
- Frais livraison configurés par e-commerçant ✅
- Bouton WhatsApp après commande ✅

### PHASE 2b - Dashboard Admin ✅ TERMINÉE
- Gestion produits avec upload photo 1:1 compression auto ✅
- Gestion équipe ✅
- Paramètres boutique + commissions ✅
- Pixel Facebook + API Conversions ✅
- Pixel TikTok ✅
- Tracking ViewContent AddToCart Purchase ✅
- Notifications temps réel cloche 🔔 ✅
- Son + bannière dorée nouvelle commande ✅
- Super Admin dashboard ✅
- Vue globale tous e-commerçants ✅

### PHASE 3 - Commandes avancées ← EN COURS
- Source commande trackée automatiquement ✅
  (WhatsApp, Facebook, Instagram, TikTok, Google, Direct)
- Détection via referrer + paramètre ?src= ✅
- Liens trackés par source dans Paramètres ✅
- Base clients finaux ✅
- Client fidèle détecté automatiquement (2+ commandes) ✅
- Blacklist client ✅
- Bouton appel direct et WhatsApp par client ✅
- src/components/admin/ClientsView.tsx créé ✅

#### Reste à faire Phase 3
- Import commandes Excel et CSV
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
- Anti-fraude

### PHASE 7 - Communication
- SMS automatiques client et livreur
- Messagerie interne équipe
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

### Projections
- Mois 3 : 10 clients = 150 000 FCFA
- Mois 6 : 30 clients = 500 000 FCFA
- Mois 12 : 100 clients = 2 000 000 FCFA
- An 2 : 300 clients = 6 000 000 FCFA

## MARCHES CIBLES
Afrique francophone → anglophone → lusophone → International

## COMMENT BRIEFER CLAUDE
Au début de chaque nouveau chat copie-colle
tout le contenu de ce fichier puis ajoute :
Aujourd hui on va faire : [ce que tu veux faire]

## JOURNAL DES SESSIONS

### Session 1 - Mai 2026
- Création app complète admin closureuse livreur
- Design responsive mobile desktop
- App déployée sur Vercel
- Domaine shipivo.app acheté

### Session 2 - 21 Mai 2026
- Restructuration complète en composants React
- Migration base de données Supabase 37 tables
- Phase 0 terminée

### Session 3 - 21 Mai 2026
- Phase 1 Auth + Multi-tenant terminée
- Phase 2 Page commande publique terminée
- Phase 2b Dashboard Admin terminée
- Notifications temps réel
- Super Admin dashboard
- Phase 3 commencée :
  source trackée, base clients, blacklist, liens trackés
- Prochaine étape : finir Phase 3 (import Excel/CSV)
  puis Phase 4 Stock avancé

<!-- 1779406993 -->