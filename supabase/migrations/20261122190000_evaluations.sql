-- Étape 3 — Évaluations, auto-évaluations et notes privées (SPEC §4.5, §4.6, §6.1-§6.3, §7.4, §7.6)
--
-- Une évaluation porte sur les sous-compétences (« skills ») du référentiel actif de l'entreprise.
--   kind = 'manager' : faite par un manager ou un responsable ; seule elle compte pour la « dernière note ».
--   kind = 'self'    : auto-évaluation du commercial, affichée à côté, ne remplace jamais la première.
-- Une évaluation est d'abord un brouillon (enregistré automatiquement), puis validée : elle devient
-- définitive. Seul un responsable (ou le super admin) peut encore corriger une évaluation manager
-- validée ; la correction est tracée dans le journal par la server action.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  subject_membership_id uuid not null,
  author_membership_id uuid,
  author_user_id uuid not null default auth.uid() references public.profiles (id),
  framework_id uuid not null,
  kind text not null check (kind in ('manager', 'self')),
  status text not null default 'brouillon' check (status in ('brouillon', 'validee')),
  general_comment text check (general_comment is null or length(general_comment) <= 4000),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, organization_id),
  foreign key (subject_membership_id, organization_id) references public.memberships (id, organization_id),
  foreign key (author_membership_id, organization_id) references public.memberships (id, organization_id),
  foreign key (framework_id, organization_id) references public.frameworks (id, organization_id),
  constraint evaluations_validated_at check ((status = 'validee') = (validated_at is not null))
);

-- Un seul brouillon en cours par commercial et par type : on le reprend au lieu d'en créer un autre.
create unique index evaluations_one_draft on public.evaluations (subject_membership_id, kind)
  where status = 'brouillon';
create index evaluations_subject_idx on public.evaluations (subject_membership_id, validated_at desc);
create index evaluations_organization_idx on public.evaluations (organization_id);

create table public.evaluation_scores (
  evaluation_id uuid not null,
  skill_id uuid not null,
  organization_id uuid not null references public.organizations (id),
  score smallint check (score between 0 and 4), -- null = non évaluée
  comment text check (comment is null or length(comment) <= 1000),
  updated_at timestamptz,
  primary key (evaluation_id, skill_id),
  foreign key (evaluation_id, organization_id) references public.evaluations (id, organization_id) on delete cascade,
  foreign key (skill_id, organization_id) references public.skills (id, organization_id)
);

create index evaluation_scores_skill_idx on public.evaluation_scores (skill_id);
create index evaluation_scores_organization_idx on public.evaluation_scores (organization_id);

create table public.manager_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  subject_membership_id uuid not null,
  author_user_id uuid not null default auth.uid() references public.profiles (id),
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  foreign key (subject_membership_id, organization_id) references public.memberships (id, organization_id)
);

create index manager_notes_subject_idx on public.manager_notes (subject_membership_id, created_at desc);

create trigger set_updated_at before update on public.evaluations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.evaluation_scores
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.manager_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Fonctions d'aide
-- ---------------------------------------------------------------------------

-- Le membre donné est-il l'utilisateur connecté (appartenance active, entreprise active) ?
create or replace function public.is_my_membership(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.id = member
      and m.user_id = (select auth.uid())
      and m.active
      and o.status = 'actif'
  );
$$;

-- Lecture d'une évaluation (§8.3) :
--  - qui encadre le commercial voit les évaluations manager (brouillons compris) et les auto-évaluations validées ;
--  - le commercial voit ses auto-évaluations (brouillon compris) et les évaluations manager validées.
create or replace function public.can_view_evaluation(evaluation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.evaluations e
    where e.id = evaluation
      and (
        (public.can_manage_member(e.subject_membership_id) and (e.kind = 'manager' or e.status = 'validee'))
        or (public.is_my_membership(e.subject_membership_id) and (e.kind = 'self' or e.status = 'validee'))
      )
  );
$$;

