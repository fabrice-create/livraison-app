# SHIPIVO — Plateforme SaaS de gestion de livraison

## VISION
Donner aux entrepreneurs africains et internationaux
les outils professionnels pour gérer leur e-commerce
et leurs livraisons, peu importe leur niveau technique.

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

## DEPLOY HOOK (pour forcer un déploiement manuel)
https://api.vercel.com/v1/integrations/deploy/prj_jbR3LwsrmgxCnaVwajkyfsGrEPKO/RR08YaIHMC
Coller dans le navigateur et appuyer Entrée pour déclencher un déploiement.

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

### PHASE 4 - Stock avancé ← PROCHAINE ÉTAPE
⚠️ ATTENTION : La Phase 4 a causé des erreurs TypeScript.
Le StockView a été modifié mais n'est pas compatible avec AdminView.
Au début de la prochaine session, il faut :
1. Vérifier que le build Vercel passe (corriger l'erreur TypeScript)
2. Reprendre la Phase 4 de zéro proprement

#### Erreur actuelle
- AdminView.tsx utilise StockView avec anciens props
- StockView.tsx a été modifié plusieurs fois et est incohérent
- Solution : réécrire StockView proprement avec les anciens props
  ET ajouter les nouvelles fonctionnalités (transfert, historique)

#### Ce que Phase 4 doit contenir
- Stock central entrepôt (déjà dans l'ancien StockView)
- Transfert entre livreurs
- Alertes stock bas (rouge si quantité <= 3)
- Historique mouvements (table stock_mouvements déjà créée)
- Demande stock par livreur

### PHASE 5 - Finances avancées
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

## MODELE ECONOMIQUE
- Starter : 10 000 FCFA/mois
- Pro : 25 000 FCFA/mois
- Business : 50 000 FCFA/mois

## COMMENT BRIEFER CLAUDE
Copie-colle ce fichier au début du chat puis ajoute :
"Aujourd hui on va faire : [ce que tu veux faire]"

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
- Phase 4 commencée mais erreur TypeScript
- Prochaine session : corriger erreur build puis finir Phase 4
