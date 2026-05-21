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

## LES 4 ESPACES DE L APPLICATION

### 1. ESPACE PUBLIC
- Page accueil Shipivo marketing
- Page de commande par boutique avec prix
- Page boutique publique
- Page inscription nouveau client
- Page connexion
- Page mot de passe oublié

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
- super_admins
- tenants (e-commerçants clients)
- subscriptions (abonnements)

### Géographie
- countries (pays)
- zones (villes et quartiers)

### Équipe
- profiles (tous utilisateurs)
- partners (partenaires locaux)
- login_logs (journal connexions)

### Produits
- products (catalogue)
- product_categories
- stock_central (entrepôt principal)
- driver_stock (stock livreur)
- stock_movements (mouvements)
- stock_requests (demandes stock)

### Commandes
- customers (clients finaux)
- orders (commandes)
- order_items (produits par commande)
- order_history (historique actions)
- order_returns (retours)
- order_disputes (litiges)

### Finances
- commission_rules (règles commissions)
- commissions (commissions calculées)
- commission_payments (paiements)
- cash_reconciliation (caisse)
- advances (avances)
- delivery_fees (frais livraison)

### Boutique
- boutiques
- boutique_pages

### Communication
- notifications
- messages (messagerie interne)
- announcements (annonces équipe)
- sms_logs

### Performance
- driver_objectives (objectifs livreurs)

### Intégrations
- webhooks
- webhook_logs

## SOURCES DE COMMANDES
Toutes arrivent au même endroit chez la closureuse :
- Widget WordPress intégré
- Connexion Shopify automatique
- Connexion YouCan automatique
- Connexion WooCommerce automatique
- Connexion Tally automatique
- Lien direct shipivo.app/commander/boutique
- Lien WhatsApp optimisé
- Boutique Shipivo intégrée
- Google Forms via script

## FONCTIONNALITES COMPLETES

### Commandes
- Multi-produits avec prix calculé automatiquement
- Source trackée WordPress Shopify WhatsApp...
- Confirmation par appel téléphonique
- Statuts : En attente, Confirmé, Livré+Payé, Gare, Annulé
- En cours = En attente + Confirmé
- Historique = Livré + Gare + Annulé
- Modification commande en cours
- Retours et litiges
- Photo de preuve de livraison
- Base de données clients finaux
- Client fidèle et blacklist

### Stock
- Stock central entrepôt principal
- Distribution aux livreurs
- Transfert entre livreurs
- Alertes stock bas automatiques
- Demande de stock par livreur
- Historique mouvements complet
- Décrémentation automatique à la livraison

### Commissions - IMPORTANT
PRINCIPE FONDAMENTAL :
Chaque e-commerçant est libre de définir
ses propres règles avec son équipe.
Shipivo ne impose rien. Chacun gère
selon ses accords personnels.

EXEMPLE DE FABRICE (fondateur) :
- Livreur : 2 000 FCFA fixe par livraison
  peu importe la distance
- Closureuse : 500 FCFA par commande
  Livré+Payé ou Envoyé à la gare

AUTRES E-COMMERCANTS - options disponibles :
- Montant fixe par livraison (comme Fabrice)
- Pourcentage du montant de la commande
- Paliers selon nombre de livraisons
- Pas de commission (livreur salarié fixe)
- Livreur propriétaire de sa moto sans commission
- Négociation individuelle par livreur
- Négociation individuelle par closureuse
- N importe quelle combinaison possible

DECLENCHEMENT AUTOMATIQUE :
- Livraison directe Livré+Payé = commission
- Envoi à la gare = commission
- Annulation = pas de commission
- Configurable par chaque e-commerçant

### Frais de livraison
PRINCIPE : Chaque e-commerçant gère
selon ses accords avec ses livreurs.

Phase 1 : Prix fixe par zone configurable
- E-commerçant définit ses tarifs par ville
- Exemple Fabrice : 2 000 FCFA partout
- Exemple autre : 1 000 FCFA ville,
  2 500 FCFA hors ville

Phase 2 : Le livreur saisit ses frais
- Avec validation admin

