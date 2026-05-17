-- ═══════════════════════════════════════════════════════════
-- PREMIÈRE LIGNE — Schéma complet de base de données
-- À coller dans : Supabase > SQL Editor > New query > Run
-- ═══════════════════════════════════════════════════════════

-- ─── EXTENSIONS ───────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── 1. STRUCTURES (concessions / garages) ───────────────
create table if not exists public.structures (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  logo_url    text,
  ville       text,
  created_at  timestamptz default now()
);

-- ─── 2. PROFILES (utilisateurs) ──────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  structure_id  uuid references public.structures on delete set null,
  full_name     text not null,
  role          text not null check (role in ('manager', 'vendeur')),
  poste         text,
  avatar_color  text default '#0B3D2E',
  streak        int default 0,
  xp_total      int default 0,
  created_at    timestamptz default now()
);

-- ─── 3. COMPÉTENCES (catégories de la matrice) ───────────
create table if not exists public.competences (
  id            uuid primary key default uuid_generate_v4(),
  structure_id  uuid references public.structures on delete cascade,
  numero        int not null,
  title         text not null,
  order_index   int default 0,
  created_at    timestamptz default now()
);

-- ─── 4. SOUS-COMPÉTENCES ─────────────────────────────────
create table if not exists public.sous_competences (
  id             uuid primary key default uuid_generate_v4(),
  competence_id  uuid references public.competences on delete cascade,
  title          text not null,
  order_index    int default 0,
  created_at     timestamptz default now()
);

-- ─── 5. ÉVALUATIONS (notes étoiles) ──────────────────────
create table if not exists public.evaluations (
  id                  uuid primary key default uuid_generate_v4(),
  vendeur_id          uuid references public.profiles on delete cascade,
  sous_competence_id  uuid references public.sous_competences on delete cascade,
  score               int not null check (score between 0 and 5),
  evaluated_by        uuid references public.profiles,
  notes               text,
  evaluated_at        timestamptz default now(),
  unique (vendeur_id, sous_competence_id)
);

-- ─── 6. DOJOS (exercices de formation) ───────────────────
create table if not exists public.dojos (
  id              uuid primary key default uuid_generate_v4(),
  structure_id    uuid references public.structures on delete cascade,
  title           text not null,
  description     text,
  competence_id   uuid references public.competences on delete set null,
  duree_min       int,
  created_by      uuid references public.profiles,
  created_at      timestamptz default now()
);

-- ─── 7. VENDEUR_DOJOS (affectations de dojos) ────────────
create table if not exists public.vendeur_dojos (
  id           uuid primary key default uuid_generate_v4(),
  vendeur_id   uuid references public.profiles on delete cascade,
  dojo_id      uuid references public.dojos on delete cascade,
  status       text not null default 'assigned' check (status in ('assigned', 'in_progress', 'validated')),
  assigned_by  uuid references public.profiles,
  assigned_at  timestamptz default now(),
  validated_at timestamptz,
  unique (vendeur_id, dojo_id)
);

-- ─── 8. PLANS (plans de montée en compétence) ────────────
create table if not exists public.plans (
  id          uuid primary key default uuid_generate_v4(),
  vendeur_id  uuid references public.profiles on delete cascade,
  manager_id  uuid references public.profiles,
  title       text not null,
  objectif    text,
  status      text not null default 'active' check (status in ('active', 'completed', 'paused')),
  created_at  timestamptz default now()
);

-- ─── 9. PLAN_DOJOS (dojos dans un plan) ──────────────────
create table if not exists public.plan_dojos (
  id           uuid primary key default uuid_generate_v4(),
  plan_id      uuid references public.plans on delete cascade,
  dojo_id      uuid references public.dojos on delete cascade,
  order_index  int default 0,
  target_date  date,
  status       text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  created_at   timestamptz default now()
);

-- ─── 10. DÉFIS (challenges équipe) ───────────────────────
create table if not exists public.defis (
  id            uuid primary key default uuid_generate_v4(),
  structure_id  uuid references public.structures on delete cascade,
  title         text not null,
  description   text,
  xp_reward     int default 100,
  start_date    date,
  end_date      date,
  created_by    uuid references public.profiles,
  created_at    timestamptz default now()
);

