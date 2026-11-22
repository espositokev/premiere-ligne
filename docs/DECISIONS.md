# Décisions

Choix faits en l'absence d'information dans `docs/SPEC.md`, ou validés avec le fondateur quand ils s'en écartent. Le plus récent en haut.

## 22/11/2026 — Étape 1

- **Cache Components désactivé** (`cacheComponents: false`) : presque toutes les pages dépendent de l'utilisateur connecté ; le rendu dynamique classique est plus simple et évite les pièges de mise en cache de données personnelles.
- **Connexion uniquement par code email** (OTP Supabase à 6 chiffres) : pas de mot de passe, donc pas de pages « mot de passe oublié » ni « réinitialiser ». Le gabarit d'email est dans `supabase/templates/code-connexion.html` et doit être recopié dans Supabase en production (Authentication > Email Templates > Magic Link).
- **Adresse inconnue à la connexion** : même message qu'une adresse connue (« si cette adresse a un compte… »), pour ne pas révéler qui a un compte.
- **Acceptation d'invitation = connexion immédiate** : le serveur crée le compte, puis génère et vérifie aussitôt un lien magique, ce qui pose la session sans attendre de code.
- **Une personne déjà membre d'une autre entreprise** réutilise son compte ; une personne désactivée puis réinvitée retrouve son appartenance (réactivée avec le nouveau rôle).
- **Pas d'import CSV en V1** (décision du fondateur à l'étape 0).
- **Emails** : gabarits HTML en TypeScript (`lib/email/templates.ts`) plutôt que React Email, pour limiter les dépendances ; envoi par l'API HTTP de Resend. Sans `RESEND_API_KEY`, l'email est simulé (journaux serveur) ; avec `DEV_EMAIL_REDIRECT`, tout part vers cette adresse unique.
- **Clés étrangères composites** (`(team_id, organization_id)`, `(membership_id, organization_id)`) : la base interdit de rattacher une personne à l'équipe d'une autre entreprise.
- **Colonnes modifiables restreintes** par des droits par colonne (ex. un utilisateur ne peut modifier que prénom, nom, téléphone de son profil), en plus de la RLS et de déclencheurs de garde (statut d'entreprise, drapeau super admin).
- **Le journal d'activité et le journal des emails** ne sont écrits qu'avec la clé serveur, après l'action de l'utilisateur ; un échec d'écriture du journal ne bloque pas l'action.
- **Actions destructives** : confirmation en deux appuis sur le même bouton plutôt qu'une fenêtre modale (plus rapide au pouce).
- **Tests de la base en local** : sans Docker, `pnpm db:test:local` applique les migrations et les tests pgTAP sur un PostgreSQL ordinaire avec une émulation minimale de Supabase (`tests/db/supabase-shim.sql`). La CI les rejoue sur un vrai Supabase local.
- **Types de la base écrits à la main** (`lib/supabase/types.ts`) en attendant de pouvoir lancer `supabase gen types`.
- **Supabase en ligne** : le compte gratuit a déjà 2 projets actifs. Décision reportée par le fondateur : l'étape 1 est construite et testée sans base en ligne.

## 22/11/2026 — Étape 0

### Validé avec le fondateur

- **Reconstruction complète** plutôt qu'évolution de l'ancienne app (React + Vite en JavaScript, écritures directes du navigateur vers la base). L'ancienne app reste sur la branche `main` jusqu'à la V1 ; la nouvelle vit sur des branches d'étape.
- **Hébergement Vercel** (région Paris) au lieu de Railway. Raison : Next.js natif, et le domaine nu `premiereligne-app.fr` se branche chez OVH avec un simple enregistrement A, ce que Railway ne permet pas.
- **Charte Première Ligne existante** à la place de la palette du §10.2 : forêt `#0B3D2E`, forêt profond `#072820` (texte), fluo `#D4FF3A` (accent), os `#F4F2EE` (fond), ligne `#E8E4DC`. Les couleurs de niveaux (§6.4) restent celles de la spec. Le bouton principal est fluo avec texte forêt : le blanc sur fluo est illisible.
- **Dojos dès la V1**, rattachés aux compétences, avec suggestion automatique quand une compétence est faible. Ils remplacent et avancent le module « Formations » du §5.3. À spécifier avant l'étape 2.
- **Pas de classement entre vendeurs** (l'ancienne app en avait un). Sujet sensible (CSE, RGPD) et démotivant. Badges de progression personnelle envisagés en V2.
- **Connexion par code reçu par email** (OTP Supabase, sans mot de passe), en plus ou à la place du mot de passe du §4.1. À détailler à l'étape 1.
- **Allègements V1** : un seul référentiel par commercial, pas de sélecteur multi-entreprise, pas d'import CSV, liste des coachings sans vue calendrier. Le modèle de données garde la possibilité de les ajouter.
- **Deux modèles de référentiel fournis** : « Vente automobile » (les 12 compétences du kit formation) et « Vente en face à face » (§17).

### Choix techniques

- **Next.js 16** au lieu de 15 : version stable actuelle. Conséquences : `proxy.ts` remplace `middleware.ts`, Cache Components activé (`cacheComponents: true`). La documentation de la version installée est dans `node_modules/next/dist/docs/` (voir `AGENTS.md`).
- **Composants shadcn/ui écrits à la main** dans `components/ui` sur la base Radix (`radix-ui`), car le registre shadcn n'est pas joignable depuis l'environnement de développement. Même structure et mêmes conventions que shadcn ; on pourra ajouter des composants avec la CLI depuis un poste qui y a accès.
- **Polices auto-hébergées** (Sora et Inter via `@fontsource-variable`, chargées par `next/font/local`) : aucune requête vers Google Fonts, compatible RGPD, et le build fonctionne hors ligne.
- **Inscription publique désactivée** dans Supabase (`enable_signup = false`) : les comptes ne sont créés que par invitation (§4.1).
- **Supabase** : nouveau projet en région UE à l'étape 1, plutôt que réinitialiser l'ancien projet (en pause, région eu-north-1) qui contient les données de l'ancienne app. L'ancien pourra être supprimé une fois la V1 en ligne.
- **Supabase local** : Docker n'est pas disponible dans l'environnement de développement de Claude. Les tests RLS tournent dans la CI GitHub Actions (`supabase start` puis `supabase test db`). Un premier test vérifie que toutes les tables du schéma public ont la RLS activée.
- **Tests de bout en bout** : Playwright avec deux projets, « ordinateur » et « mobile » (iPhone 13, moteur Chromium). La variable `PLAYWRIGHT_CHROME_PATH` permet d'utiliser un Chrome déjà installé.
- **Adresse de contact** de la page d'accueil : `contact@premiereligne-app.fr`, à créer ou à remplacer (`lib/i18n/fr.ts`).
