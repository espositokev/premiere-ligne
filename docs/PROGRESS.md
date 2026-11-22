# Avancement

| Étape                                               | Statut                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| 0 — Socle                                           | ✅ En ligne sur premiere-ligne-two.vercel.app, en attente de validation |
| 1 — Comptes, entreprises, rôles                     | À faire                                                                 |
| 2 — Référentiels et Dojos                           | À faire                                                                 |
| 3 — Évaluations et fiche commercial                 | À faire                                                                 |
| 4 — Coachings                                       | À faire                                                                 |
| 5 — Plan de progrès et vue commercial               | À faire                                                                 |
| 6 — Tableaux de bord, « voir en tant que », journal | À faire                                                                 |
| 7 — RGPD et mise en production                      | À faire                                                                 |

## Étape 0 — Socle

### Fait

- Projet Next.js 16, TypeScript strict, Tailwind CSS 4, composants de base façon shadcn/ui, ESLint, Prettier.
- Charte Première Ligne en jetons CSS (`app/globals.css`), polices Sora et Inter, logo en composant (`components/brand/logo.tsx`), icône d'onglet.
- Composants : bouton (5 variantes, 44 px minimum), carte, champ texte, zone de texte, libellé, pastille de note, notifications.
- Pages publiques : accueil, connexion (provisoire), mentions légales, confidentialité, CGU (modèles avec zones `[À COMPLÉTER]` surlignées).
- Clients Supabase navigateur, serveur et service (`lib/supabase`), validation des variables d'environnement par Zod, configuration Supabase (`supabase/config.toml`, inscription publique coupée).
- Tests : 12 tests unitaires (Vitest), 10 tests de bout en bout (Playwright, ordinateur et mobile), 1 test SQL de RLS.
- CI GitHub Actions : lint, format, types, tests unitaires, build, bout en bout, RLS.

### Vérifié

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` et `pnpm build` passent en local.
- Pages parcourues en captures d'écran sur ordinateur (1280 px) et mobile (iPhone 13).
- Pas encore vérifié : le test RLS (exécuté seulement en CI, faute de Docker en local).

### À tester par le fondateur (5 minutes, sur le lien de prévisualisation Vercel)

- [ ] Sur ton téléphone, l'accueil s'affiche sans défiler sur le côté.
- [ ] Les couleurs et le logo correspondent à la charte.
- [ ] « Se connecter » mène à la page provisoire de connexion.
- [ ] Les trois liens du bas de page ouvrent les pages légales, avec les zones à compléter surlignées en fluo.

### Reste à faire par le fondateur

- ~~Installer l'app GitHub de Claude~~ : fait.
- ~~Créer le compte Vercel et importer le dépôt~~ : fait le 22/11/2026 (plan Hobby, passage en Pro avant le premier client).
- Remplir les zones `[À COMPLÉTER]` des pages légales (étape 7 au plus tard).
