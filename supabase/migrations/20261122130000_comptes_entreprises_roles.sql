-- Étape 1 — Comptes, entreprises, rôles (SPEC §2, §7.1, §7.2, §7.6, §8)
--
-- Principes :
-- * RLS activée sur toutes les tables, aucune table lisible par « anon ».
-- * Les fonctions d'aide sont SECURITY DEFINER avec un search_path vide : elles lisent les
--   appartenances sans déclencher la RLS (pas de récursion) et ne peuvent pas être détournées.
-- * Clés étrangères composites (id, organization_id) : une ligne ne peut pas pointer vers
--   une équipe ou une appartenance d'une autre entreprise.
-- * audit_log et email_log ne sont écrits que par le serveur (clé service_role).

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables globales
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null check (length(trim(first_name)) between 1 and 80),
  last_name text not null check (length(trim(last_name)) between 1 and 80),
  phone text check (phone is null or length(phone) <= 30),
  avatar_url text,
  is_super_admin boolean not null default false,
  last_seen_at timestamptz,
  -- §14 : acceptation horodatée des CGU et de la politique de confidentialité
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 60),
  logo_url text,
  status text not null default 'actif' check (status in ('actif', 'suspendu', 'archive')),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Équipes, appartenances, invitations
-- ---------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null check (length(trim(name)) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, organization_id)
);
create unique index teams_org_name_key on public.teams (organization_id, lower(name));

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  user_id uuid not null references public.profiles (id),
  role text not null check (role in ('org_admin', 'manager', 'sales_rep')),
  job_title text check (job_title is null or length(job_title) <= 80),
  team_id uuid,
  active boolean not null default true,
  hired_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (organization_id, user_id),
  unique (id, organization_id),
  foreign key (team_id, organization_id) references public.teams (id, organization_id),
  -- Seul un commercial est rattaché à une équipe en tant que membre (§4.3).
  constraint memberships_team_only_for_reps check (team_id is null or role = 'sales_rep')
);
create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_team_id_idx on public.memberships (team_id);