Phase 3 : Calcul automatique par distance GPS
- Comme Uber (fonctionnalité avancée future)

### Finances
- Réconciliation caisse journalière
- Paiement commissions enregistré
- Avances sur commission
- Rapport financier par pays
- Multi-devises FCFA Naira Cedi Euro...
- Anti-fraude intégré

### Équipe
- Objectifs journaliers par livreur
- Classement livreurs
- Taux de réussite livraison
- Bonus automatique si objectif dépassé
- Messagerie interne équipe
- Annonces à toute l équipe
- Alertes si livreur inactif

### Multi-pays
- Gestion de tous les pays africains
- Partenaires locaux par pays
- Dashboard global pour Fabrice
- Dashboard local pour partenaire
- Rapport mensuel automatique par pays
- Plafond dépenses par partenaire
- Contrat digital partenaire

### Sécurité
- Authentification sécurisée Supabase
- RLS chaque client voit ses données uniquement
- Double authentification optionnelle
- Journal de connexion complet
- Blocage après 5 tentatives
- Déconnexion automatique après inactivité
- Logs de toutes les actions importantes
- Sauvegarde automatique quotidienne

### Boutique en ligne
- shipivo.app/boutique/nom
- Catalogue produits avec photos et prix
- Pages produit individuelles
- Panier simple
- Formulaire commande intégré
- Personnalisable couleurs et logo
- Compatible mobile

### Communication
- Notifications temps réel dans app
- SMS automatique client à la confirmation
- SMS livreur à l assignation
- WhatsApp client avec message pré-rempli
- Appel direct client et livreur
- Résumé journalier WhatsApp admin
- Bot WhatsApp basique

### Analytics et rapports
- Graphiques chiffre d affaires
- Performance par livreur
- Taux réussite livraison
- Produits les plus vendus
- Villes les plus actives
- Rapport par pays
- Export PDF et Excel

## DESIGN SYSTEM

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
- TV et grands écrans : prévu

### Accessibilité
- Contraste élevé pour soleil africain
- Grands boutons tactiles minimum 44px
- Icônes toujours avec texte
- Fonctionne sur connexion 2G et 3G
- Compatible vieux téléphones Android

## MODELE ECONOMIQUE

### Plans
- Essai gratuit : 14 jours sans carte bancaire
- Starter : 10 000 FCFA par mois
  2 livreurs, 1 closureuse, 300 commandes, 1 pays
- Pro : 25 000 FCFA par mois
  5 livreurs, 3 closeuses, illimité, 3 pays
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
Nigeria, Ghana, Kenya, Rwanda,
Tanzanie, Ouganda, Zambie, Zimbabwe

### Phase 3 : Afrique lusophone
Angola, Mozambique, Cap-Vert

### Phase 4 : International
Diaspora africaine partout dans le monde
Tout entrepreneur qui fait du COD
Moyen-Orient, Asie du Sud-Est

## LANGUES PREVUES
- Phase 1 : Français
- Phase 2 : Anglais
- Phase 3 : Portugais
- Phase 4 : Arabe
- Phase 5 : Swahili

## PLAN DE DEVELOPPEMENT

### PHASE 0 - Préparation - EN COURS
- Domaine shipivo.app acheté
- Branche dev créée
- Restructuration code en composants
- Mise à jour base de données Supabase
- Configuration sécurité RLS

### PHASE 1 - Multi-tenant
- Chaque client a son espace isolé
- Page inscription nouveau client
- Page connexion améliorée
- Mot de passe oublié
- Redirection automatique selon rôle
- Dashboard super admin Fabrice
- Configuration commissions par client

### PHASE 2 - Page commande publique
- shipivo.app/commander/boutique
- Formulaire beau avec prix et multi-produits
- Total calculé automatiquement
- Compatible mobile WhatsApp Instagram
- Lien avec produit pré-rempli
- Notification automatique closureuse

### PHASE 3 - Commandes avancées
- Multi-produits par commande
- Catalogue produits avec prix
- Import Excel et CSV
- Source commande trackée
- Base clients finaux
- Client fidèle et blacklist

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

### Session 2 - date a completer
- a completer