-- Écriture des notes d'une évaluation :
--  - brouillon manager : qui encadre le commercial ;
--  - brouillon d'auto-évaluation : le commercial lui-même ;
--  - évaluation manager validée : responsable ou super admin uniquement (correction tracée).
create or replace function public.can_edit_evaluation(evaluation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.evaluations e
    where e.id = evaluation
      and (
        (e.status = 'brouillon' and e.kind = 'manager' and public.can_manage_member(e.subject_membership_id))
        or (e.status = 'brouillon' and e.kind = 'self' and public.is_my_membership(e.subject_membership_id))
        or (e.status = 'validee' and e.kind = 'manager' and public.is_org_admin(e.organization_id))
      )
  );
$$;

-- Contrôles à la création et à la modification d'une évaluation.
create or replace function public.guard_evaluation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  subject public.memberships;
begin
  -- Les opérations de service (seed, maintenance) ne passent pas par ces contrôles.
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select * into subject from public.memberships where id = new.subject_membership_id;
    if subject.role is distinct from 'sales_rep' then
      raise exception 'Seul un commercial peut être évalué' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.frameworks f
      where f.id = new.framework_id and f.organization_id = new.organization_id and f.active
    ) then
      raise exception 'Le référentiel doit être le référentiel actif de l''entreprise' using errcode = '23514';
    end if;
    new.author_user_id := (select auth.uid());
    new.author_membership_id := (public.my_membership(new.organization_id)).id;
    if new.status <> 'brouillon' then
      raise exception 'Une évaluation commence toujours en brouillon' using errcode = '23514';
    end if;
    new.validated_at := null;
    return new;
  end if;

  -- UPDATE
  if old.status = 'validee' and new.status = 'brouillon' then
    raise exception 'Une évaluation validée ne repasse pas en brouillon' using errcode = '23514';
  end if;
  if old.status = 'brouillon' and new.status = 'validee' then
    new.validated_at := now();
  elsif old.status = 'validee' then
    new.validated_at := old.validated_at;
  end if;
  return new;
end;
$$;

create trigger guard_evaluation before insert or update on public.evaluations
  for each row execute function public.guard_evaluation();

-- Une note ne vise qu'une sous-compétence du référentiel de l'évaluation.
create or replace function public.guard_evaluation_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.evaluations e
    join public.blocks b on b.framework_id = e.framework_id
    join public.competencies c on c.block_id = b.id
    join public.skills s on s.competency_id = c.id
    where e.id = new.evaluation_id and s.id = new.skill_id
  ) then
    raise exception 'Cette sous-compétence n''appartient pas au référentiel de l''évaluation' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guard_evaluation_score before insert or update of skill_id, evaluation_id on public.evaluation_scores
  for each row execute function public.guard_evaluation_score();

-- Une sous-compétence notée (même en brouillon) est « utilisée » : on la désactive, on ne la supprime plus (§6.7).
create or replace function public.is_skill_used(skill uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.evaluation_scores es where es.skill_id = skill);
$$;

-- ---------------------------------------------------------------------------
-- Dernière note et % de maîtrise (§6.1, §6.3)
-- ---------------------------------------------------------------------------

-- Dernière note validée de type manager, par commercial et sous-compétence.
-- security_invoker : la vue applique les droits de l'utilisateur qui la lit.
create view public.v_latest_skill_scores
with (security_invoker = true)
as
select distinct on (e.subject_membership_id, es.skill_id)
  e.subject_membership_id,
  es.skill_id,
  es.organization_id,
  es.score,
  e.validated_at as evaluated_at,
  e.id as evaluation_id
from public.evaluation_scores es
join public.evaluations e on e.id = es.evaluation_id
where e.kind = 'manager'
  and e.status = 'validee'
  and es.score is not null
order by e.subject_membership_id, es.skill_id, e.validated_at desc, e.id;

-- % de sous-compétences actives maîtrisées (dernière note ≥ 3) ; une sous-compétence jamais évaluée
-- compte comme non maîtrisée. Null si le commercial n'est pas visible ou si le référentiel est vide.
create or replace function public.mastery_percent(member uuid)
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  with active_skills as (
    select s.id
    from public.memberships m
    join public.frameworks f on f.organization_id = m.organization_id and f.active
    join public.blocks b on b.framework_id = f.id and b.active
    join public.competencies c on c.block_id = b.id and c.active
    join public.skills s on s.competency_id = c.id and s.active
    where m.id = member
  )
  select case
    when (select count(*) from active_skills) = 0 then null
    else round(
      100.0 * (
        select count(*) from public.v_latest_skill_scores l
        where l.subject_membership_id = member and l.score >= 3 and l.skill_id in (select id from active_skills)
      ) / (select count(*) from active_skills)
    )::int
  end
  where public.can_view_member(member);