create table public.team_managers (
  team_id uuid not null,
  membership_id uuid not null,
  organization_id uuid not null references public.organizations (id),
  created_at timestamptz not null default now(),
  primary key (team_id, membership_id),
  foreign key (team_id, organization_id) references public.teams (id, organization_id),
  foreign key (membership_id, organization_id) references public.memberships (id, organization_id)
);
create index team_managers_membership_id_idx on public.team_managers (membership_id);
create index team_managers_organization_id_idx on public.team_managers (organization_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  email text not null check (email = lower(email) and position('@' in email) > 1),
  first_name text not null check (length(trim(first_name)) between 1 and 80),
  last_name text not null check (length(trim(last_name)) between 1 and 80),
  role text not null check (role in ('org_admin', 'manager', 'sales_rep')),
  team_id uuid,
  job_title text check (job_title is null or length(job_title) <= 80),
  -- On ne stocke jamais le jeton en clair, seulement son empreinte SHA-256 (§8.5).
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid references public.profiles (id),
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  foreign key (team_id, organization_id) references public.teams (id, organization_id),
  constraint invitations_team_only_for_reps check (team_id is null or role = 'sales_rep')
);
create index invitations_organization_id_idx on public.invitations (organization_id);
create index invitations_team_id_idx on public.invitations (team_id);
-- Une seule invitation en attente par personne et par entreprise.
create unique index invitations_one_pending_per_email
  on public.invitations (organization_id, email)
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Journaux
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id),
  actor_user_id uuid references public.profiles (id),
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_organization_id_idx on public.audit_log (organization_id, created_at desc);
create index audit_log_actor_user_id_idx on public.audit_log (actor_user_id);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id),
  to_email text not null,
  template text not null,
  status text not null check (status in ('envoye', 'redirige', 'simule', 'echec')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
create index email_log_organization_id_idx on public.email_log (organization_id);

-- ---------------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------------

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.invitations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Fonctions d'aide (§8.2)
-- ---------------------------------------------------------------------------

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_super_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- Appartenance active de l'utilisateur connecté dans une entreprise active.
create or replace function public.my_membership(org uuid)
returns public.memberships
language sql
stable
security definer
set search_path = ''
as $$
  select m.*
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.organization_id = org
    and m.user_id = (select auth.uid())
    and m.active
    and o.status = 'actif';
$$;

create or replace function public.my_role(org uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select (public.my_membership(org)).role;
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.my_role(org) is not null;
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_super_admin() or coalesce(public.my_role(org) = 'org_admin', false);
$$;

-- Équipes que l'utilisateur connecté manage dans une entreprise.
create or replace function public.managed_team_ids(org uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tm.team_id
  from public.team_managers tm
  where tm.organization_id = org
    and tm.membership_id = (public.my_membership(org)).id;
$$;

-- Appartenances des commerciaux des équipes que l'utilisateur connecté manage.
create or replace function public.managed_member_ids(org uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.memberships m
  where m.organization_id = org
    and m.team_id in (select public.managed_team_ids(org));
$$;

create or replace function public.can_manage_member(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.id = member
      and (
        public.is_org_admin(m.organization_id)
        or (
          public.my_role(m.organization_id) = 'manager'
          and m.id in (select public.managed_member_ids(m.organization_id))
        )
      )
  );
$$;

create or replace function public.can_view_member(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_member(member)
    or exists (
      select 1
      from public.memberships m
      join public.organizations o on o.id = m.organization_id
      where m.id = member
        and m.user_id = (select auth.uid())
        and m.active
        and o.status = 'actif'
    );
$$;

-- Un profil est visible par son propriétaire, par le super admin, par ceux qui peuvent voir
-- une de ses appartenances, et par les commerciaux de ses équipes (pour afficher leur manager).
create or replace function public.can_view_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target = (select auth.uid())
    or public.is_super_admin()
    or exists (
      select 1 from public.memberships m
      where m.user_id = target and public.can_view_member(m.id)
    )
    or exists (
      select 1
      from public.memberships mine
      join public.team_managers tm on tm.team_id = mine.team_id
      join public.memberships mgr on mgr.id = tm.membership_id
      where mine.user_id = (select auth.uid())
        and mine.active
        and mgr.user_id = target
        and public.is_org_member(mine.organization_id)
    );
$$;

-- ---------------------------------------------------------------------------
-- Gardes-fous (déclencheurs)
-- ---------------------------------------------------------------------------

-- Seul le super admin change le nom, le slug ou le statut d'une entreprise ;
-- l'org_admin peut modifier les paramètres et le logo (§8.3).
create or replace function public.guard_organization_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.is_super_admin() then
    if new.name is distinct from old.name
      or new.slug is distinct from old.slug
      or new.status is distinct from old.status
      or new.created_by is distinct from old.created_by then
      raise exception 'Seul le super admin peut modifier le nom, l''adresse ou le statut d''une entreprise'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_organization_update before update on public.organizations
  for each row execute function public.guard_organization_update();

-- Le drapeau super admin ne se modifie jamais depuis l'application (seulement par le script serveur).
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if new.is_super_admin is distinct from old.is_super_admin
      or new.email is distinct from old.email
      or new.id is distinct from old.id then
      raise exception 'Modification non autorisée' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Un manager d'équipe doit avoir le rôle manager ou org_admin.
create or replace function public.check_team_manager_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.memberships m
    where m.id = new.membership_id and m.role in ('manager', 'org_admin')
  ) then
    raise exception 'Seul un manager ou un responsable peut manager une équipe' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger check_team_manager_role before insert or update on public.team_managers
  for each row execute function public.check_team_manager_role();

-- ---------------------------------------------------------------------------
-- Droits d'accès : rien pour anon, la RLS filtre pour authenticated
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.organizations, public.teams, public.memberships,
  public.team_managers, public.invitations, public.audit_log, public.email_log from anon;
revoke all on public.profiles, public.organizations, public.teams, public.memberships,
  public.team_managers, public.invitations, public.audit_log, public.email_log from authenticated;

grant select on public.profiles to authenticated;
grant update (first_name, last_name, phone, avatar_url, last_seen_at, terms_accepted_at)
  on public.profiles to authenticated;
grant select, insert on public.organizations to authenticated;
grant update (name, slug, logo_url, status, settings) on public.organizations to authenticated;
grant select, insert on public.teams to authenticated;
grant update (name, active) on public.teams to authenticated;
grant select on public.memberships to authenticated;
grant update (role, job_title, team_id, active, hired_at) on public.memberships to authenticated;
grant select, insert, delete on public.team_managers to authenticated;
grant select, insert on public.invitations to authenticated;
grant update (revoked_at, expires_at, token_hash, last_sent_at, first_name, last_name, job_title, team_id, role)
  on public.invitations to authenticated;
grant select on public.audit_log to authenticated;
grant select on public.email_log to authenticated;

grant all on public.profiles, public.organizations, public.teams, public.memberships,
  public.team_managers, public.invitations, public.audit_log, public.email_log to service_role;

revoke execute on function public.is_super_admin(), public.my_membership(uuid), public.my_role(uuid),
  public.is_org_member(uuid), public.is_org_admin(uuid), public.managed_team_ids(uuid),
  public.managed_member_ids(uuid), public.can_manage_member(uuid), public.can_view_member(uuid),
  public.can_view_profile(uuid) from public, anon;
grant execute on function public.is_super_admin(), public.my_membership(uuid), public.my_role(uuid),
  public.is_org_member(uuid), public.is_org_admin(uuid), public.managed_team_ids(uuid),
  public.managed_member_ids(uuid), public.can_manage_member(uuid), public.can_view_member(uuid),
  public.can_view_profile(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS (§8.3)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.team_managers enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_log enable row level security;
alter table public.email_log enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_view_profile(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- organizations
create policy organizations_select on public.organizations for select to authenticated
  using (public.is_super_admin() or public.is_org_member(id));
create policy organizations_insert on public.organizations for insert to authenticated
  with check (public.is_super_admin());
create policy organizations_update on public.organizations for update to authenticated
  using (public.is_org_admin(id)) with check (public.is_org_admin(id));

-- teams : visibles par tout membre actif de l'entreprise (pour afficher les noms d'équipe).
create policy teams_select on public.teams for select to authenticated
  using (public.is_super_admin() or public.is_org_member(organization_id));
create policy teams_insert on public.teams for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy teams_update on public.teams for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- memberships : création uniquement côté serveur, à l'acceptation d'une invitation.
create policy memberships_select on public.memberships for select to authenticated
  using (public.is_super_admin() or public.can_view_member(id));
create policy memberships_update on public.memberships for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- team_managers : un commercial voit qui manage son équipe.
create policy team_managers_select on public.team_managers for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or membership_id = (public.my_membership(organization_id)).id
    or team_id = (public.my_membership(organization_id)).team_id
  );
create policy team_managers_insert on public.team_managers for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy team_managers_delete on public.team_managers for delete to authenticated
  using (public.is_org_admin(organization_id));

-- invitations : org_admin et super admin pour tous les rôles ;
-- un manager seulement pour des commerciaux de ses équipes.
create policy invitations_select on public.invitations for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or (
      public.my_role(organization_id) = 'manager'
      and role = 'sales_rep'
      and team_id in (select public.managed_team_ids(organization_id))
    )
  );
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and (
      public.is_org_admin(organization_id)
      or (
        public.my_role(organization_id) = 'manager'
        and role = 'sales_rep'
        and team_id in (select public.managed_team_ids(organization_id))
      )
    )
  );
create policy invitations_update on public.invitations for update to authenticated
  using (
    accepted_at is null
    and (
      public.is_org_admin(organization_id)
      or (
        public.my_role(organization_id) = 'manager'
        and role = 'sales_rep'
        and team_id in (select public.managed_team_ids(organization_id))
      )
    )
  )
  with check (
    public.is_org_admin(organization_id)
    or (
      public.my_role(organization_id) = 'manager'
      and role = 'sales_rep'
      and team_id in (select public.managed_team_ids(organization_id))
    )
  );

-- audit_log : lecture super admin (tout) et org_admin (son entreprise). Écriture serveur uniquement.
create policy audit_log_select on public.audit_log for select to authenticated
  using (
    public.is_super_admin()
    or (organization_id is not null and coalesce(public.my_role(organization_id) = 'org_admin', false))
  );

-- email_log : lecture super admin uniquement.
create policy email_log_select on public.email_log for select to authenticated
  using (public.is_super_admin());
