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
- Vercel dev : livraison-ktbkmxj93-fabrice-creates-projects.vercel.app
- Supabase : cghpvmktiqabngzqiblo.supabase.co
- Stack : Next.js + TypeScript + Supabase + Vercel
- Branche production : main (ancienne app — équipe active)
- Branche développement : dev (nouveau Shipivo — en cours)

## COMPTES TEST
- Super Admin : bosbokarbou@gmail.com / Shipivo2026!
- Admin test : admin-test@shipivo.app / Admin2026!
- Boutique test : therawolf (slug)
- URL test : /commander/therawolf
- Tenant ID THERAWOLF : f0b7d463-133b-4f4c-b697-98bd594e5fb1

## DEPLOY HOOK (pour forcer un déploiement manuel)
https://api.vercel.com/v1/integrations/deploy/prj_jbR3LwsrmgxCnaVwajkyfsGrEPKO/RR08YaIHMC
Coller dans le navigateur et appuyer Entrée pour déclencher un déploiement.

## RÈGLES IMPORTANTES

### Branches
- Ne JAMAIS toucher à main — c'est l'ancienne app que l'équipe utilise
- Tout le développement se fait sur dev
- La bascule (merge dev → main) se fait quand tout est prêt

### Flux commandes (VALIDÉ)
1. Client commande → En attente → visible closureuse uniquement
2. Closureuse appelle → confirme → Confirmé (closer_id enregistré)
3. Admin ou closureuse assigne un livreur
4. Commande apparaît chez le livreur (Confirmée + assignée uniquement)
5. Livreur livre → Livré + Payé

### Commissions (LOGIQUE VALIDÉE)
- Déclenchées UNIQUEMENT à Livré+Payé ou Envoyé à la gare
- Livreur : 2 000 FCFA fixe par livraison
- Closureuse : 500 FCFA si closer_id présent (elle a confirmé), sinon 0
- Admin qui confirme = pas de commission closureuse
- Commandes créées par formulaire public = pas de commission closureuse

### Rôles dans Supabase
- Les rôles sont en minuscule : admin, closureuse, livreur
- Le code utilise normalizeRole() qui convertit tout en minuscule
- Les requêtes Supabase utilisent .ilike() pour être case-insensitive

### Responsive
- Hook useIsMobile() dans src/hooks/useIsMobile.ts
- Décision prise : refonte Tailwind plus tard (Phase 7-8)
- Pour l'instant : corrections ciblées avec useIsMobile

### Suppressions
- Les commandes ne se suppriment JAMAIS (livreur, closureuse, admin)
- Les annulations restent dans l'historique (data précieuse)
- Le livreur ne peut pas supprimer ses commandes

## PLAN DE DEVELOPPEMENT

### PHASE 0 ✅ TERMINÉE
### PHASE 1 ✅ TERMINÉE — Auth + Multi-tenant
### PHASE 2 ✅ TERMINÉE — Page commande publique
### PHASE 2b ✅ TERMINÉE — Dashboard Admin complet
### PHASE 3 ✅ TERMINÉE — Commandes avancées

#### Phase 3 — ce qui a été fait
- Source commande trackée automatiquement ✅
- Liens trackés par source dans Paramètres ✅
- Base clients finaux ✅
- Client fidèle automatique (2+ commandes) ✅
- Blacklist client ✅
- Historique complet par client (modal cliquable) ✅
- Import commandes Excel/CSV ✅
- Notifications temps réel closureuse/admin ✅
- Super Admin dashboard ✅

### PHASE 4 ✅ TERMINÉE — Stock avancé

#### Phase 4 — ce qui a été fait
- Stock central entrepôt ✅
- Transfert entrepôt → livreur ✅
- Transfert livreur → livreur (sans validation admin) ✅
- Alertes stock bas (rouge si quantité <= seuil) ✅
- Historique mouvements (table stock_mouvements) ✅
- Demandes stock par livreur ✅
- Tables Supabase créées : warehouse_stock, stock_mouvements, stock_demandes ✅

### PHASE 4b ✅ TERMINÉE — Espaces équipe refaits

#### Phase 4b — ce qui a été fait
- Espace Admin : Paramètres profil personnel + changement mot de passe ✅
- Espace Admin : Responsive avec hook useIsMobile ✅
- Espace Closureuse : 5 onglets (Dashboard, Commandes, Assigner, Commissions, Stocks) ✅
- Espace Closureuse : Notifications temps réel + bannière nouvelles commandes ✅
- Espace Closureuse : Saisie manuelle (commandes qui arrivent par appel) ✅
- Espace Closureuse : closer_id enregistré à la confirmation (pas à la création) ✅
- Espace Livreur : 5 onglets (Dashboard, En cours, Historique, Commissions, Stock) ✅
- Espace Livreur : Voit uniquement commandes Confirmées assignées à lui ✅
- Espace Livreur : Commandes du jour en priorité ✅
- Espace Livreur : Chargement parallèle (2x plus rapide) ✅
- Espace Livreur : Transfert stock entre livreurs (sans validation) ✅

### PHASE 5 - Finances avancées ← PROCHAINE ÉTAPE
- Réconciliation caisse journalière
- Paiement commissions enregistré
- Avances sur commission
- Rapport financier
- Export Excel/PDF

### PHASE 6 - Multi-pays
### PHASE 7 - Communication
### PHASE 8 - Boutique intégrée
### PHASE 9 - Intégrations externes
### PHASE 10 - Analytics
### PHASE 11 - PWA Mobile
### PHASE 12 - Monétisation
### PHASE 13 - Play Store

## DESIGN SYSTEM
- Or : #F59E0B | Fond : #0A0A0F | Cartes : #111118
- Bordures : #1E1E2E | Succès : #4ADE80 | Danger : #F87171
- Info : #60A5FA | Warning : #FB923C | Purple : #C084FC

## MODELE ECONOMIQUE
- Starter : 10 000 FCFA/mois
- Pro : 25 000 FCFA/mois
- Business : 50 000 FCFA/mois

## COMMENT BRIEFER CLAUDE
Copie-colle ce fichier au début du chat puis ajoute :
"Aujourd'hui on va faire : [ce que tu veux faire]"

## JOURNAL DES SESSIONS

### Session 1 - Mai 2026
- App complète admin closureuse livreur
- Déployée sur Vercel, domaine shipivo.app acheté

### Session 2 - 21 Mai 2026
- Restructuration complète composants React
- Migration base Supabase 37 tables
- Phase 0 terminée

### Session 3 - 21 Mai 2026
- Phases 1, 2, 2b, 3 terminées
- Notifications temps réel
- Super Admin dashboard

### Session 4 - 22 Mai 2026
- Phase 4 Stock avancé terminée
- Phase 4b Espaces équipe refaits
- Corrections flux commissions
- Corrections responsive
- Optimisation chargement livreur/closureuse
- Règles importantes documentées