$$;

-- ---------------------------------------------------------------------------
-- Droits et RLS
-- ---------------------------------------------------------------------------

revoke all on public.evaluations, public.evaluation_scores, public.manager_notes from anon, authenticated;
revoke all on public.v_latest_skill_scores from anon, authenticated;

grant select, insert, delete on public.evaluations to authenticated;
grant update (status, general_comment) on public.evaluations to authenticated;
grant select, insert, delete on public.evaluation_scores to authenticated;
grant update (score, comment) on public.evaluation_scores to authenticated;
grant select, insert, delete on public.manager_notes to authenticated;
grant update (body) on public.manager_notes to authenticated;
grant select on public.v_latest_skill_scores to authenticated;
grant all on public.evaluations, public.evaluation_scores, public.manager_notes to service_role;
grant select on public.v_latest_skill_scores to service_role;

revoke execute on function public.is_my_membership(uuid), public.can_view_evaluation(uuid),
  public.can_edit_evaluation(uuid), public.mastery_percent(uuid) from public, anon;
grant execute on function public.is_my_membership(uuid), public.can_view_evaluation(uuid),
  public.can_edit_evaluation(uuid), public.mastery_percent(uuid) to authenticated, service_role;

alter table public.evaluations enable row level security;
alter table public.evaluation_scores enable row level security;
alter table public.manager_notes enable row level security;

-- Évaluations
create policy evaluations_select on public.evaluations for select to authenticated
  using (public.can_view_evaluation(id));

create policy evaluations_insert on public.evaluations for insert to authenticated
  with check (
    (kind = 'manager' and public.can_manage_member(subject_membership_id))
    or (kind = 'self' and public.is_my_membership(subject_membership_id))
  );

create policy evaluations_update on public.evaluations for update to authenticated
  using (public.can_edit_evaluation(id))
  with check (
    (kind = 'manager' and public.can_manage_member(subject_membership_id))
    or (kind = 'self' and public.is_my_membership(subject_membership_id))
  );

-- Seul un brouillon peut être supprimé (« abandonner le brouillon »).
create policy evaluations_delete on public.evaluations for delete to authenticated
  using (status = 'brouillon' and public.can_edit_evaluation(id));

-- Notes
create policy evaluation_scores_select on public.evaluation_scores for select to authenticated
  using (public.can_view_evaluation(evaluation_id));

create policy evaluation_scores_insert on public.evaluation_scores for insert to authenticated
  with check (public.can_edit_evaluation(evaluation_id));

create policy evaluation_scores_update on public.evaluation_scores for update to authenticated
  using (public.can_edit_evaluation(evaluation_id))
  with check (public.can_edit_evaluation(evaluation_id));

create policy evaluation_scores_delete on public.evaluation_scores for delete to authenticated
  using (public.can_edit_evaluation(evaluation_id));

-- Notes privées : managers et responsables du commercial, jamais le commercial (§4.6).
create policy manager_notes_select on public.manager_notes for select to authenticated
  using (public.can_manage_member(subject_membership_id));

create policy manager_notes_insert on public.manager_notes for insert to authenticated
  with check (public.can_manage_member(subject_membership_id) and author_user_id = (select auth.uid()));

create policy manager_notes_update on public.manager_notes for update to authenticated
  using (public.can_manage_member(subject_membership_id) and author_user_id = (select auth.uid()))
  with check (public.can_manage_member(subject_membership_id) and author_user_id = (select auth.uid()));

create policy manager_notes_delete on public.manager_notes for delete to authenticated
  using (
    public.can_manage_member(subject_membership_id)
    and (author_user_id = (select auth.uid()) or public.is_org_admin(organization_id))
  );
