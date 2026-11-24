# Décisions

Choix faits en l'absence d'information dans `docs/SPEC.md`, ou validés avec le fondateur quand ils s'en écartent. Le plus récent en haut.

## 22/11/2026 — Les managers font évoluer la matrice

- Demande du fondateur : après l'audit, Première Ligne crée l'entreprise et sa matrice sur mesure ; ensuite le responsable **et les managers** peuvent la faire évoluer (ajouter, renommer, désactiver, réordonner). Appliqué par la base (`can_edit_framework`). Mettre en place une matrice (choisir le modèle) reste réservé au super admin. Les managers y accèdent par « Matrice » dans leur menu.

## 22/11/2026 — Étapes 6 et 7 (pilotage, RGPD, démonstration)

- **Tableaux de bord** sur la page d'accueil de l'espace : manager (son équipe) et responsable (toute l'entreprise, par équipe, coachings clôturés par mois et par manager, CR sous 48 h, couverture à 90 jours). Radar d'équipe par compétence (comme le radar individuel). Exports CSV au format Excel français (« ; », UTF-8), journalisés.
- **« Voir en tant que »** : cookie signé (PREVIEW_COOKIE_SECRET, 1 h) + jeton d'accès court au nom de la personne regardée, signé avec le secret JWT de Supabase (SUPABASE_JWT_SECRET) : la base applique exactement ses droits. Ce client refuse toute écriture (les formulaires affichent une erreur), les opérations RGPD sont refusées pendant un aperçu, et les droits du vrai connecté sont revérifiés à chaque requête. Désactivé si l'un des deux secrets manque. La déconnexion et la connexion utilisent toujours la vraie session.
- **Journal** : `/admin/journal` (tout) et Paramètres > Journal (son entreprise), filtrable par famille.
- **Paramètres d'entreprise** (Paramètres > Fonctionnement) : délai « sans coaching » (45 j par défaut), auto-évaluation et demandes de coaching activables ; les deux interrupteurs sont appliqués par la base (RLS).
- **RGPD** : export JSON d'une personne (fiche utilisateur) et de toute l'entreprise (super admin) ; anonymisation d'une personne désactivée partout (nom, email, notes privées ; compte de connexion neutralisé) ; archivage puis suppression définitive possible 30 jours après, en retapant l'adresse de l'entreprise. Durée de conservation automatique (24 mois) : reportée.
- **Limitation de débit** : 50 invitations par personne et par heure ; la connexion par code est limitée par Supabase.
- **Données de démonstration** : `scripts/seed-demo.mjs` (et non `seed.sql`, car il faut créer des comptes de connexion), sur la matrice automobile ; refuse de tourner sur une base Supabase distante sans ALLOW_DEMO_SEED=1.
- **Visite guidée** : le workflow « Visite guidée » lance l'application avec ces données et photographie chaque écran (téléphone + ordinateur) sur la branche `visite-guidee`.

## 22/11/2026 — Étape 5 (plan de progrès, espace commercial)

- **Adresses** : plan du commercial sous `/e/[slug]/moi/plan` (onglet « Mon plan » du menu commercial), actions de l'équipe sous `/e/[slug]/equipe/actions` (au lieu de `/e/[slug]/actions`), pour que l'onglet « Mon équipe » reste allumé ; plan d'un commercial = onglet « Plan de progrès » de sa fiche.
- **Statut en un tap** : « Je commence », « C'est fait », « Rouvrir » ; « Abandonner », « Modifier » et « Supprimer » sont rangés derrière « … ».
- **Suppression** : le manager supprime toute action de ses commerciaux ; le commercial seulement celles qu'il a ajoutées (une action décidée en coaching reste, il peut l'abandonner). Journalisé.
- **Origine « évaluation »** : prévue dans la base, pas encore proposée à l'écran (les actions s'ajoutent depuis le plan ou le CR).
- **« À faire pour toi »** en tête de « Ma progression » : CR récents non commentés, actions en retard (ou à faire dans la semaine), prochain coaching, auto-évaluation commencée.
- **Descripteurs de niveaux** : toucher une sous-compétence de la matrice déplie ses 5 niveaux, niveau actuel en avant et « prochaine marche » signalée (descriptif propre à la sous-compétence, sinon libellé général).

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

## Passe de finition « unslop » (22 novembre 2026)

Le skill unslop (Damir Sokolovsky, CC BY 4.0) est installé dans `.claude/skills/unslop` comme skill du projet. Audit : écran déjà conçu, quelques signes seulement, donc mode « polish » qui garde la charte (forêt, fluo, os, Sora et Inter) :

- graisses limitées à 600 (plus de 700 à 900), sauf le logo ;
- étiquettes en capitales espacées remises en casse normale (en-têtes de tableaux, résumés, Dojos) ;
- plus de titres « Bonjour Kevin » ni « Salut Léo ! » : le titre nomme la page (« Ma progression », « Tableau de bord », nom de l'entreprise) ;
- plus de points d'exclamation dans l'interface et les emails (« Bonjour Léo, ») ;
- plus d'italique d'emphase ;
- le fluo est réservé à l'action principale, à la sélection et aux graphiques : les moyennes de compétence et les icônes de la page d'accueil passent en neutre.

## Page d'accueil refaite avec unslop (22 novembre 2026)

Direction validée par Kevin : direct, terrain, exigeant ; univers de la fiche de coaching et de la grille 0 à 4 ; charte inchangée. Bouton principal « Nous contacter » (la page sert à convaincre des prospects), « Se connecter » devient un lien discret. L'aperçu est une fiche vendeur dont la maîtrise monte en marches, comme le logo. Les trois cartes deviennent « Une méthode en trois temps ». Le fluo ne marque que l'action principale, le dernier mois et le surlignage de « là où ça se joue ».

## Options IA payantes (décidé le 24 novembre 2026, à développer)

La plateforme reste offerte. Deux options payantes, par entreprise :

- **Dojos à la demande** seuls : 19 € HT par mois.
- **Pack IA** : 45 € HT par mois. Il comprend l'analyse d'appels et les Dojos à la demande. Il inclut 20 analyses d'appels par mois (décidé le 24 novembre 2026), puis environ 1,50 € HT par analyse supplémentaire.

Coût estimé : moins d'1 € par appel analysé (transcription de 30 minutes, bilan et 3 Dojos), environ 0,05 € par Dojo.

**Parcours de l'analyse d'appel** : le manager envoie l'audio, l'IA le transcrit et l'analyse selon la matrice de l'entreprise, puis produit un bilan avec 3 points forts et 3 axes de travail. Chaque axe propose de générer un Dojo personnalisé.

**Règles (IA Act et RGPD, à faire valider par un juriste avant la mise en vente)** :

1. Avant l'envoi d'un audio, une case obligatoire : « Le client a été informé de l'enregistrement ».
2. L'IA ne fait que proposer. Le bilan et les notes suggérées sont marqués « Proposition IA » et n'entrent jamais seuls dans la matrice.
3. Le manager valide ou corrige chaque note avant qu'elle compte.
4. Le vendeur peut contester, compétence par compétence : il propose sa note avec une explication, le manager est prévenu et tranche. L'échange reste dans l'historique.
5. L'analyse porte uniquement sur les compétences de la matrice. Pas d'émotion, d'humeur ni de ton déduits de la voix (reconnaissance des émotions interdite au travail par l'IA Act).
