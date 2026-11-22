-- Étape 2b — Dojos (adaptation : voir docs/DECISIONS.md)
--
-- Un Dojo est un exercice d'entraînement en 3 phases (Théorie, Offline, Online), toujours
-- rattaché à une sous-compétence de la matrice. Son contenu structuré est stocké en JSON
-- (validé par l'application, voir lib/domain/dojo.ts).
--
-- * library_dojos : la bibliothèque Première Ligne (super admin), rattachée aux sous-compétences
--   des modèles. Copiée chez le client avec la matrice.
-- * dojos : les Dojos de chaque entreprise (copies de la bibliothèque, créés à la main ou générés).

create table public.library_dojos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 140),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  pptx_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table public.library_dojo_skills (
  library_dojo_id uuid not null references public.library_dojos (id) on delete cascade,
  template_skill_id uuid not null references public.template_skills (id) on delete cascade,
  primary key (library_dojo_id, template_skill_id)
);
create index library_dojo_skills_template_skill_id_idx on public.library_dojo_skills (template_skill_id);

create table public.dojos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  skill_id uuid not null,
  title text not null check (length(trim(title)) between 2 and 140),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  status text not null default 'brouillon' check (status in ('brouillon', 'a_tester', 'valide', 'archive')),
  source text not null default 'manuel' check (source in ('bibliotheque', 'ia', 'manuel')),
  library_dojo_id uuid references public.library_dojos (id) on delete set null,
  pptx_path text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, organization_id),
  -- Un Dojo suit sa sous-compétence : supprimer une sous-compétence jamais utilisée retire ses Dojos.
  foreign key (skill_id, organization_id) references public.skills (id, organization_id) on delete cascade
);
create index dojos_organization_id_idx on public.dojos (organization_id, status);
create index dojos_skill_id_idx on public.dojos (skill_id);
create index dojos_created_by_idx on public.dojos (created_by);

create trigger set_updated_at before update on public.library_dojos for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.dojos for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- La copie d'un modèle emporte aussi les Dojos de la bibliothèque rattachés à ses sous-compétences.
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
  ts record;
  new_block uuid;
  new_competency uuid;
  new_skill uuid;
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

      for ts in select * from public.template_skills where competency_id = tc.id order by position loop
        insert into public.skills (organization_id, competency_id, name, statement, position,
                                   level_0, level_1, level_2, level_3, level_4)
        values (org, new_competency, ts.name, ts.statement, ts.position,
                ts.level_0, ts.level_1, ts.level_2, ts.level_3, ts.level_4)
        returning id into new_skill;

        insert into public.dojos (organization_id, skill_id, title, content, status, source, library_dojo_id, pptx_path)
        select org, new_skill, ld.title, ld.content, 'valide', 'bibliotheque', ld.id, ld.pptx_path
        from public.library_dojo_skills lds
        join public.library_dojos ld on ld.id = lds.library_dojo_id
        where lds.template_skill_id = ts.id;
      end loop;
    end loop;
  end loop;

  return new_framework;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits et RLS
-- ---------------------------------------------------------------------------

revoke all on public.library_dojos, public.library_dojo_skills, public.dojos from anon;
revoke all on public.library_dojos, public.library_dojo_skills, public.dojos from authenticated;
grant select, insert, update, delete on public.library_dojos, public.library_dojo_skills to authenticated;
grant select, insert, delete on public.dojos to authenticated;
grant update (skill_id, title, content, status) on public.dojos to authenticated;
grant all on public.library_dojos, public.library_dojo_skills, public.dojos to service_role;

alter table public.library_dojos enable row level security;
alter table public.library_dojo_skills enable row level security;
alter table public.dojos enable row level security;

create policy library_dojos_all on public.library_dojos for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy library_dojo_skills_all on public.library_dojo_skills for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Lecture : l'encadrement voit tous les Dojos de l'entreprise ; un commercial seulement les Dojos validés.
create policy dojos_select on public.dojos for select to authenticated
  using (
    public.is_super_admin()
    or public.my_role(organization_id) in ('org_admin', 'manager')
    or (public.my_role(organization_id) = 'sales_rep' and status = 'valide')
  );

-- Création : managers, responsables et super admin (§ décision Dojos).
create policy dojos_insert on public.dojos for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (public.is_org_admin(organization_id) or public.my_role(organization_id) = 'manager')
  );

-- Modification : le responsable modifie tout ; un manager modifie les Dojos qu'il a créés.
create policy dojos_update on public.dojos for update to authenticated
  using (
    public.is_org_admin(organization_id)
    or (public.my_role(organization_id) = 'manager' and created_by = (select auth.uid()))
  )
  with check (
    public.is_org_admin(organization_id)
    or (public.my_role(organization_id) = 'manager' and created_by = (select auth.uid()))
  );

create policy dojos_delete on public.dojos for delete to authenticated
  using (
    public.is_org_admin(organization_id)
    or (public.my_role(organization_id) = 'manager' and created_by = (select auth.uid()) and status = 'brouillon')
  );
