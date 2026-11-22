# Première Ligne — mémo pour Claude

@AGENTS.md

**Produit.** SaaS multi-entreprises de Première Ligne (conseil et formation des forces de vente, « On forme là où ça se joue. »). Les managers évaluent leurs commerciaux sur un référentiel de compétences (notes 0 à 4), font des coachings terrain avec compte rendu, suivent un plan de progrès et assignent des Dojos (exercices d'entraînement). Chaque commercial voit sa progression. Utilisé surtout sur téléphone, entre deux rendez-vous : chaque écran doit être simple et rapide.

**Référence.** `docs/SPEC.md` (cahier des charges complet) ; écarts et choix dans `docs/DECISIONS.md` (prioritaires sur la spec) ; avancement dans `docs/PROGRESS.md`. Travailler étape par étape (§16 de la spec), une branche par étape.

**Fondateur.** Kevin, non développeur. Lui expliquer en français simple ce qu'il doit faire lui-même, pas à pas. Ne jamais créer de compte ni saisir de mot de passe à sa place.

**Pile.** Next.js 16 (App Router, Server Components, server actions, Cache Components, `proxy.ts`) · TypeScript strict · Tailwind 4 + composants shadcn/ui dans `components/ui` · Supabase (Postgres, Auth, RLS) région UE · Zod · React Hook Form · date-fns · Recharts · Resend · Vitest · Playwright · pnpm · Vercel (Paris).

**Règles absolues.**

- RLS activée sur toutes les tables, règles appliquées dans la base et pas seulement dans l'interface.
- Clé `service_role` uniquement côté serveur (`lib/supabase/service.ts`), après vérification des droits de l'utilisateur réel. Jamais dans le navigateur.
- Toutes les écritures passent par des server actions : validation Zod, contrôle des droits, écriture, audit si besoin, revalidation.
- Ne jamais modifier une migration déjà appliquée, ne jamais désactiver la RLS, ne jamais commiter un secret, ne jamais envoyer d'email réel en développement, ne jamais supprimer une donnée référencée (on désactive).
- Code en anglais, textes affichés en français dans `lib/i18n/fr.ts`. Pas de `any`. Couleurs uniquement via les jetons de `app/globals.css`.
- Calculs métier en fonctions pures dans `lib/domain`, testées.
- Une étape n'est terminée que si `pnpm lint`, `pnpm typecheck`, `pnpm test`, les tests RLS et `pnpm build` passent, et que les écrans ont été vérifiés sur ordinateur et mobile.

**Commandes.**

```
pnpm dev            # serveur local http://localhost:3000
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm typecheck      # types
pnpm test           # tests unitaires
pnpm test:e2e       # tests de bout en bout (ordinateur + mobile)
pnpm db:start       # Supabase local (Docker)
pnpm db:test        # tests SQL de RLS
pnpm db:types       # régénérer lib/supabase/types.ts après une migration
```
