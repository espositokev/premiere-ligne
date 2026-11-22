# Décisions

Choix faits en l'absence d'information dans `docs/SPEC.md`, ou validés avec le fondateur quand ils s'en écartent. Le plus récent en haut.

## 22/11/2026 — Étape 4 (coachings, demandes, séances de Dojo)

- **Compte rendu séparé du coaching** : `coaching_reports` et `coaching_observations` sont des tables à part, lisibles par le commercial seulement une fois le coaching clôturé (au lieu d'une vue `v_my_coachings`). Les compétences ciblées (`coaching_skills`) restent visibles dès la planification.
- **Plan d'action** préparé dans le CR (JSON validé par Zod), transformé en lignes de `actions` (origine `coaching`) à la clôture ; une réouverture suivie d'une nouvelle clôture ne les recrée pas. La table `actions` est créée maintenant ; son écran complet arrive à l'étape 5.
- **Demandes** : compétences dans une table de liaison (`coaching_request_skills`) plutôt qu'un tableau, pour garder les clés étrangères et le contrôle « compétence utilisée ». Accepter = planifier depuis la demande (formulaire prérempli) ; refuser = message obligatoire. Le commercial peut retirer une demande en attente.
- **Clôture** possible dès que le coaching a commencé (pas seulement après la fin). Un coaching annulé disparaît pour le commercial ; il n'est prévenu que si le coaching était encore à venir.
- **Heure** : saisie et affichage à l'heure de Paris, stockage en UTC.
- **Rappel des CR** : Vercel Cron chaque jour à 7 h (Paris), route `/api/cron/rappels-cr` protégée par `CRON_SECRET`, un email par coach, au plus une fois par semaine par coaching.
- **Invitation agenda** : fichier `.ics` joint aux emails de planification, de modification et d'annulation.
- **Séances de Dojo** : notées depuis un Dojo, avec un ou plusieurs participants (séances de groupe), scénario joué, ce qui a marché, axe prioritaire, engagement. Visibles sur la fiche des participants et dans « Mes coachings ». Un Dojo joué ne se supprime plus (on l'archive).
- **Navigation** : « Coachings » ajouté pour tous ; sur téléphone, la barre garde 4 onglets et les suivants (Profil, Paramètres) passent dans le menu du compte.
- Paramètres entreprise (N jours sans coaching, autoriser les demandes) : reportés à l'étape des paramètres, valeurs par défaut en attendant.

## 22/11/2026 — Étape 3 (évaluations et fiche commercial)

- **Radar : un axe par compétence** (moyenne de ses sous-compétences), pas par bloc : la matrice n'a que 2 blocs, un radar à 2 axes ne dirait rien. Superposition : dernière évaluation (plein), précédente (clair), auto-évaluation (pointillés).
- **Adresses** : la fiche commercial est sous `/e/[slug]/equipe/[memberId]` (au lieu de `/commerciaux/[id]`) pour que l'onglet « Mon équipe / Commerciaux » reste allumé. Saisie : `/equipe/[memberId]/evaluations/[id]` ; côté commercial : `/moi/evaluations/[id]`.
- **Un seul brouillon** par commercial et par type (manager / auto) : « Nouvelle évaluation » reprend le brouillon en cours.
- **Lecture** : le commercial ne voit une évaluation manager qu'une fois validée ; le manager ne voit une auto-évaluation qu'une fois validée.
- **Correction** d'une évaluation validée : réservée au responsable (et au super admin), sur demande explicite (« Corriger »), chaque enregistrement est inscrit au journal (`evaluation.corrected`).
- **Note effacée** = sous-compétence « non évaluée » (la ligne est retirée, donc la sous-compétence peut encore être supprimée si elle n'a jamais été notée ailleurs).
- **Paramètre « auto-évaluation activée »** (§6.8) : reporté à l'étape des paramètres d'entreprise ; l'auto-évaluation est toujours possible en attendant.
- **Navigation** : « Dojos » ajouté au menu des trois rôles ; « Matrice » est accessible depuis Paramètres.

## 22/11/2026 — Étape 2 (matrices et Dojos)

- **Matrice à 3 niveaux**, celle de la méthode Première Ligne : Bloc (« Tunnel de vente », « Compétences transversales ») → Compétence (ex. « Accueil ») → Sous-compétence notée de 0 à 4. Dans le code, la sous-compétence notée garde le nom `skills` de la spec ; le niveau intermédiaire s'appelle `competencies`.
- **Échelle 0 à 4** (validé par le fondateur) : les 4 niveaux de sa matrice plus « 4 — Expert, capable de transmettre ».
- **Deux modèles fournis** (validé) : « Vente automobile » (la matrice du kit, mot pour mot, typo « sourIs » corrigée) et « Vente — socle général » (version tous secteurs rédigée à partir de la première, à relire par le fondateur). Les descriptifs de niveau par sous-compétence sont facultatifs et laissés vides pour l'instant : les libellés généraux des niveaux s'affichent à la place.
- **Un seul référentiel actif par entreprise** en V1, appliqué à tous ses commerciaux (pas de table de rattachement commercial ↔ référentiel pour l'instant).
- **Copie, pas lien** : à la création d'un client, le modèle choisi est copié. Modifier la matrice d'un client ne touche ni le modèle ni les autres clients, et inversement.
- **Suppression** : seulement si l'élément n'a jamais servi (fonction `is_skill_used`, complétée à chaque étape qui ajoute une référence, et déclencheur qui revérifie toute suppression). Pour l'instant, rien ne « sert » encore : tout est supprimable.
- **Dojos (nouvelle fonctionnalité, absente de la spec)** : exercice en 3 phases, toujours rattaché à une sous-compétence. Contenu structuré en JSON suivant le standard « Créer un Dojo » du kit (objectif, standard, critères d'excellence, erreurs, notice manager, 3 scénarios, fiche d'écoute, grille, débriefing, à retenir).
- **Bibliothèque** : les 42 Dojos PowerPoint du kit ont été transcrits automatiquement dans ce format et rattachés aux sous-compétences du modèle automobile (21 d'entre eux aussi au socle général). Les mises en page hors standard (Connaissance produit, Posture, Introduction aux objections) sont conservées en sections libres. 7 Dojos sont des modèles avec des zones à compléter (ex. `[MODÈLE_1]`), signalés dans l'interface. Les fichiers PowerPoint seront déposés dans le stockage Supabase à la mise en ligne.
- **Droits sur les Dojos** : le responsable modifie tout ; un manager crée des Dojos et ne modifie que les siens (il copie un Dojo de la bibliothèque pour l'adapter) ; un commercial ne voit que les Dojos validés. Cycle : brouillon → à tester → validé → archivé.
- **Génération de Dojos** par l'API Anthropic, avec la méthode du fondateur et un Dojo de référence dans la consigne. Désactivée tant que `ANTHROPIC_API_KEY` n'est pas renseignée (le bouton l'indique).
- **Suivi des séances de Dojo** (scénario joué, axe prioritaire, engagement) : reporté à l'étape 4 avec les coachings.
- **Navigation** : responsable = Accueil, Commerciaux, Dojos, Paramètres (Utilisateurs, Équipes, Matrice) ; manager = Accueil, Mon équipe, Dojos, Profil ; commercial = Ma progression, Dojos, Profil.

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
- **Supabase en ligne** : le compte gratuit a déjà 2 projets actifs (Caleido, à ne jamais mettre en pause, et « petit-coeur », actif jusqu'au 7/12/2026). Décision du fondateur : rester en gratuit ; le projet Première Ligne sera créé (région Paris) après la mise en pause de « petit-coeur », à partir du 8/12/2026. D'ici là, les étapes sont construites et testées en CI sur Supabase local.

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