-- ─── 11. DEFI_PARTICIPATIONS ─────────────────────────────
create table if not exists public.defi_participations (
  id           uuid primary key default uuid_generate_v4(),
  defi_id      uuid references public.defis on delete cascade,
  vendeur_id   uuid references public.profiles on delete cascade,
  progress     int default 0 check (progress between 0 and 100),
  completed    boolean default false,
  completed_at timestamptz,
  unique (defi_id, vendeur_id)
);

-- ─── 12. BADGES ───────────────────────────────────────────
create table if not exists public.badges (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  description      text,
  icon             text,
  condition_type   text not null,
  condition_value  int default 1,
  created_at       timestamptz default now()
);

-- ─── 13. VENDEUR_BADGES (badges gagnés) ──────────────────
create table if not exists public.vendeur_badges (
  id         uuid primary key default uuid_generate_v4(),
  vendeur_id uuid references public.profiles on delete cascade,
  badge_id   uuid references public.badges on delete cascade,
  earned_at  timestamptz default now(),
  unique (vendeur_id, badge_id)
);

-- ─── 14. XP_TRANSACTIONS (historique XP) ─────────────────
create table if not exists public.xp_transactions (
  id          uuid primary key default uuid_generate_v4(),
  vendeur_id  uuid references public.profiles on delete cascade,
  amount      int not null,
  reason      text,
  source_type text,
  source_id   uuid,
  created_at  timestamptz default now()
);


-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════

alter table public.structures         enable row level security;
alter table public.profiles           enable row level security;
alter table public.competences        enable row level security;
alter table public.sous_competences   enable row level security;
alter table public.evaluations        enable row level security;
alter table public.dojos              enable row level security;
alter table public.vendeur_dojos      enable row level security;
alter table public.plans              enable row level security;
alter table public.plan_dojos         enable row level security;
alter table public.defis              enable row level security;
alter table public.defi_participations enable row level security;
alter table public.badges             enable row level security;
alter table public.vendeur_badges     enable row level security;
alter table public.xp_transactions    enable row level security;


-- ─── Fonction utilitaire : rôle et structure de l'user ────
create or replace function public.get_my_structure_id()
returns uuid language sql stable as $$
  select structure_id from public.profiles where id = auth.uid();
$$;

create or replace function public.get_my_role()
returns text language sql stable as $$
  select role from public.profiles where id = auth.uid();
$$;


-- ─── POLICIES : structures ────────────────────────────────
create policy "Voir sa structure" on public.structures
  for select using (id = get_my_structure_id());

create policy "Manager peut modifier structure" on public.structures
  for update using (id = get_my_structure_id() and get_my_role() = 'manager');


-- ─── POLICIES : profiles ──────────────────────────────────
create policy "Voir les profils de sa structure" on public.profiles
  for select using (structure_id = get_my_structure_id());

create policy "Modifier son propre profil" on public.profiles
  for update using (id = auth.uid());

create policy "Insérer son propre profil" on public.profiles
  for insert with check (id = auth.uid());


-- ─── POLICIES : compétences ───────────────────────────────
create policy "Voir compétences de sa structure" on public.competences
  for select using (structure_id = get_my_structure_id());

create policy "Manager gère les compétences" on public.competences
  for all using (structure_id = get_my_structure_id() and get_my_role() = 'manager');


-- ─── POLICIES : sous-compétences ──────────────────────────
create policy "Voir sous-compétences" on public.sous_competences
  for select using (
    competence_id in (
      select id from public.competences where structure_id = get_my_structure_id()
    )
  );

create policy "Manager gère sous-compétences" on public.sous_competences
  for all using (
    competence_id in (
      select id from public.competences where structure_id = get_my_structure_id()
    ) and get_my_role() = 'manager'
  );


-- ─── POLICIES : évaluations ───────────────────────────────
create policy "Voir évaluations de sa structure" on public.evaluations
  for select using (
    vendeur_id in (select id from public.profiles where structure_id = get_my_structure_id())
  );

create policy "Manager crée/modifie évaluations" on public.evaluations
  for all using (get_my_role() = 'manager' and
    vendeur_id in (select id from public.profiles where structure_id = get_my_structure_id())
  );


