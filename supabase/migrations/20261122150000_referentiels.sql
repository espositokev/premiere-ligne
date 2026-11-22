-- Étape 2a — Référentiels de compétences (SPEC §4.4, §7.1, §7.3, adaptés : docs/DECISIONS.md)
--
-- Structure à 3 niveaux, celle de la méthode Première Ligne :
--   Bloc (ex. « Tunnel de vente ») → Compétence (ex. « Accueil ») → Sous-compétence notée de 0 à 4.
-- Dans le code, la sous-compétence notée s'appelle « skill » (comme dans la spec),
-- la compétence qui les regroupe « competency ».
--
-- Les modèles (framework_templates…) appartiennent au super admin. À la création d'un client,
-- un modèle est COPIÉ dans l'entreprise : les deux évoluent ensuite indépendamment.

-- ---------------------------------------------------------------------------
-- Modèles globaux (super admin)
-- ---------------------------------------------------------------------------

create table public.framework_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  description text check (description is null or length(description) <= 500),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table public.template_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.framework_templates (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index template_blocks_template_id_idx on public.template_blocks (template_id, position);

create table public.template_competencies (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.template_blocks (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  statement text check (statement is null or length(statement) <= 300),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index template_competencies_block_id_idx on public.template_competencies (block_id, position);

create table public.template_skills (
  id uuid primary key default gen_random_uuid(),
  competency_id uuid not null references public.template_competencies (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  statement text check (statement is null or length(statement) <= 300),
  position int not null default 0,
  level_0 text, level_1 text, level_2 text, level_3 text, level_4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index template_skills_competency_id_idx on public.template_skills (competency_id, position);

-- ---------------------------------------------------------------------------
-- Référentiel de chaque entreprise
-- ---------------------------------------------------------------------------

create table public.frameworks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null check (length(trim(name)) between 2 and 120),
  description text check (description is null or length(description) <= 500),
  source_template_id uuid references public.framework_templates (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, organization_id)
);
-- V1 : un seul référentiel actif par entreprise, appliqué à tous ses commerciaux.
create unique index frameworks_one_active_per_org on public.frameworks (organization_id) where active;

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  framework_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 120),
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, organization_id),
  foreign key (framework_id, organization_id) references public.frameworks (id, organization_id) on delete cascade
);
create index blocks_framework_id_idx on public.blocks (framework_id, position);
create index blocks_organization_id_idx on public.blocks (organization_id);

create table public.competencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  block_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 80),
  statement text check (statement is null or length(statement) <= 300),
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, organization_id),
  foreign key (block_id, organization_id) references public.blocks (id, organization_id) on delete cascade
);
create index competencies_block_id_idx on public.competencies (block_id, position);
create index competencies_organization_id_idx on public.competencies (organization_id);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  competency_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 80),
  statement text check (statement is null or length(statement) <= 300),
  position int not null default 0,
  active boolean not null default true,
  level_0 text, level_1 text, level_2 text, level_3 text, level_4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, organization_id),
  foreign key (competency_id, organization_id) references public.competencies (id, organization_id) on delete cascade
);
create index skills_competency_id_idx on public.skills (competency_id, position);
create index skills_organization_id_idx on public.skills (organization_id);

-- updated_at automatique
create trigger set_updated_at before update on public.framework_templates for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.template_blocks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.template_competencies for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.template_skills for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.frameworks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.blocks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.competencies for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.skills for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Règle de suppression (§4.4, §6.7) : on ne supprime jamais un élément utilisé.
-- La fonction est complétée à chaque étape qui ajoute une référence aux compétences
-- (Dojos, évaluations, coachings, actions…). Le déclencheur la rappelle à chaque suppression,
-- y compris en cascade depuis une compétence ou un bloc.
-- ---------------------------------------------------------------------------

