# Avancement

| Étape                                               | Statut                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| 0 — Socle                                           | ✅ Validée par le fondateur le 22/11/2026                                        |
| 1 — Comptes, entreprises, rôles                     | 🔨 Construite et testée, en attente d'une base Supabase en ligne pour la recette |
| 2 — Référentiels et Dojos                           | À faire                                                                          |
| 3 — Évaluations et fiche commercial                 | À faire                                                                          |
| 4 — Coachings                                       | À faire                                                                          |
| 5 — Plan de progrès et vue commercial               | À faire                                                                          |
| 6 — Tableaux de bord, « voir en tant que », journal | À faire                                                                          |
| 7 — RGPD et mise en production                      | À faire                                                                          |

## Étape 1 — Comptes, entreprises, rôles

### Fait

- Base : profils, entreprises, équipes, appartenances, managers d'équipe, invitations, journal d'activité, journal des emails. RLS sur toutes les tables, fonctions d'aide (§8.2), garde-fous (statut d'entreprise, drapeau super admin, rôle des managers d'équipe), clés composites qui empêchent tout mélange entre entreprises.
- Connexion par code reçu par email, déconnexion, redirection vers la connexion des pages protégées, acceptation des CGU à la première connexion.
- Invitations : création (responsable et super admin pour tous les rôles, manager pour les commerciaux de ses équipes), renvoi avec nouveau lien, annulation, lien valable 7 jours, jeton stocké haché, acceptation avec connexion immédiate.
- Espace super admin : tableau de bord, liste des entreprises (utilisateurs actifs par rôle), création, fiche (statut actif/suspendu/archivé, invitations, entrée dans l'espace).
- Espace entreprise : navigation par rôle (barre latérale sur ordinateur, onglets en bas sur mobile), accueil avec premiers pas, page Équipe (commerciaux regroupés par équipe, invitation), Utilisateurs (filtres, recherche, invitations, fiche avec rôle/équipe/poste, désactivation), Équipes (création, managers, désactivation).
- Profil (prénom, nom, téléphone), page de choix d'espace, script `pnpm create-super-admin`.
- Tests : 38 vérifications SQL de sécurité (isolation entre entreprises, droits par rôle, comptes désactivés, entreprise suspendue), 34 tests unitaires, parcours de bout en bout (connexion par code, création d'entreprise, invitation, acceptation, équipe) exécutés en CI sur un vrai Supabase local.

### Vérifié

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:test:local` et les tests de bout en bout des pages publiques passent en local.
- Parcours connectés : vérifiés par la CI GitHub (Supabase local). Pas encore vérifiés à l'œil sur ordinateur et mobile : il faut une base Supabase en ligne.

### À tester par le fondateur (dès que la base en ligne existe)

- [ ] Se connecter avec son email : recevoir le code, le saisir, arriver sur l'administration.
- [ ] Créer une entreprise de test, s'inviter soi-même comme responsable avec une autre adresse, accepter l'invitation depuis le téléphone.
- [ ] Créer une équipe, inviter un commercial, vérifier qu'il n'accède qu'à son espace.

### Reste à faire par le fondateur

- Choisir la solution Supabase (voir la conversation) pour créer la base en ligne.
- Créer un compte Resend et vérifier le domaine d'envoi (avant la mise en service ; en attendant les emails d'invitation sont simulés).

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