-- ─── POLICIES : dojos ─────────────────────────────────────
create policy "Voir dojos de sa structure" on public.dojos
  for select using (structure_id = get_my_structure_id());

create policy "Manager gère les dojos" on public.dojos
  for all using (structure_id = get_my_structure_id() and get_my_role() = 'manager');


-- ─── POLICIES : vendeur_dojos ─────────────────────────────
create policy "Voir ses dojos assignés" on public.vendeur_dojos
  for select using (
    vendeur_id = auth.uid() or get_my_role() = 'manager'
  );

create policy "Manager assigne des dojos" on public.vendeur_dojos
  for all using (get_my_role() = 'manager');


-- ─── POLICIES : plans ─────────────────────────────────────
create policy "Voir ses plans" on public.plans
  for select using (
    vendeur_id = auth.uid() or manager_id = auth.uid() or get_my_role() = 'manager'
  );

create policy "Manager crée les plans" on public.plans
  for insert with check (get_my_role() = 'manager');

create policy "Manager modifie les plans" on public.plans
  for update using (manager_id = auth.uid());


-- ─── POLICIES : plan_dojos ────────────────────────────────
create policy "Voir plan_dojos" on public.plan_dojos
  for select using (
    plan_id in (
      select id from public.plans
      where vendeur_id = auth.uid() or manager_id = auth.uid()
    )
  );

create policy "Manager gère plan_dojos" on public.plan_dojos
  for all using (get_my_role() = 'manager');


-- ─── POLICIES : défis ─────────────────────────────────────
create policy "Voir défis de sa structure" on public.defis
  for select using (structure_id = get_my_structure_id());

create policy "Manager gère les défis" on public.defis
  for all using (structure_id = get_my_structure_id() and get_my_role() = 'manager');


-- ─── POLICIES : defi_participations ──────────────────────
create policy "Voir participations" on public.defi_participations
  for select using (
    vendeur_id = auth.uid() or get_my_role() = 'manager'
  );

create policy "Vendeur met à jour sa participation" on public.defi_participations
  for update using (vendeur_id = auth.uid());


-- ─── POLICIES : badges ────────────────────────────────────
create policy "Badges visibles par tous" on public.badges
  for select using (true);


-- ─── POLICIES : vendeur_badges ────────────────────────────
create policy "Voir badges gagnés" on public.vendeur_badges
  for select using (
    vendeur_id = auth.uid() or get_my_role() = 'manager'
  );


-- ─── POLICIES : xp_transactions ──────────────────────────
create policy "Voir ses XP" on public.xp_transactions
  for select using (
    vendeur_id = auth.uid() or get_my_role() = 'manager'
  );


-- ═══════════════════════════════════════════════════════════
-- TRIGGER : créer le profil automatiquement à l'inscription
-- ═══════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Nouvel utilisateur'),
    coalesce(new.raw_user_meta_data->>'role', 'vendeur')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ═══════════════════════════════════════════════════════════
-- DONNÉES DE BASE : badges par défaut
-- ═══════════════════════════════════════════════════════════
insert into public.badges (name, description, icon, condition_type, condition_value) values
  ('Premier Dojo',    'Valider son 1er dojo',           '🎯', 'dojos_validated', 1),
  ('Sur la lancée',   '7 jours de streak consécutifs',  '🔥', 'streak_days',     7),
  ('Expert Accueil',  'Score 5/5 en Accueil',           '⭐', 'score_5_comp',    1),
  ('Top 3',           'Atteindre le top 3 classement',  '🏆', 'leaderboard_top', 3),
  ('Formateur',       'Valider 10 dojos',               '📚', 'dojos_validated', 10),
  ('Inarrêtable',     '30 jours de streak',             '⚡', 'streak_days',     30),
  ('Financement Pro', 'Maîtriser toutes les compétences financement', '💰', 'comp_mastered', 5),
  ('Perfectionniste', 'Score moyen équipe > 4/5',       '🌟', 'team_avg_score',  4)
on conflict do nothing;


-- ═══════════════════════════════════════════════════════════
-- DONNÉES DE DÉMO : structure + compétences de base
-- ═══════════════════════════════════════════════════════════
-- (optionnel — à décommenter si tu veux des données test)

-- insert into public.structures (name, ville) values ('Aramisauto Lyon', 'Lyon');