create or replace function public.is_skill_used(skill uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

create or replace function public.guard_skill_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_skill_used(old.id) then
    raise exception 'La sous-compétence « % » est déjà utilisée : désactivez-la plutôt que de la supprimer', old.name
      using errcode = '23503';
  end if;
  return old;
end;
$$;
create trigger guard_skill_delete before delete on public.skills
  for each row execute function public.guard_skill_delete();

-- Indique si une compétence ou un bloc contient au moins une sous-compétence utilisée.
create or replace function public.is_competency_used(competency uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.skills s where s.competency_id = competency and public.is_skill_used(s.id));
$$;

create or replace function public.is_block_used(block uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.competencies c where c.block_id = block and public.is_competency_used(c.id));
$$;

-- ---------------------------------------------------------------------------
-- Copie d'un modèle dans une entreprise (§3.1)
-- ---------------------------------------------------------------------------

create or replace function public.copy_template_to_organization(template uuid, org uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_framework uuid;
  tb record;
  tc record;
  new_block uuid;
  new_competency uuid;
begin
  if not public.is_super_admin() and (select auth.uid()) is not null then
    raise exception 'Réservé au super admin' using errcode = '42501';
  end if;

  if exists (select 1 from public.frameworks f where f.organization_id = org and f.active) then
    raise exception 'Cette entreprise a déjà un référentiel actif' using errcode = '23505';
  end if;

  insert into public.frameworks (organization_id, name, description, source_template_id)
  select org, t.name, t.description, t.id from public.framework_templates t where t.id = template
  returning id into new_framework;

  if new_framework is null then
    raise exception 'Modèle introuvable' using errcode = 'P0002';
  end if;

  for tb in select * from public.template_blocks where template_id = template order by position loop
    insert into public.blocks (organization_id, framework_id, name, position)
    values (org, new_framework, tb.name, tb.position)
    returning id into new_block;

    for tc in select * from public.template_competencies where block_id = tb.id order by position loop
      insert into public.competencies (organization_id, block_id, name, statement, position)
      values (org, new_block, tc.name, tc.statement, tc.position)
      returning id into new_competency;

      insert into public.skills (organization_id, competency_id, name, statement, position,
                                 level_0, level_1, level_2, level_3, level_4)
      select org, new_competency, ts.name, ts.statement, ts.position,
             ts.level_0, ts.level_1, ts.level_2, ts.level_3, ts.level_4
      from public.template_skills ts
      where ts.competency_id = tc.id
      order by ts.position;
    end loop;
  end loop;

  return new_framework;
end;
$$;


-- Sous-compétences déjà utilisées d'une entreprise (une seule requête pour l'éditeur).
create or replace function public.used_skill_ids(org uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.skills s
  where s.organization_id = org
    and (public.is_super_admin() or public.is_org_member(org))
    and public.is_skill_used(s.id);
$$;

-- Duplication d'un modèle (super admin), pour partir d'un modèle existant.
create or replace function public.duplicate_template(template uuid, new_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_template uuid;
  tb record;
  tc record;
  new_block uuid;
  new_competency uuid;
begin
  if not public.is_super_admin() and (select auth.uid()) is not null then
    raise exception 'Réservé au super admin' using errcode = '42501';
  end if;

  insert into public.framework_templates (name, description, published)
  select new_name, t.description, false from public.framework_templates t where t.id = template
  returning id into new_template;
  if new_template is null then
    raise exception 'Modèle introuvable' using errcode = 'P0002';
  end if;

  for tb in select * from public.template_blocks where template_id = template order by position loop
    insert into public.template_blocks (template_id, name, position)
    values (new_template, tb.name, tb.position) returning id into new_block;
    for tc in select * from public.template_competencies where block_id = tb.id order by position loop
      insert into public.template_competencies (block_id, name, statement, position)
      values (new_block, tc.name, tc.statement, tc.position) returning id into new_competency;
      insert into public.template_skills (competency_id, name, statement, position, level_0, level_1, level_2, level_3, level_4)
      select new_competency, ts.name, ts.statement, ts.position, ts.level_0, ts.level_1, ts.level_2, ts.level_3, ts.level_4
      from public.template_skills ts where ts.competency_id = tc.id order by ts.position;
    end loop;
  end loop;
  return new_template;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits et RLS
-- ---------------------------------------------------------------------------

revoke all on public.framework_templates, public.template_blocks, public.template_competencies,
  public.template_skills, public.frameworks, public.blocks, public.competencies, public.skills from anon;
revoke all on public.framework_templates, public.template_blocks, public.template_competencies,
  public.template_skills, public.frameworks, public.blocks, public.competencies, public.skills from authenticated;

grant select, insert, update, delete on public.framework_templates, public.template_blocks,
  public.template_competencies, public.template_skills to authenticated;
grant select, insert on public.frameworks, public.blocks, public.competencies, public.skills to authenticated;
grant delete on public.blocks, public.competencies, public.skills to authenticated;
grant update (name, description, active) on public.frameworks to authenticated;
grant update (name, position, active) on public.blocks to authenticated;
grant update (name, statement, position, active) on public.competencies to authenticated;
grant update (name, statement, position, active, level_0, level_1, level_2, level_3, level_4)
  on public.skills to authenticated;
grant all on public.framework_templates, public.template_blocks, public.template_competencies,
  public.template_skills, public.frameworks, public.blocks, public.competencies, public.skills to service_role;

revoke execute on function public.is_skill_used(uuid), public.is_competency_used(uuid),
  public.is_block_used(uuid), public.copy_template_to_organization(uuid, uuid),
  public.used_skill_ids(uuid), public.duplicate_template(uuid, text) from public, anon;
grant execute on function public.is_skill_used(uuid), public.is_competency_used(uuid),
  public.is_block_used(uuid), public.copy_template_to_organization(uuid, uuid),
  public.used_skill_ids(uuid), public.duplicate_template(uuid, text) to authenticated, service_role;

alter table public.framework_templates enable row level security;
alter table public.template_blocks enable row level security;
alter table public.template_competencies enable row level security;
alter table public.template_skills enable row level security;
alter table public.frameworks enable row level security;
alter table public.blocks enable row level security;
alter table public.competencies enable row level security;
alter table public.skills enable row level security;

-- Modèles : super admin uniquement (§8.3).
create policy framework_templates_all on public.framework_templates for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy template_blocks_all on public.template_blocks for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy template_competencies_all on public.template_competencies for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy template_skills_all on public.template_skills for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Référentiel de l'entreprise : lecture par tout membre actif, écriture par le responsable.
create policy frameworks_select on public.frameworks for select to authenticated
  using (public.is_super_admin() or public.is_org_member(organization_id));
create policy frameworks_write on public.frameworks for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy frameworks_update on public.frameworks for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy blocks_select on public.blocks for select to authenticated
  using (public.is_super_admin() or public.is_org_member(organization_id));
create policy blocks_insert on public.blocks for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy blocks_update on public.blocks for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy blocks_delete on public.blocks for delete to authenticated
  using (public.is_org_admin(organization_id));

create policy competencies_select on public.competencies for select to authenticated
  using (public.is_super_admin() or public.is_org_member(organization_id));
create policy competencies_insert on public.competencies for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy competencies_update on public.competencies for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy competencies_delete on public.competencies for delete to authenticated
  using (public.is_org_admin(organization_id));

create policy skills_select on public.skills for select to authenticated
  using (public.is_super_admin() or public.is_org_member(organization_id));
create policy skills_insert on public.skills for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy skills_update on public.skills for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy skills_delete on public.skills for delete to authenticated
  using (public.is_org_admin(organization_id));
