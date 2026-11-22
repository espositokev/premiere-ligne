# Première Ligne — Cahier des charges de la plateforme

> **À l'attention de Claude Code.** Ce document est la référence unique du projet. Lis-le en entier avant de commencer. Il décrit le produit, les règles métier, le modèle de données, la sécurité, le design, la méthode de travail et le découpage en étapes. Quand une information manque, choisis l'option la plus simple compatible avec ce document, note ton choix dans `DECISIONS.md` et continue. Ne pose une question que si le choix est irréversible (suppression de données, dépense, sécurité).

---

## 0. Sommaire

1. Contexte et vision
2. Rôles et permissions
3. Parcours principaux
4. Fonctionnalités détaillées (V1)
5. Fonctionnalités V2 (à préparer, pas à coder en V1)
6. Règles métier et calculs
7. Modèle de données (Postgres / Supabase)
8. Sécurité, multi-entreprises et RLS
9. Emails et notifications
10. Identité visuelle et design
11. Écrans par rôle
12. Architecture technique et conventions
13. Tests et qualité
14. RGPD et conformité
15. Mise en place (ce que l'humain doit faire)
16. Plan de réalisation par étapes
17. Données de démonstration
18. Méthode de travail de Claude Code

---

## 1. Contexte et vision

**Première Ligne** est une société de conseil et de formation pour les entreprises qui ont des forces de vente.
Slogan : **« On forme là où ça se joue. »**

Le fondateur forme soit directement les équipes commerciales, soit les managers pour qu'ils deviennent eux-mêmes formateurs et coachs de leurs équipes.

La plateforme est un **SaaS multi-entreprises** qui accompagne ces missions :

- le fondateur (**super admin**) crée un espace par entreprise cliente ;
- dans chaque espace, des **managers** suivent la montée en compétences de leurs **commerciaux** : référentiel de compétences, évaluations, coachings terrain, plans d'action ;
- chaque commercial a son propre accès pour voir où il en est et ce qu'il doit travailler.

**Principes produit**

- Terrain d'abord : les managers utilisent l'outil entre deux rendez-vous, souvent sur téléphone. Tout doit être rapide et utilisable sur mobile.
- Simple et lisible : peu d'écrans, des actions évidentes, aucun jargon technique.
- Le commercial est acteur : il voit sa progression, ses forces, ses axes, ses actions.
- Chaque entreprise est totalement isolée des autres.
- Le référentiel est personnalisable par entreprise, à partir de modèles fournis par Première Ligne.

**Langue** : tout en français (interface, emails, messages d'erreur). Dates au format `jj/mm/aaaa`, fuseau `Europe/Paris`.

---

## 2. Rôles et permissions

### 2.1 Rôles

| Rôle | Portée | Description |
|---|---|---|
| `super_admin` | Toute la plateforme | Le fondateur de Première Ligne. Crée et gère les entreprises, les modèles de référentiels, peut voir n'importe quel espace. |
| `org_admin` | Son entreprise | Responsable côté client (directeur commercial, RH). Gère les utilisateurs, les équipes et le référentiel de son entreprise. Voit tout dans son entreprise. |
| `manager` | Son ou ses équipes | Évalue, coache et suit les commerciaux qui lui sont rattachés. |
| `sales_rep` | Lui-même | Commercial. Voit son profil, sa matrice, ses coachings clôturés, ses actions. Peut s'auto-évaluer. |

- `super_admin` est un attribut du profil (`profiles.is_super_admin`), pas une appartenance à une entreprise.
- Les autres rôles sont portés par une **appartenance** (`memberships`) : un utilisateur peut, en théorie, appartenir à plusieurs entreprises (cas rare, mais le modèle le permet). Un sélecteur d'entreprise apparaît alors dans l'en-tête.
- Un `org_admin` peut aussi être manager d'une équipe : il suffit de le désigner comme manager de cette équipe.

### 2.2 Matrice des permissions

| Action | super_admin | org_admin | manager | sales_rep |
|---|---|---|---|---|
| Créer / archiver une entreprise | ✅ | ❌ | ❌ | ❌ |
| Gérer les modèles de référentiels globaux | ✅ | ❌ | ❌ | ❌ |
| Inviter un org_admin | ✅ | ✅ | ❌ | ❌ |
| Inviter un manager | ✅ | ✅ | ❌ | ❌ |
| Inviter un commercial | ✅ | ✅ | ✅ (dans ses équipes) | ❌ |
| Créer / modifier les équipes | ✅ | ✅ | ❌ | ❌ |
| Modifier le référentiel de l'entreprise | ✅ | ✅ | ❌ | ❌ |
| Voir tous les commerciaux de l'entreprise | ✅ | ✅ | ❌ (seulement les siens) | ❌ |
| Évaluer un commercial | ✅ | ✅ | ✅ (les siens) | ❌ |
| S'auto-évaluer | ❌ | ❌ | ❌ | ✅ |
| Planifier / réaliser un coaching | ✅ | ✅ | ✅ (les siens) | ❌ |
| Demander un coaching | ❌ | ❌ | ❌ | ✅ |
| Voir un CR de coaching | ✅ | ✅ | ✅ (les siens) | ✅ (les siens, une fois clôturés) |
| Créer une action de plan de progrès | ✅ | ✅ | ✅ (les siens) | ✅ (pour lui-même) |
| Passer une action à « faite » | ✅ | ✅ | ✅ | ✅ (les siennes) |
| « Voir en tant que » (lecture seule) | ✅ | ✅ (dans son entreprise) | ❌ | ❌ |
| Exporter les données (CSV) | ✅ | ✅ | ✅ (ses équipes) | ❌ |

**Ces règles doivent être appliquées dans la base (RLS), pas seulement dans l'interface.**

---

## 3. Parcours principaux

### 3.1 Création d'une entreprise cliente (super admin)

1. Le super admin clique « Nouvelle entreprise », saisit le nom, choisit un modèle de référentiel (ou aucun), et éventuellement un logo et une couleur d'accent.
2. Le référentiel choisi est **copié** dans l'entreprise (les modifications ultérieures de l'entreprise n'affectent pas le modèle, et inversement).
3. Il invite un ou plusieurs `org_admin` et/ou managers par email.
4. L'entreprise apparaît dans sa liste avec un statut `actif`.

### 3.2 Invitation et premier accès

1. Un utilisateur habilité saisit : email, prénom, nom, rôle, équipe (et manager pour un commercial), intitulé de poste.
2. Un email d'invitation est envoyé avec un lien unique valable 7 jours.
3. La personne clique, choisit son mot de passe, accepte les CGU et la politique de confidentialité, et arrive sur son tableau de bord.
4. L'invitation peut être renvoyée ou annulée tant qu'elle n'est pas acceptée.
5. Connexion ensuite par email + mot de passe. « Mot de passe oublié » par lien email.

### 3.3 Cycle de suivi d'un commercial

1. Le manager fait une **évaluation** du commercial sur le référentiel (note de 0 à 4 par compétence).
2. Le commercial peut faire une **auto-évaluation** (facultative), affichée à côté.
3. Le manager planifie un **coaching terrain** ciblé sur 1 à 3 compétences.
4. Après le coaching, il rédige le **compte rendu** (points forts, axes de progrès, plan d'action) et le **clôture**. Le commercial reçoit un email et voit le CR.
5. Les **actions** du plan d'action alimentent le plan de progrès du commercial, avec échéances.
6. À l'évaluation suivante, la progression est visible (radar, historique, évolution par compétence).

---

## 4. Fonctionnalités détaillées (V1)

### 4.1 Authentification et comptes

- Supabase Auth, email + mot de passe. Pas d'inscription publique : uniquement sur invitation.
- Page de connexion, mot de passe oublié, réinitialisation, acceptation d'invitation.
- Profil : prénom, nom, téléphone (facultatif), photo (facultative), changement de mot de passe.
- Déconnexion. Session persistante raisonnable (rafraîchissement automatique Supabase).
- Un compte désactivé ne peut plus se connecter (vérifier `memberships.active` et `organizations.status`).

### 4.2 Espace super admin

- **Liste des entreprises** : nom, nombre d'utilisateurs actifs par rôle, date de création, dernière activité, statut (`actif`, `suspendu`, `archivé`).
- **Fiche entreprise** : informations, utilisateurs, équipes, référentiel, bouton « Entrer dans l'espace » (navigue dans l'espace de l'entreprise avec les droits super admin).
- **Modèles de référentiels** : créer, dupliquer, modifier, publier/dépublier un modèle. Un modèle non publié n'est pas proposé à la création d'entreprise.
- **Journal d'activité** global (lecture) : connexions, créations, suppressions, « voir en tant que ».

### 4.3 Gestion des utilisateurs et équipes (org_admin, super admin)

- Liste des utilisateurs de l'entreprise : nom, email, rôle, équipe, manager, statut (invité / actif / désactivé), dernière connexion. Filtres par rôle, équipe, statut. Recherche.
- Inviter, renvoyer l'invitation, modifier (rôle, équipe, manager, poste), désactiver / réactiver.
- **Pas de suppression physique d'un utilisateur ayant des données** : seulement désactivation. Suppression possible uniquement pour une invitation jamais acceptée.
- Équipes : nom, manager(s) de l'équipe, membres. Un commercial appartient à une seule équipe à la fois. Une équipe peut avoir plusieurs managers.
- Import CSV de commerciaux (prénom, nom, email, équipe, poste) avec aperçu et rapport d'erreurs avant validation. Les invitations sont envoyées après validation.

### 4.4 Référentiel de compétences

Structure : **Référentiel > Blocs > Compétences > Descripteurs de niveaux**.

- Une entreprise peut avoir **plusieurs référentiels** (ex. « Vendeur magasin », « Commercial terrain B2B »). Chaque commercial est rattaché à **un ou plusieurs** référentiels (selon son poste).
- **Bloc** : nom, ordre, actif.
- **Compétence** : intitulé, description courte, ordre, actif, et **5 descripteurs de niveau** (0 à 4), facultatifs, qui expliquent concrètement ce que veut dire chaque niveau pour cette compétence.
- Niveaux par défaut (modifiables globalement par entreprise) :
  - 0 — Ne connaît pas
  - 1 — Connaît la théorie, ne l'applique pas encore
  - 2 — Applique, avec des axes d'amélioration
  - 3 — Maîtrise, résultats réguliers
  - 4 — Expert, capable de transmettre
- Actions : ajouter, modifier, réordonner (flèches haut/bas ou glisser-déposer), dupliquer, désactiver, réactiver, supprimer.
- **Règle de suppression** : une compétence (ou un bloc, ou un référentiel) ne peut être supprimée que si elle n'a **jamais été utilisée** (aucune note, aucune action, aucun coaching qui la cible). Sinon, seule la désactivation est proposée. Le serveur refait toujours ce contrôle.
- Les éléments désactivés sont **masqués par défaut**, avec un lien « Afficher les désactivés (n) » par bloc.
- Une compétence désactivée disparaît des nouvelles évaluations mais reste visible dans l'historique.

### 4.5 Évaluations

- Le manager ouvre la fiche d'un commercial > « Nouvelle évaluation ». Il choisit le référentiel (si plusieurs).
- Pour chaque compétence active : note 0 à 4 (boutons, pas de liste déroulante), commentaire facultatif. Les descripteurs de niveau s'affichent au survol ou au tap.
- La note précédente de chaque compétence est rappelée en petit.
- Enregistrement automatique en **brouillon** pendant la saisie (debounce ~1,5 s, indicateur « Brouillon enregistré à hh:mm »). Avant de quitter la page avec des modifications non envoyées, enregistrer immédiatement ; prévenir si l'envoi échoue.
- Bouton **« Valider l'évaluation »** : l'évaluation devient définitive, datée, non modifiable (sauf par org_admin/super admin, avec trace dans le journal).
- Une compétence peut rester non notée (« non évaluée »).
- **Auto-évaluation** : même écran côté commercial, type `self`. Elle n'écrase jamais l'évaluation du manager ; les deux sont affichées côte à côte.
- Le commercial voit les évaluations du manager une fois validées.

### 4.6 Fiche commercial (vue manager)

- En-tête : nom, poste, équipe, manager, ancienneté, référentiel(s).
- **Radar** par bloc (moyenne des dernières notes des compétences du bloc), avec en superposition la dernière auto-évaluation (pointillés) et l'évaluation précédente (couleur claire).
- **Matrice** : liste des compétences par bloc avec la dernière note (pastille de couleur), l'évolution depuis la note précédente (↑ ↓ =), la date.
- Onglets : Matrice · Historique des évaluations · Coachings · Plan de progrès · Notes privées du manager.
- **Notes privées** : texte libre daté, visible uniquement par les managers et admins, jamais par le commercial.
- Indicateurs rapides : dernier coaching, prochain coaching prévu, actions en retard, % de compétences maîtrisées (voir §6.3).

### 4.7 Coachings terrain

- **Planifier** : commercial, date et heure, durée, lieu ou mode (`terrain`, `distance`), compétences ciblées (1 à 3), objectif (texte court).
- **Statuts** :
  - `planifie` : à venir ;
  - `a_rediger` : date passée, CR non clôturé ;
  - `cloture` : CR clôturé, visible par le commercial ;
  - `annule` : avec motif.
  Le passage de `planifie` à `a_rediger` est **calculé** (date passée), pas stocké.
- **Compte rendu** : contexte (texte), observations par compétence ciblée (note facultative 0-4 + commentaire), points forts, axes de progrès, plan d'action (une ou plusieurs actions, voir §4.8), commentaire du commercial (saisi par le commercial après clôture, facultatif).
- Enregistrement automatique en brouillon, comme pour les évaluations.
- **Clôturer** : fige le CR, envoie un email au commercial, crée les actions du plan d'action dans son plan de progrès. Une note donnée dans le CR **n'est pas** une évaluation officielle (elle est affichée dans l'historique de la compétence avec la mention « observée en coaching »).
- **Rouvrir** un CR clôturé : réservé à org_admin et super admin, avec motif, journalisé.
- **Demande de coaching** par le commercial : il choisit une ou plusieurs compétences et écrit un message ; le manager reçoit une notification et peut transformer la demande en coaching planifié ou la refuser avec un message.
- **Vue calendrier** du manager : semaine et liste, avec ses coachings et ceux de son équipe.
- **Tableau de bord manager** : coachings à rédiger (avec ancienneté), à venir sur 14 jours, demandes en attente, commerciaux sans coaching depuis plus de N jours (N paramétrable par entreprise, défaut 45).

### 4.8 Plan de progrès (actions)

- Une **action** : titre, description, compétence liée (facultative), échéance (facultative), statut (`a_faire`, `en_cours`, `faite`, `abandonnee`), origine (`coaching`, `evaluation`, `manuelle`), créée par, date de réalisation.
- Le commercial et son manager peuvent créer, modifier et changer le statut des actions du commercial.
- Une action dont l'échéance est dépassée et non faite est **en retard** (badge rouge).
- Vue commercial : actions groupées par statut, triées par échéance.
- Vue manager : actions de toute son équipe, filtrables (en retard, par commercial, par compétence).

### 4.9 Vue commercial

- **Ma matrice** : radar + liste des compétences avec dernière note du manager, ma dernière auto-évaluation, les descripteurs de niveaux.
- **Mon historique** : évaluations validées, datées.
- **Mes coachings** : à venir (date, objectif, compétences) et clôturés (CR complet, possibilité d'ajouter mon commentaire).
- **Mon plan de progrès** : mes actions.
- Bouton **« Demander un coaching »**.
- **M'auto-évaluer**.
- Le commercial ne voit jamais : les notes privées du manager, les CR non clôturés, les données des autres commerciaux.

### 4.10 Tableaux de bord

- **Manager** : voir §4.7, plus la moyenne de l'équipe par bloc (radar équipe) et le classement des compétences les plus faibles de l'équipe (pour orienter des formations collectives).
- **org_admin** : mêmes indicateurs agrégés par équipe et pour toute l'entreprise, nombre de coachings clôturés par mois et par manager, taux de CR rédigés sous 48 h, couverture (part des commerciaux évalués dans les 90 derniers jours).
- **super admin** : activité par entreprise (utilisateurs actifs sur 30 jours, coachings du mois, évaluations du mois).
- Graphiques simples et lisibles (Recharts). Export CSV des tableaux.

### 4.11 « Voir en tant que »

- Réservé au super admin (toute entreprise) et à l'org_admin (son entreprise).
- Affiche l'application exactement comme l'utilisateur choisi la voit, **en lecture seule** (toutes les écritures sont bloquées côté serveur), avec un bandeau permanent « Aperçu en tant que X — lecture seule » et un bouton « Revenir à ma vue ».
- Chaque début d'aperçu est journalisé.
- Implémentation : ne **pas** usurper la session Supabase. Passer un identifiant de « vue simulée » dans un cookie signé ; les requêtes de lecture côté serveur filtrent selon ce profil simulé, en utilisant le client service-role **uniquement** dans des fonctions serveur qui revérifient que l'utilisateur réel a le droit d'aperçu.

### 4.12 Journal d'activité

Table `audit_log` alimentée côté serveur pour : connexion, invitation, changement de rôle, désactivation, suppression, validation d'évaluation, clôture/réouverture de CR, « voir en tant que », exports. Consultable par super admin (tout) et org_admin (son entreprise).

---

## 5. Fonctionnalités V2 (à préparer, pas à coder en V1)

Prévoir le modèle de données et l'architecture pour pouvoir ajouter sans refonte :

1. **Entretiens individuels mensuels** : trame configurable par entreprise (sections, questions), engagements du mois et suivi le mois suivant, **indicateurs de performance** (réalisé / objectif, sens « plus haut = mieux » ou « plus bas = mieux », couleur vert/rouge/gris), catalogue d'indicateurs par entreprise.
2. **Parcours d'évolution** : métiers visés (ex. Manager d'équipe, Formateur interne), chacun avec son référentiel cible ; progression = part des compétences du référentiel actuel à 3/4 ou plus ; un encart discret dans la vue commercial (« 🔒 Évolution · N parcours à débloquer · 68 % ») ; à 100 %, badge « Éligible » côté manager ; validation par le manager pour démarrer le parcours.
3. **Formations** : catalogue (présentiel, e-learning, lien externe), affectation à des commerciaux ou équipes, suivi (à faire / faite), lien avec les compétences.
4. **Auto-évaluation des managers** sur un référentiel « Manager-coach » (compétences pédagogiques) et évaluation par le super admin ou l'org_admin.
5. **Personnalisation de marque par entreprise** (logo et couleur d'accent dans l'espace client).
6. **Facturation** (abonnement par entreprise et par nombre d'utilisateurs actifs) via Stripe.
7. **Application mobile** (PWA d'abord).

---

## 6. Règles métier et calculs

### 6.1 Dernière note d'une compétence

Pour un commercial et une compétence : la note de la **dernière évaluation validée de type `manager`** qui contient une note pour cette compétence. Les auto-évaluations et les notes « observées en coaching » ne comptent pas, mais sont affichées séparément.

### 6.2 Moyennes et radar

- Moyenne d'un bloc = moyenne des dernières notes des compétences **actives** du bloc qui ont une note. Les compétences non évaluées sont ignorées (et signalées « n compétences non évaluées »).
- Arrondi à 1 décimale à l'affichage.
- Radar : un axe par bloc, échelle 0 à 4.
- Moyenne d'équipe = moyenne des moyennes des commerciaux actifs de l'équipe.

### 6.3 % de maîtrise

`% maîtrise = (nombre de compétences actives dont la dernière note ≥ 3) / (nombre de compétences actives du ou des référentiels du commercial) × 100`.
Une compétence jamais évaluée compte comme **non maîtrisée**. Arrondi à l'entier.

### 6.4 Couleurs des notes

0 et 1 : rouge · 2 : orange · 3 : vert · 4 : bleu · non évaluée : gris. Toujours accompagner la couleur du chiffre (accessibilité).

### 6.5 Coachings

- `a_rediger` si `date_heure + durée < maintenant` et statut ≠ `cloture`/`annule`.
- Relance email au coach si un coaching est `a_rediger` depuis plus de 48 h, puis une fois par semaine maximum.
- « Sans coaching depuis N jours » : N = paramètre entreprise (défaut 45), calculé sur le dernier coaching clôturé.

### 6.6 Actions

- En retard : `echeance < aujourd'hui` et statut dans (`a_faire`, `en_cours`).
- Quand un coaching est clôturé, ses actions sont créées avec l'origine `coaching` et le lien vers le coaching.

### 6.7 Suppression et désactivation

- Règle générale : **on ne supprime jamais une donnée référencée** ; on désactive.
- Un élément est « utilisé » s'il est référencé par une note, une action, un coaching, une demande ou une évaluation (brouillon compris).
- Le contrôle est fait par une fonction SQL (`is_skill_used(skill_id)`, etc.) appelée côté serveur ; l'interface n'affiche « Supprimer » que si l'élément est supprimable, mais le serveur revérifie toujours.

### 6.8 Paramètres par entreprise

`settings` (JSON validé par Zod) : libellés des niveaux 0-4, N jours sans coaching, délai de relance CR, autoriser l'auto-évaluation (oui/non), autoriser les demandes de coaching (oui/non), couleur d'accent (V2).

---

## 7. Modèle de données (Postgres / Supabase)

> Toutes les tables métier ont : `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz` (trigger), et **`organization_id uuid not null`** (sauf tables globales indiquées). Clés étrangères avec `on delete restrict` par défaut. Créer les index sur toutes les clés étrangères et sur `organization_id`.

### 7.1 Tables globales

```sql
profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  phone text,
  avatar_url text,
  is_super_admin boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz
)

organizations (
  id uuid pk,
  name text not null,
  slug text not null unique,
  logo_url text,
  status text not null default 'actif' check (status in ('actif','suspendu','archive')),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id),
  created_at, updated_at
)

-- Modèles de référentiels (gérés par le super admin)
framework_templates (id, name, description, published boolean default false, created_at, updated_at)
template_blocks (id, template_id fk, name, position int, created_at, updated_at)
template_skills (id, block_id fk, name, description, position int,
                 level_0 text, level_1 text, level_2 text, level_3 text, level_4 text,
                 created_at, updated_at)
```

### 7.2 Appartenances, équipes, invitations

```sql
memberships (
  id uuid pk,
  organization_id uuid not null references organizations(id),
  user_id uuid not null references profiles(id),
  role text not null check (role in ('org_admin','manager','sales_rep')),
  job_title text,
  team_id uuid references teams(id),          -- pour un sales_rep : son équipe
  active boolean not null default true,
  hired_at date,
  created_at, updated_at,
  unique (organization_id, user_id)
)

teams (id, organization_id, name, active boolean default true, created_at, updated_at)

team_managers (
  team_id uuid references teams(id),
  membership_id uuid references memberships(id),   -- un manager ou org_admin
  organization_id uuid not null,
  primary key (team_id, membership_id)
)

invitations (
  id uuid pk,
  organization_id uuid not null,
  email text not null,
  first_name text, last_name text,
  role text not null check (role in ('org_admin','manager','sales_rep')),
  team_id uuid references teams(id),
  job_title text,
  token_hash text not null,            -- on stocke un hash, jamais le jeton en clair
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid references profiles(id),
  created_at
)
```

### 7.3 Référentiels de l'entreprise

```sql
frameworks (id, organization_id, name, description, source_template_id uuid null,
            active boolean default true, created_at, updated_at)
blocks (id, organization_id, framework_id fk, name, position int, active boolean default true, created_at, updated_at)
skills (id, organization_id, block_id fk, name, description, position int, active boolean default true,
        level_0 text, level_1 text, level_2 text, level_3 text, level_4 text,
        created_at, updated_at)

member_frameworks (           -- référentiel(s) d'un commercial
  membership_id uuid references memberships(id),
  framework_id uuid references frameworks(id),
  organization_id uuid not null,
  primary key (membership_id, framework_id)
)
```

### 7.4 Évaluations

```sql
evaluations (
  id uuid pk,
  organization_id uuid not null,
  subject_membership_id uuid not null references memberships(id),   -- le commercial évalué
  author_membership_id uuid references memberships(id),             -- null si super admin
  author_user_id uuid not null references profiles(id),
  framework_id uuid not null references frameworks(id),
  kind text not null check (kind in ('manager','self')),
  status text not null default 'brouillon' check (status in ('brouillon','validee')),
  general_comment text,
  validated_at timestamptz,
  created_at, updated_at
)

evaluation_scores (
  evaluation_id uuid references evaluations(id) on delete cascade,
  skill_id uuid references skills(id),
  organization_id uuid not null,
  score smallint check (score between 0 and 4),   -- null = non évaluée
  comment text,
  primary key (evaluation_id, skill_id)
)
```

Vue utile : `v_latest_skill_scores (subject_membership_id, skill_id, score, evaluated_at)` = dernière note validée de type `manager` par compétence (§6.1). Écrire aussi une fonction `mastery_percent(membership_id)` (§6.3).

### 7.5 Coachings

```sql
coachings (
  id uuid pk,
  organization_id uuid not null,
  subject_membership_id uuid not null references memberships(id),
  coach_membership_id uuid references memberships(id),
  coach_user_id uuid not null references profiles(id),
  scheduled_at timestamptz not null,
  duration_minutes int not null default 120,
  mode text not null default 'terrain' check (mode in ('terrain','distance')),
  location text,
  objective text,
  status text not null default 'planifie' check (status in ('planifie','cloture','annule')),
  cancel_reason text,
  context text,
  strengths text,
  improvements text,
  rep_comment text,                -- saisi par le commercial après clôture
  closed_at timestamptz,
  reopened_at timestamptz, reopen_reason text,
  request_id uuid references coaching_requests(id),
  created_at, updated_at
)

coaching_skills (                  -- compétences ciblées + observation
  coaching_id uuid references coachings(id) on delete cascade,
  skill_id uuid references skills(id),
  organization_id uuid not null,
  observed_score smallint check (observed_score between 0 and 4),
  comment text,
  primary key (coaching_id, skill_id)
)

coaching_requests (
  id uuid pk, organization_id uuid not null,
  requester_membership_id uuid not null references memberships(id),
  message text,
  skill_ids uuid[] not null default '{}',
  status text not null default 'en_attente' check (status in ('en_attente','acceptee','refusee')),
  answer text, answered_by uuid references profiles(id), answered_at timestamptz,
  created_at, updated_at
)
```

### 7.6 Plan de progrès, notes, journal

```sql
actions (
  id uuid pk, organization_id uuid not null,
  subject_membership_id uuid not null references memberships(id),
  skill_id uuid references skills(id),
  title text not null,
  description text,
  due_date date,
  status text not null default 'a_faire' check (status in ('a_faire','en_cours','faite','abandonnee')),
  source text not null default 'manuelle' check (source in ('coaching','evaluation','manuelle')),
  coaching_id uuid references coachings(id),
  created_by uuid not null references profiles(id),
  done_at timestamptz,
  created_at, updated_at
)

manager_notes (
  id uuid pk, organization_id uuid not null,
  subject_membership_id uuid not null references memberships(id),
  author_user_id uuid not null references profiles(id),
  body text not null,
  created_at, updated_at
)

audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid,             -- null pour les actions globales
  actor_user_id uuid references profiles(id),
  action text not null,             -- ex. 'invitation.created', 'coaching.closed'
  target_type text, target_id uuid,
  details jsonb,
  created_at timestamptz default now()
)

email_log (id, organization_id, to_email, template, status, provider_id, error, created_at)
```

### 7.7 Préparation V2 (créer les tables seulement à l'étape V2)

`one_on_one_templates`, `one_on_ones`, `kpi_definitions`, `kpi_values`, `career_paths`, `career_path_skills`, `trainings`, `training_assignments`. Toutes avec `organization_id`.

---

## 8. Sécurité, multi-entreprises et RLS

### 8.1 Principes

- **RLS activée sur toutes les tables** du schéma `public`, sans exception. Aucune table accessible sans politique.
- Le client navigateur utilise uniquement la clé `anon` + la session de l'utilisateur.
- La clé `service_role` n'est utilisée que côté serveur (server actions / route handlers), jamais exposée au navigateur, et uniquement quand c'est indispensable (invitations, emails, « voir en tant que », tâches planifiées). Chaque usage revérifie les droits de l'utilisateur réel.
- Toutes les entrées utilisateur sont validées par **Zod** côté serveur.
- Toutes les écritures passent par des **server actions** ; pas d'écriture directe depuis le navigateur.

### 8.2 Fonctions d'aide (SQL, `security definer`, `search_path` fixé)

```sql
is_super_admin() returns boolean
my_membership(org uuid) returns memberships            -- appartenance active de auth.uid() dans org
my_role(org uuid) returns text
is_org_admin(org uuid) returns boolean
managed_member_ids(org uuid) returns setof uuid        -- memberships des commerciaux des équipes que je manage
can_view_member(member uuid) returns boolean           -- super admin, org_admin de l'org, manager de son équipe, ou soi-même
can_manage_member(member uuid) returns boolean         -- super admin, org_admin, manager de son équipe
```

### 8.3 Politiques (résumé à implémenter table par table)

- `organizations` : lecture si super admin ou membre actif ; écriture super admin uniquement (org_admin peut modifier `settings` et le logo).
- `profiles` : chacun lit et modifie le sien ; lecture des profils des membres de ses organisations ; super admin tout.
- `memberships`, `teams`, `team_managers`, `invitations` : lecture par les membres de l'org selon `can_view_member` ; écriture org_admin / super admin ; un manager peut créer une invitation `sales_rep` pour ses équipes.
- `frameworks`, `blocks`, `skills`, `member_frameworks` : lecture par tout membre actif de l'org ; écriture org_admin / super admin.
- `framework_templates`, `template_*` : lecture et écriture super admin uniquement.
- `evaluations`, `evaluation_scores` : lecture si `can_view_member(subject)` **et** (pour le commercial lui-même : seulement `kind='self'` ou `status='validee'`) ; écriture manager/admin (`kind='manager'`) ou le commercial lui-même (`kind='self'`) ; une évaluation `validee` n'est plus modifiable sauf org_admin / super admin.
- `coachings`, `coaching_skills` : lecture si `can_view_member(subject)` ; le commercial ne lit que les coachings `planifie` (sans le contenu du CR) et `cloture` ; il ne peut écrire que `rep_comment` sur un coaching clôturé le concernant. Pour masquer le CR des coachings non clôturés au commercial, exposer une **vue** `v_my_coachings` côté commercial plutôt que la table brute.
- `coaching_requests` : création par le commercial pour lui-même ; lecture et réponse par ses managers et admins.
- `actions` : lecture/écriture si `can_view_member(subject)` (le commercial peut gérer les siennes).
- `manager_notes` : lecture/écriture `can_manage_member(subject)` ; **jamais** le commercial.
- `audit_log` : lecture super admin, et org_admin pour son org ; écriture uniquement via fonctions serveur.

### 8.4 Tests de sécurité obligatoires

Écrire des tests automatisés (voir §13) qui vérifient, avec de vrais utilisateurs de test :
- un utilisateur de l'entreprise A ne lit **aucune** ligne de l'entreprise B, sur chaque table ;
- un commercial ne lit pas les autres commerciaux, ni les notes privées, ni les CR non clôturés ;
- un manager ne lit pas les commerciaux d'une équipe qu'il ne manage pas ;
- un commercial ne peut pas modifier une évaluation du manager ;
- « voir en tant que » ne permet aucune écriture.

### 8.5 Autres mesures

- En-têtes de sécurité (CSP, HSTS, X-Frame-Options) via `next.config`/middleware.
- Limitation de débit sur la connexion, le mot de passe oublié et les invitations.
- Jetons d'invitation aléatoires (32 octets), stockés hachés, usage unique, 7 jours.
- Aucune donnée personnelle dans les URL (utiliser des identifiants uuid).
- Sauvegardes : activer les sauvegardes Supabase (Point-in-Time Recovery dès que possible).

---

## 9. Emails et notifications

Envoi via **Resend**, depuis `notifications@<domaine-premiere-ligne>`. Gabarits React Email aux couleurs de Première Ligne, en français, avec une version texte.

| Email | Destinataire | Déclencheur |
|---|---|---|
| Invitation | Invité | Création ou renvoi d'invitation |
| Mot de passe oublié | Utilisateur | Demande (géré par Supabase Auth, gabarit personnalisé) |
| CR de coaching disponible | Commercial | Clôture du coaching |
| Demande de coaching | Manager(s) de l'équipe | Nouvelle demande |
| Réponse à une demande | Commercial | Acceptation ou refus |
| Rappel CR à rédiger | Coach | 48 h après la fin du coaching, puis 1 fois/semaine max |
| Coaching planifié | Commercial | Création ou modification d'un coaching (avec fichier .ics) |

- Tâches planifiées (rappels) via **Supabase Cron** (pg_cron) appelant une Edge Function, ou Vercel Cron appelant une route protégée par un secret.
- Chaque envoi est tracé dans `email_log`.
- En environnement de développement, **aucun email réel** : utiliser l'adresse de test Resend ou une redirection vers une adresse unique définie dans `DEV_EMAIL_REDIRECT`.
- Notifications dans l'application (cloche) : V1 facultatif, sinon V2.

---

## 10. Identité visuelle et design

### 10.1 Marque

- Nom : **Première Ligne**. Slogan : **« On forme là où ça se joue. »**
- Logo texte (à créer en SVG) : « PREMIÈRE LIGNE » en capitales, graisse forte, avec un trait horizontal épais couleur Signal placé sous ou devant le mot « LIGNE » (la « ligne » de front). Variante carrée pour l'icône : « PL » + trait.
- Ton : direct, concret, encourageant, orienté terrain. Tutoiement côté commercial, vouvoiement neutre dans les emails aux décideurs (paramétrable plus tard).

### 10.2 Palette (proposition, à centraliser en variables CSS / thème Tailwind)

| Rôle | Nom | Hex |
|---|---|---|
| Primaire (texte fort, en-têtes) | Encre | `#14213D` |
| Accent (boutons principaux, trait du logo) | Signal | `#F2541B` |
| Fond | Craie | `#F7F5F0` |
| Surface (cartes) | Blanc | `#FFFFFF` |
| Bordures | Gris ligne | `#E3E0D8` |
| Texte secondaire | Ardoise | `#5B6474` |
| Succès / niveau 3 | Vert | `#2E9E6A` |
| Expert / niveau 4 | Bleu | `#2F6FDB` |
| Attention / niveau 2 | Ambre | `#E9A23B` |
| Erreur / niveaux 0-1 | Rouge | `#D64545` |

Prévoir un mode sombre plus tard (V2) : structurer dès maintenant les couleurs en tokens.

### 10.3 Typographie

- Titres : **Sora** (600/700), Google Fonts via `next/font`.
- Texte : **Inter** (400/500/600).
- Tailles : base 16 px, échelle modérée ; chiffres clés en grand (Sora 700).

### 10.4 Composants et règles

- Base : **shadcn/ui** (Radix) + Tailwind, personnalisés aux couleurs de la marque.
- Rayons 12 px pour les cartes, 8 px pour les champs et boutons. Ombres très légères.
- Navigation : barre latérale sur ordinateur, barre d'onglets en bas sur mobile (4 entrées max par rôle).
- **Mobile d'abord** pour les écrans manager (coachings, CR, évaluation) : boutons de note larges (au moins 44 px), saisie confortable au pouce.
- États vides soignés (illustration simple + phrase + bouton d'action).
- Toasts pour les confirmations, modales de confirmation pour les actions destructives.
- Accessibilité : contraste AA, focus visible, libellés sur tous les champs, navigation clavier, couleur jamais seule porteuse d'information.

---

## 11. Écrans par rôle

### Public
- `/connexion`, `/mot-de-passe-oublie`, `/reinitialiser`, `/invitation/[token]`, `/mentions-legales`, `/confidentialite`, `/cgu`.
- Page d'accueil publique simple de Première Ligne (`/`) : slogan, présentation courte, bouton « Se connecter », contact. (Pas de site marketing complet en V1.)

### Super admin (`/admin`)
- `/admin` : tableau de bord plateforme.
- `/admin/entreprises`, `/admin/entreprises/nouvelle`, `/admin/entreprises/[id]`.
- `/admin/modeles`, `/admin/modeles/[id]` (éditeur de modèle de référentiel).
- `/admin/journal`.

### Espace entreprise (`/e/[slug]/...`)
- `/e/[slug]` : tableau de bord selon le rôle.
- `/e/[slug]/equipe` : liste des commerciaux (manager : les siens ; org_admin : tous, filtrables par équipe).
- `/e/[slug]/commerciaux/[memberId]` : fiche commercial (onglets §4.6).
- `/e/[slug]/commerciaux/[memberId]/evaluations/nouvelle` et `/[evalId]`.
- `/e/[slug]/coachings` (liste + calendrier), `/e/[slug]/coachings/nouveau`, `/e/[slug]/coachings/[id]` (CR).
- `/e/[slug]/demandes` : demandes de coaching.
- `/e/[slug]/actions` : actions de l'équipe.
- `/e/[slug]/parametres/utilisateurs`, `/equipes`, `/referentiels`, `/referentiels/[id]`, `/entreprise`, `/journal` (org_admin).
- Vue commercial : `/e/[slug]/moi` (ma matrice), `/moi/historique`, `/moi/coachings`, `/moi/actions`, `/moi/auto-evaluation`.
- `/profil` : mon profil.

---

## 12. Architecture technique et conventions

### 12.1 Pile

- **Next.js 15** (App Router, Server Components, Server Actions), **TypeScript strict**.
- **Tailwind CSS** + **shadcn/ui** + **lucide-react** (icônes).
- **Supabase** : Postgres, Auth, Storage (logos, avatars), RLS, Cron. Région **Europe (Paris ou Francfort)**.
- **@supabase/ssr** pour la session côté serveur.
- **Zod** (validation), **React Hook Form** (formulaires), **date-fns** (dates, locale fr), **Recharts** (graphiques).
- **Resend** + **React Email** (emails).
- **Vitest** (unitaires), **Playwright** (bout en bout), tests SQL de RLS (voir §13).
- Hébergement **Vercel** (région `cdg1` Paris si disponible).
- Gestionnaire de paquets : **pnpm**.

### 12.2 Arborescence

```
/app
  /(public)          connexion, invitation, pages légales, accueil
  /admin             espace super admin
  /e/[slug]          espace entreprise (layout qui charge l'org et le rôle)
  /api               route handlers (cron, webhooks)
/components
  /ui                composants shadcn
  /charts            radar, barres
  /forms             formulaires réutilisables
/lib
  /supabase          clients (server, browser, service), helpers
  /auth              getCurrentUser, requireRole, preview-as
  /domain            calculs métier purs (moyennes, % maîtrise, statuts coaching) — testés unitairement
  /validation        schémas Zod
  /email             envoi + gabarits React Email
/supabase
  /migrations        migrations SQL versionnées (jamais modifier une migration déjà appliquée)
  /seed.sql          données de démonstration (§17)
  /tests             tests SQL de RLS
/tests
  /unit  /e2e
/docs                SPEC.md (ce fichier), DECISIONS.md, PROGRESS.md
```

### 12.3 Conventions

- Code (variables, fonctions, tables) en **anglais** ; textes affichés en **français**, centralisés dans `/lib/i18n/fr.ts`.
- Types de base générés : `supabase gen types typescript` → `/lib/supabase/types.ts`, régénérés à chaque migration.
- Une server action = une validation Zod + une vérification de droits + l'écriture + l'audit si nécessaire + `revalidatePath`.
- Les calculs métier (§6) vivent dans `/lib/domain` sous forme de fonctions pures, testées, et sont utilisés côté serveur. Si un calcul est fait en SQL (vue), il doit avoir un test qui compare avec la fonction TypeScript.
- Pas de `any`. ESLint + Prettier. Commits en français, au présent, courts (`ajoute la clôture des coachings`).
- Variables d'environnement documentées dans `.env.example` ; jamais de secret dans le dépôt.

### 12.4 Variables d'environnement

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # serveur uniquement
RESEND_API_KEY=
EMAIL_FROM="Première Ligne <notifications@exemple.fr>"
APP_URL=https://app.exemple.fr
CRON_SECRET=
PREVIEW_COOKIE_SECRET=
DEV_EMAIL_REDIRECT=                  # en dev : tous les emails partent ici
```

---

## 13. Tests et qualité

- **Unitaires (Vitest)** : toutes les fonctions de `/lib/domain` (moyennes, % maîtrise, statut calculé d'un coaching, actions en retard, règles de suppression), schémas Zod.
- **RLS** : tests SQL (pgTAP via `supabase test db`) ou script Vitest qui se connecte avec plusieurs utilisateurs de test et vérifie les cas du §8.4. **Bloquant** : aucune étape n'est terminée si ces tests échouent.
- **Bout en bout (Playwright)** : connexion, acceptation d'invitation, création d'une entreprise, évaluation complète, cycle complet d'un coaching (planifier → CR → clôture → visible par le commercial), demande de coaching, action en retard, « voir en tant que » en lecture seule. Tester aussi en viewport mobile (iPhone 13).
- **CI GitHub Actions** : lint, typecheck, tests unitaires, tests RLS sur une base Supabase locale (`supabase start`), build.
- Avant de déclarer une étape terminée : lancer tout ce qui précède, ouvrir l'application en local, parcourir les écrans de l'étape sur ordinateur et mobile, et noter le résultat dans `PROGRESS.md`.

---

## 14. RGPD et conformité

Première Ligne héberge des données personnelles de salariés de ses clients : elle agit comme **sous-traitant** (le client est responsable de traitement).

À prévoir dans l'application :
- Hébergement des données et des sauvegardes **dans l'Union européenne** (Supabase région UE, Vercel région Paris pour les fonctions, Resend région UE si disponible).
- Pages `/mentions-legales`, `/confidentialite`, `/cgu` (contenu à fournir par le fondateur ; prévoir des gabarits avec des zones à compléter clairement marquées `[À COMPLÉTER]`).
- Acceptation des CGU et de la politique de confidentialité à la première connexion (horodatée).
- **Export** des données d'un utilisateur (JSON/CSV) et **anonymisation** d'un utilisateur désactivé (remplacer nom/prénom/email par « Utilisateur anonymisé », conserver les données agrégées), par org_admin ou super admin.
- **Suppression d'une entreprise** (fin de contrat) : export complet puis suppression définitive en deux temps (archivage 30 jours, puis purge), réservée au super admin, journalisée.
- Durée de conservation paramétrable (défaut : données d'un utilisateur désactivé anonymisées après 24 mois).
- Pas de traceurs publicitaires. Seuls les cookies nécessaires (session, préférences).
- Journal d'accès (§4.12).

Documents hors code (à faire par le fondateur, non par Claude Code) : contrat de sous-traitance (DPA) type, registre des traitements, mentions légales de la société.

---

## 15. Mise en place (ce que l'humain doit faire)

Claude Code doit guider le fondateur pas à pas pour ces étapes, en lui disant exactement où cliquer et quoi copier, et attendre qu'il confirme :

1. Créer un compte **GitHub** et un dépôt privé `premiere-ligne`.
2. Créer un compte **Supabase**, un projet en **région Europe**, et récupérer l'URL, la clé `anon` et la clé `service_role`.
3. Installer en local : Node.js LTS, pnpm, Docker (pour Supabase local), Supabase CLI.
4. Créer un compte **Resend**, vérifier le domaine d'envoi (enregistrements DNS chez le registrar).
5. Acheter un nom de domaine (ex. `premiere-ligne.fr` si disponible) ; prévoir `app.` pour la plateforme.
6. Créer un compte **Vercel**, importer le dépôt GitHub, configurer les variables d'environnement, rattacher le domaine.
7. Créer le premier compte **super admin** (script `pnpm create-super-admin email` fourni par Claude Code).

Aucune de ces étapes ne doit être contournée par Claude Code (pas de création de compte à la place du fondateur, pas de saisie de mot de passe).

---

## 16. Plan de réalisation par étapes

Chaque étape se termine par : tests verts, vérification manuelle, mise à jour de `PROGRESS.md`, commit. Ne pas commencer l'étape suivante si l'étape en cours n'est pas terminée.

**Étape 0 — Socle**
- Initialiser Next.js + TypeScript + Tailwind + shadcn/ui + ESLint/Prettier + Vitest + Playwright.
- Thème Première Ligne (tokens, polices, logo SVG, composants de base), page d'accueil publique, pages légales gabarits.
- Supabase local, clients Supabase, CI GitHub Actions.
- `docs/DECISIONS.md`, `docs/PROGRESS.md`, `.env.example`, `README.md` (comment lancer le projet).

**Étape 1 — Comptes, entreprises, rôles**
- Migrations : `profiles`, `organizations`, `memberships`, `teams`, `team_managers`, `invitations`, `audit_log`, `email_log` + fonctions d'aide + RLS + tests RLS.
- Connexion, mot de passe oublié, invitation (envoi + acceptation), profil.
- Espace super admin : entreprises (créer, lister, fiche), inviter des org_admin / managers.
- Espace entreprise : layout, navigation par rôle, utilisateurs et équipes (org_admin), invitation de commerciaux (manager), import CSV.
- Script `create-super-admin`.

**Étape 2 — Référentiels**
- Modèles globaux (super admin) avec éditeur complet.
- Copie d'un modèle à la création d'une entreprise et à la demande.
- Référentiels de l'entreprise : blocs, compétences, descripteurs de niveaux, ordre, désactivation, suppression contrôlée, masquage des désactivés.
- Rattachement des commerciaux aux référentiels.

**Étape 3 — Évaluations et fiche commercial**
- Évaluation manager (brouillon auto, validation), auto-évaluation.
- Fiche commercial : radar, matrice, historique, notes privées.
- Calculs §6.1 à §6.4 + tests.

**Étape 4 — Coachings**
- Planification, liste, calendrier, statuts calculés, CR avec brouillon auto, clôture, réouverture, emails, .ics.
- Demandes de coaching.
- Tâche planifiée de rappel des CR.

**Étape 5 — Plan de progrès et vue commercial**
- Actions (CRUD, statuts, retard), création depuis le CR.
- Vue commercial complète (§4.9).

**Étape 6 — Tableaux de bord, « voir en tant que », journal**
- Tableaux de bord manager, org_admin, super admin, exports CSV.
- « Voir en tant que » en lecture seule.
- Journal d'activité.

**Étape 7 — RGPD et mise en production**
- Acceptation CGU, export, anonymisation, archivage/purge d'entreprise.
- En-têtes de sécurité, limitation de débit, revue de toutes les politiques RLS.
- Déploiement Vercel + Supabase production, domaine, emails réels, sauvegardes.
- Recette complète sur mobile et ordinateur avec les données de démonstration.

**Étapes V2** : dans l'ordre du §5, chacune spécifiée plus en détail avant de commencer (proposer une mini-spec au fondateur et attendre sa validation).

---

## 17. Données de démonstration (`supabase/seed.sql`)

Données **fictives uniquement**. Mot de passe commun en local : défini dans `.env` (`SEED_PASSWORD`), jamais en production.

- Super admin : `admin@demo.local`.
- Entreprise **« Démo Distribution »** (`demo-distribution`) :
  - 1 org_admin : Claire Martin.
  - 2 équipes : « Équipe Nord » (manager : Julien Petit), « Équipe Sud » (manager : Sarah Leroy).
  - 8 commerciaux (4 par équipe) avec des prénoms variés.
  - Référentiel copié du modèle ci-dessous, évaluations sur 3 mois avec une progression visible, coachings dans tous les statuts, quelques demandes, actions dont certaines en retard.
- Entreprise **« Démo Services B2B »** avec 1 manager et 3 commerciaux (pour tester l'isolation).

**Modèle de référentiel fourni : « Vente en face à face »** (contenu générique de Première Ligne, modifiable)

1. *Préparer et s'organiser* — Préparer ses rendez-vous · Organiser sa journée et ses priorités · Suivre son portefeuille et ses relances
2. *Accueillir et découvrir* — Créer un climat de confiance dès le premier contact · Questionner pour comprendre le besoin réel · Reformuler et valider le besoin
3. *Proposer et argumenter* — Présenter une offre adaptée au besoin exprimé · Argumenter par les bénéfices client · Utiliser des preuves (chiffres, témoignages, démonstration)
4. *Traiter les objections* — Accueillir l'objection sans se justifier · Identifier la vraie objection · Répondre et vérifier l'adhésion
5. *Conclure et fidéliser* — Repérer les signaux d'achat · Proposer la conclusion · Sécuriser l'après-vente et demander une recommandation
6. *Posture et relation* — Écoute active · Adapter sa communication à son interlocuteur · Gérer la pression et rebondir après un échec

Rédiger pour chaque compétence 5 descripteurs de niveau courts et concrets (0 à 4).

Un second modèle **« Manager-coach »** (pour la V2) : Observer sans intervenir · Donner un feedback factuel · Faire trouver plutôt que donner la réponse · Fixer un objectif de progrès mesurable · Suivre les engagements · Animer un brief d'équipe.

---

## 18. Méthode de travail de Claude Code

1. **Lire ce document en entier** au début de chaque session (ou le résumé dans `CLAUDE.md`, voir plus bas).
2. Travailler **étape par étape** (§16). Au début de chaque étape, présenter un plan court (fichiers, migrations, écrans, tests) en mode plan, puis coder sans attendre de validation **sauf** pour l'étape 0 et pour toute étape V2.
3. **Ne jamais** : exposer la clé `service_role` au navigateur, désactiver la RLS, modifier une migration déjà appliquée, envoyer des emails réels en développement, commiter un secret, supprimer des données sans contrôle d'usage.
4. Toujours écrire les tests en même temps que le code. Une étape n'est terminée que si `pnpm lint`, `pnpm typecheck`, `pnpm test`, les tests RLS et `pnpm build` passent.
5. Tenir à jour :
   - `docs/PROGRESS.md` : ce qui est fait, ce qui reste, comment tester chaque étape à la main (liste de vérifications cliquables pour le fondateur) ;
   - `docs/DECISIONS.md` : chaque choix fait en l'absence d'info dans ce document, daté, avec la raison.
6. Commits petits et fréquents ; une branche par étape (`etape-1-comptes`), fusion dans `main` quand l'étape est terminée.
7. Expliquer au fondateur, en français simple, ce qu'il doit faire lui-même (création de comptes, clés, DNS, tests manuels), avec des instructions pas à pas. Il n'est pas développeur.
8. À la fin de chaque étape, donner : ce qui a été fait, comment le tester en 5 minutes, ce qui vient ensuite.
9. Créer un fichier **`CLAUDE.md`** à la racine qui résume en une page : le produit, la pile, les règles absolues (§8.1, point 3 ci-dessus), les commandes utiles, et renvoie vers `docs/SPEC.md` pour le détail.

---

*Fin du cahier des charges — version 1.0.*
