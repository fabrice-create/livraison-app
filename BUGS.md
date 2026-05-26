# BUGS & LEÇONS — Shipivo

## Bug #1 — page.tsx écrase ProductPageClient.tsx
**Date :** 26/05/2026
**Symptôme :** La page de vente s'affichait mais ignorait totalement le contenu configuré dans l'admin (page_content). Seuls l'image principale et le formulaire apparaissaient.
**Cause racine :** Le fichier `page.tsx` contenait l'ANCIEN code complet de la page de vente. Le nouveau `ProductPageClient.tsx` n'était jamais appelé — il existait dans le dossier mais était ignoré.
**Temps perdu :** ~4h de débogage
**Fix :** Remplacer `page.tsx` par un simple wrapper qui appelle `ProductPageClient` :
```tsx
import { Suspense } from "react"
import ProductPageClient from "./ProductPageClient"
export default function Page() {
  return <Suspense fallback={...}><ProductPageClient /></Suspense>
}
```
**Leçon :** Quand on crée un nouveau composant dans un dossier Next.js qui a déjà un `page.tsx`, toujours vérifier que `page.tsx` appelle bien le nouveau composant. Next.js exécute TOUJOURS `page.tsx` — jamais directement un autre fichier du même dossier.

---

## Bug #2 — Slug recalculé à l'édition
**Date :** 26/05/2026
**Symptôme :** Après avoir édité un produit et enregistré, la page produit devenait inaccessible (produit introuvable).
**Cause racine :** Le code recalculait le slug à partir du nom à chaque sauvegarde. Le produit avait le slug `deep-mpmnw6l7` mais après édition il devenait `deep` — l'URL ne correspondait plus.
**Fix :** Sauvegarder le slug original dans un state `originalSlug` au chargement, et l'utiliser lors de l'édition.

---

## Bug #3 — Imports après déclaration de fonction (TypeScript)
**Date :** 26/05/2026
**Symptôme :** Build Vercel échoue avec erreur TypeScript.
**Cause racine :** Des `import` étaient placés APRÈS une déclaration de fonction dans le fichier. TypeScript/ESModules exige que tous les imports soient en haut du fichier.
**Fix :** Toujours mettre tous les imports en haut, avant toute déclaration.

---

## Bug #4 — useState<PageContent|null> cause erreur TypeScript
**Date :** 26/05/2026  
**Symptôme :** Build échoue — "Object is possibly null".
**Cause racine :** `useState<PageContent|null>(null)` puis utilisation directe de `content.hero_titre` sans vérification null.
**Fix :** Utiliser `useState<PageContent>(defaultContent)` avec un objet par défaut valide.

---

## Règle générale — Next.js
Quand on refactorise une page Next.js :
1. Vérifier que `page.tsx` appelle bien le nouveau composant
2. Ne jamais laisser l'ancien code dans `page.tsx` si on crée un `ProductPageClient.tsx`
3. Tester immédiatement après chaque refacto

