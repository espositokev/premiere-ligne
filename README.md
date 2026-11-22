# Première Ligne

Plateforme de suivi de la montée en compétences des équipes commerciales : référentiel, évaluations, coachings terrain, plans de progrès et Dojos.

Cahier des charges : [`docs/SPEC.md`](docs/SPEC.md) · Décisions : [`docs/DECISIONS.md`](docs/DECISIONS.md) · Avancement : [`docs/PROGRESS.md`](docs/PROGRESS.md)

## Lancer le projet en local

Prérequis : Node.js 22, pnpm 10 (`corepack enable`), et Docker pour la base locale.

```bash
pnpm install
cp .env.example .env.local   # puis remplir les valeurs
pnpm dev                     # http://localhost:3000
```

Base de données locale :

```bash
pnpm db:start     # démarre Supabase dans Docker, applique les migrations
pnpm db:test      # tests de sécurité (RLS)
pnpm db:stop
```

## Vérifier avant de livrer

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e     # ordinateur + mobile
```

La CI GitHub Actions lance les mêmes vérifications, plus les tests RLS, à chaque pull request.

## Organisation

```
app/(public)     accueil, connexion, pages légales
components/ui    composants de base (shadcn/ui, aux couleurs Première Ligne)
components/brand logo
lib/domain       calculs métier purs (testés)
lib/supabase     clients Supabase (navigateur, serveur, service)
lib/i18n/fr.ts   tous les textes affichés
supabase/        configuration, migrations, tests SQL
tests/           tests unitaires et de bout en bout
docs/            cahier des charges, décisions, avancement
```
