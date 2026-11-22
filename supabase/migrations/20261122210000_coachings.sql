-- Étape 4 — Coachings terrain, comptes rendus, demandes de coaching, actions (SPEC §4.7, §4.8, §6.5, §6.6, §7.5, §7.6)
--
-- Le compte rendu (CR) et les observations sont dans des tables à part : le commercial voit ses
-- coachings planifiés (date, objectif, compétences ciblées) mais ne lit le CR qu'une fois clôturé.
-- Le statut « à rédiger » n'est pas stocké : il se calcule (date de fin passée, ni clôturé ni annulé).

-- ---------------------------------------------------------------------------
-- Demandes de coaching
-- ---------------------------------------------------------------------------

create table public.coaching_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  requester_membership_id uuid not null,
  message text check (message is null or length(message) <= 2000),
  status text not null default 'en_attente' check (status in ('en_attente', 'acceptee', 'refusee')),
  answer text check (answer is null or length(answer) <= 2000),
  answered_by uuid references public.profiles (id),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, organization_id),
  foreign key (requester_membership_id, organization_id) references public.memberships (id, organization_id)
);

create index coaching_requests_requester_idx on public.coaching_requests (requester_membership_id, created_at desc);
create index coaching_requests_pending_idx on public.coaching_requests (organization_id) where status = 'en_attente';

create table public.coaching_request_skills (
  request_id uuid not null,
  skill_id uuid not null,
  organization_id uuid not null references public.organizations (id),
  primary key (request_id, skill_id),
  foreign key (request_id, organization_id) references public.coaching_requests (id, organization_id) on delete cascade,
  foreign key (skill_id, organization_id) references public.skills (id, organization_id)
);
create index coaching_request_skills_skill_idx on public.coaching_request_skills (skill_id);

-- ---------------------------------------------------------------------------
-- Coachings
-- ---------------------------------------------------------------------------

create table public.coachings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  subject_membership_id uuid not null,
  coach_membership_id uuid,
  coach_user_id uuid not null default auth.uid() references public.profiles (id),
  scheduled_at timestamptz not null,
  duration_minutes int not null default 120 check (duration_minutes between 15 and 720),
  mode text not null default 'terrain' check (mode in ('terrain', 'distance')),
  location text check (location is null or length(location) <= 200),
  objective text check (objective is null or length(objective) <= 500),
  status text not null default 'planifie' check (status in ('planifie', 'cloture', 'annule')),
  cancel_reason text check (cancel_reason is null or length(cancel_reason) <= 500),
  rep_comment text check (rep_comment is null or length(rep_comment) <= 2000),
  closed_at timestamptz,
  reopened_at timestamptz,
  reopen_reason text check (reopen_reason is null or length(reopen_reason) <= 500),
  request_id uuid,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, organization_id),
  foreign key (subject_membership_id, organization_id) references public.memberships (id, organization_id),
  foreign key (coach_membership_id, organization_id) references public.memberships (id, organization_id),
  foreign key (request_id, organization_id) references public.coaching_requests (id, organization_id),
  constraint coachings_closed_at check ((status = 'cloture') = (closed_at is not null)),
  constraint coachings_cancel_reason check (status <> 'annule' or cancel_reason is not null)
);

create index coachings_subject_idx on public.coachings (subject_membership_id, scheduled_at desc);
create index coachings_organization_idx on public.coachings (organization_id, scheduled_at);
create index coachings_open_idx on public.coachings (scheduled_at) where status = 'planifie';

-- Compétences ciblées (1 à 3), visibles par le commercial dès la planification.
create table public.coaching_skills (
  coaching_id uuid not null,
  skill_id uuid not null,
  organization_id uuid not null references public.organizations (id),
  primary key (coaching_id, skill_id),
  foreign key (coaching_id, organization_id) references public.coachings (id, organization_id) on delete cascade,
  foreign key (skill_id, organization_id) references public.skills (id, organization_id)
);
create index coaching_skills_skill_idx on public.coaching_skills (skill_id);

-- Compte rendu : visible par le commercial uniquement une fois le coaching clôturé.
create table public.coaching_reports (
  coaching_id uuid primary key,
  organization_id uuid not null references public.organizations (id),
  context text check (context is null or length(context) <= 4000),
  strengths text check (strengths is null or length(strengths) <= 4000),
  improvements text check (improvements is null or length(improvements) <= 4000),
  -- Plan d'action en préparation : [{ title, description?, skillId?, dueDate? }] (validé par Zod) ;
  -- transformé en lignes de « actions » à la clôture.
  action_plan jsonb not null default '[]'::jsonb check (jsonb_typeof(action_plan) = 'array'),
  updated_at timestamptz,
  foreign key (coaching_id, organization_id) references public.coachings (id, organization_id) on delete cascade
);

-- Observations par compétence ciblée : note facultative « observée en coaching » (≠ évaluation officielle).
create table public.coaching_observations (
  coaching_id uuid not null,
  skill_id uuid not null,
  organization_id uuid not null references public.organizations (id),
  score smallint check (score between 0 and 4),
  comment text check (comment is null or length(comment) <= 1000),
  updated_at timestamptz,
  primary key (coaching_id, skill_id),
  foreign key (coaching_id, organization_id) references public.coachings (id, organization_id) on delete cascade,
  foreign key (skill_id, organization_id) references public.skills (id, organization_id)
);
create index coaching_observations_skill_idx on public.coaching_observations (skill_id);

-- ---------------------------------------------------------------------------
-- Plan de progrès (§4.8) — l'écran complet arrive à l'étape 5
-- ---------------------------------------------------------------------------

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  subject_membership_id uuid not null,
  skill_id uuid,
  title text not null check (length(trim(title)) between 1 and 200),
  description text check (description is null or length(description) <= 2000),
  due_date date,
  status text not null default 'a_faire' check (status in ('a_faire', 'en_cours', 'faite', 'abandonnee')),
  source text not null default 'manuelle' check (source in ('coaching', 'evaluation', 'manuelle')),
  coaching_id uuid,
  created_by uuid not null default auth.uid() references public.profiles (id),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  foreign key (subject_membership_id, organization_id) references public.memberships (id, organization_id),
  foreign key (skill_id, organization_id) references public.skills (id, organization_id),
  foreign key (coaching_id, organization_id) references public.coachings (id, organization_id)
);
create index actions_subject_idx on public.actions (subject_membership_id, status, due_date);
create index actions_skill_idx on public.actions (skill_id);

create trigger set_updated_at before update on public.coaching_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.coachings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.coaching_reports
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.coaching_observations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.actions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Fonctions d'aide
-- ---------------------------------------------------------------------------

-- Lecture d'un coaching : qui encadre le commercial, ou le commercial (planifié ou clôturé, jamais annulé).
create or replace function public.can_view_coaching_row(subject uuid, status text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_member(subject)
    or (public.is_my_membership(subject) and status in ('planifie', 'cloture'));
$$;

create or replace function public.can_view_coaching(coaching uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.coachings c
    where c.id = coaching and public.can_view_coaching_row(c.subject_membership_id, c.status)
  );
$$;

-- Lecture du compte rendu : qui encadre le commercial ; le commercial une fois clôturé.
create or replace function public.can_view_coaching_report(coaching uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.coachings c
    where c.id = coaching
      and (
        public.can_manage_member(c.subject_membership_id)
        or (public.is_my_membership(c.subject_membership_id) and c.status = 'cloture')
      )
  );
$$;

-- Écriture du compte rendu et des compétences : qui encadre le commercial, tant que le coaching est ouvert.
create or replace function public.can_edit_coaching(coaching uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.coachings c
    where c.id = coaching and c.status = 'planifie' and public.can_manage_member(c.subject_membership_id)
  );
$$;

-- Contrôles des coachings : création par un coach, transitions de statut, droits du commercial.
create or replace function public.guard_coaching()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  manages boolean;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if (select role from public.memberships where id = new.subject_membership_id) is distinct from 'sales_rep' then
      raise exception 'Seul un commercial peut être coaché' using errcode = '23514';
    end if;
    if new.status <> 'planifie' then
      raise exception 'Un coaching commence toujours planifié' using errcode = '23514';
    end if;
    new.coach_user_id := (select auth.uid());
    new.coach_membership_id := (public.my_membership(new.organization_id)).id;
    new.closed_at := null;
    new.reopened_at := null;
    new.reopen_reason := null;
    new.rep_comment := null;
    new.reminder_sent_at := null;
    return new;
  end if;

  manages := public.can_manage_member(old.subject_membership_id);

  -- Le commercial ne peut écrire que son commentaire, sur un coaching clôturé.
  if not manages then
    if old.status <> 'cloture'
       or (new.status, new.scheduled_at, new.duration_minutes, new.mode, new.location, new.objective,
           new.cancel_reason, new.reopen_reason)
          is distinct from
          (old.status, old.scheduled_at, old.duration_minutes, old.mode, old.location, old.objective,
           old.cancel_reason, old.reopen_reason) then
      raise exception 'Seul votre commentaire peut être modifié' using errcode = '42501';
    end if;
    return new;
  end if;

  -- Le commentaire du commercial n'appartient qu'à lui.
  if new.rep_comment is distinct from old.rep_comment then
    raise exception 'Seul le commercial écrit son commentaire' using errcode = '42501';
  end if;

  -- Un coaching clôturé est figé, sauf réouverture par un responsable (avec motif).
  if old.status = 'cloture' then
    if new.status = 'planifie' then
      if not public.is_org_admin(old.organization_id) then
        raise exception 'Seul un responsable peut rouvrir un compte rendu' using errcode = '42501';
      end if;
      if coalesce(trim(new.reopen_reason), '') = '' then
        raise exception 'Le motif de réouverture est obligatoire' using errcode = '23514';
      end if;
      new.closed_at := null;
      new.reopened_at := now();
      return new;
    end if;
    if (new.status, new.scheduled_at, new.duration_minutes, new.mode, new.location, new.objective)
       is distinct from (old.status, old.scheduled_at, old.duration_minutes, old.mode, old.location, old.objective) then
      raise exception 'Un compte rendu clôturé ne se modifie plus' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.status = 'annule' and new.status <> 'annule' then
    raise exception 'Un coaching annulé ne se rouvre pas' using errcode = '23514';
  end if;

  if old.status = 'planifie' and new.status = 'cloture' then
    if old.scheduled_at > now() then
      raise exception 'Le coaching n''a pas encore eu lieu' using errcode = '23514';
    end if;
    new.closed_at := now();
  elsif new.status = 'planifie' then
    new.closed_at := null;
  end if;
  -- Une nouvelle date relance le cycle de rappel.
  if new.scheduled_at is distinct from old.scheduled_at then
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;

create trigger guard_coaching before insert or update on public.coachings
  for each row execute function public.guard_coaching();

-- 1 à 3 compétences ciblées, appartenant au référentiel actif de l'entreprise.
create or replace function public.guard_coaching_skill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.coaching_skills where coaching_id = new.coaching_id) >= 3 then
    raise exception 'Trois compétences au maximum par coaching' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guard_coaching_skill before insert on public.coaching_skills
  for each row execute function public.guard_coaching_skill();

-- Une observation ne porte que sur une compétence ciblée.
create or replace function public.guard_coaching_observation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.coaching_skills
    where coaching_id = new.coaching_id and skill_id = new.skill_id
  ) then
    raise exception 'Cette compétence n''est pas ciblée par le coaching' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guard_coaching_observation before insert or update of skill_id on public.coaching_observations
  for each row execute function public.guard_coaching_observation();

-- Demandes : seul le commercial lui-même les crée ; seul son manager y répond.
create or replace function public.guard_coaching_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if (select role from public.memberships where id = new.requester_membership_id) is distinct from 'sales_rep' then
      raise exception 'Seul un commercial peut demander un coaching' using errcode = '23514';
    end if;
    new.status := 'en_attente';
    new.answer := null;
    new.answered_by := null;
    new.answered_at := null;
    return new;
  end if;
  if old.status <> 'en_attente' then
    raise exception 'Cette demande a déjà reçu une réponse' using errcode = '23514';
  end if;
  if new.status <> old.status then
    if not public.can_manage_member(old.requester_membership_id) then
      raise exception 'Seul le manager répond à une demande' using errcode = '42501';
    end if;
    new.answered_by := (select auth.uid());
    new.answered_at := now();
  end if;
  return new;
end;
$$;

create trigger guard_coaching_request before insert or update on public.coaching_requests
  for each row execute function public.guard_coaching_request();

-- Actions : date de réalisation tenue par la base.
create or replace function public.guard_action()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
  end if;
  if new.status = 'faite' and (tg_op = 'INSERT' or old.status <> 'faite') then
    new.done_at := now();
  elsif new.status <> 'faite' then
    new.done_at := null;
  end if;
  return new;
end;
$$;

create trigger guard_action before insert or update on public.actions
  for each row execute function public.guard_action();

-- Une sous-compétence est « utilisée » dès qu'une note, un coaching, une demande ou une action la vise (§6.7).
create or replace function public.is_skill_used(skill uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.evaluation_scores where skill_id = skill)
    or exists (select 1 from public.coaching_skills where skill_id = skill)
    or exists (select 1 from public.coaching_observations where skill_id = skill)
    or exists (select 1 from public.coaching_request_skills where skill_id = skill)
    or exists (select 1 from public.actions where skill_id = skill);
$$;

-- ---------------------------------------------------------------------------
-- Droits et RLS
-- ---------------------------------------------------------------------------

revoke all on public.coaching_requests, public.coaching_request_skills, public.coachings,
  public.coaching_skills, public.coaching_reports, public.coaching_observations, public.actions
  from anon, authenticated;

grant select, insert, delete on public.coaching_requests to authenticated;
grant update (message, status, answer) on public.coaching_requests to authenticated;
grant select, insert, delete on public.coaching_request_skills to authenticated;
grant select, insert, delete on public.coachings to authenticated;
grant update (scheduled_at, duration_minutes, mode, location, objective, status, cancel_reason,
  rep_comment, reopen_reason) on public.coachings to authenticated;
grant select, insert, delete on public.coaching_skills to authenticated;
grant select, insert on public.coaching_reports to authenticated;
grant update (context, strengths, improvements, action_plan) on public.coaching_reports to authenticated;
grant select, insert, delete on public.coaching_observations to authenticated;
grant update (score, comment) on public.coaching_observations to authenticated;
grant select, insert, delete on public.actions to authenticated;
grant update (skill_id, title, description, due_date, status) on public.actions to authenticated;
grant all on public.coaching_requests, public.coaching_request_skills, public.coachings,
  public.coaching_skills, public.coaching_reports, public.coaching_observations, public.actions
  to service_role;

revoke execute on function public.can_view_coaching_row(uuid, text), public.can_view_coaching(uuid),
  public.can_view_coaching_report(uuid), public.can_edit_coaching(uuid) from public, anon;
grant execute on function public.can_view_coaching_row(uuid, text), public.can_view_coaching(uuid),
  public.can_view_coaching_report(uuid), public.can_edit_coaching(uuid) to authenticated, service_role;

alter table public.coaching_requests enable row level security;
alter table public.coaching_request_skills enable row level security;
alter table public.coachings enable row level security;
alter table public.coaching_skills enable row level security;
alter table public.coaching_reports enable row level security;
alter table public.coaching_observations enable row level security;
alter table public.actions enable row level security;

-- Demandes
create policy coaching_requests_select on public.coaching_requests for select to authenticated
  using (public.is_my_membership(requester_membership_id) or public.can_manage_member(requester_membership_id));
create policy coaching_requests_insert on public.coaching_requests for insert to authenticated
  with check (public.is_my_membership(requester_membership_id));
create policy coaching_requests_update on public.coaching_requests for update to authenticated
  using (
    status = 'en_attente'
    and (public.is_my_membership(requester_membership_id) or public.can_manage_member(requester_membership_id))
  )
  with check (public.is_my_membership(requester_membership_id) or public.can_manage_member(requester_membership_id));
create policy coaching_requests_delete on public.coaching_requests for delete to authenticated
  using (status = 'en_attente' and public.is_my_membership(requester_membership_id));

create policy coaching_request_skills_select on public.coaching_request_skills for select to authenticated
  using (exists (
    select 1 from public.coaching_requests r
    where r.id = request_id
      and (public.is_my_membership(r.requester_membership_id) or public.can_manage_member(r.requester_membership_id))
  ));
create policy coaching_request_skills_insert on public.coaching_request_skills for insert to authenticated
  with check (exists (
    select 1 from public.coaching_requests r
    where r.id = request_id and r.status = 'en_attente' and public.is_my_membership(r.requester_membership_id)
  ));
create policy coaching_request_skills_delete on public.coaching_request_skills for delete to authenticated
  using (exists (
    select 1 from public.coaching_requests r
    where r.id = request_id and r.status = 'en_attente' and public.is_my_membership(r.requester_membership_id)
  ));

-- Coachings
create policy coachings_select on public.coachings for select to authenticated
  using (public.can_view_coaching_row(subject_membership_id, status));
create policy coachings_insert on public.coachings for insert to authenticated
  with check (public.can_manage_member(subject_membership_id));
create policy coachings_update on public.coachings for update to authenticated
  using (
    public.can_manage_member(subject_membership_id)
    or (public.is_my_membership(subject_membership_id) and status = 'cloture')
  )
  with check (
    public.can_manage_member(subject_membership_id)
    or (public.is_my_membership(subject_membership_id) and status = 'cloture')
  );
-- Suppression : seulement un coaching jamais clôturé, par qui encadre le commercial (sinon : annuler).
create policy coachings_delete on public.coachings for delete to authenticated
  using (status <> 'cloture' and closed_at is null and reopened_at is null
         and public.can_manage_member(subject_membership_id));

create policy coaching_skills_select on public.coaching_skills for select to authenticated
  using (public.can_view_coaching(coaching_id));
create policy coaching_skills_insert on public.coaching_skills for insert to authenticated
  with check (public.can_edit_coaching(coaching_id));
create policy coaching_skills_delete on public.coaching_skills for delete to authenticated
  using (public.can_edit_coaching(coaching_id));

create policy coaching_reports_select on public.coaching_reports for select to authenticated
  using (public.can_view_coaching_report(coaching_id));
create policy coaching_reports_insert on public.coaching_reports for insert to authenticated
  with check (public.can_edit_coaching(coaching_id));
create policy coaching_reports_update on public.coaching_reports for update to authenticated
  using (public.can_edit_coaching(coaching_id))
  with check (public.can_edit_coaching(coaching_id));

create policy coaching_observations_select on public.coaching_observations for select to authenticated
  using (public.can_view_coaching_report(coaching_id));
create policy coaching_observations_insert on public.coaching_observations for insert to authenticated
  with check (public.can_edit_coaching(coaching_id));
create policy coaching_observations_update on public.coaching_observations for update to authenticated
  using (public.can_edit_coaching(coaching_id))
  with check (public.can_edit_coaching(coaching_id));
create policy coaching_observations_delete on public.coaching_observations for delete to authenticated
  using (public.can_edit_coaching(coaching_id));

-- Actions : le commercial et ceux qui l'encadrent.
create policy actions_select on public.actions for select to authenticated
  using (public.can_view_member(subject_membership_id));
create policy actions_insert on public.actions for insert to authenticated
  with check (public.can_view_member(subject_membership_id));
create policy actions_update on public.actions for update to authenticated
  using (public.can_view_member(subject_membership_id))
  with check (public.can_view_member(subject_membership_id));
create policy actions_delete on public.actions for delete to authenticated
  using (
    public.can_manage_member(subject_membership_id)
    or (public.is_my_membership(subject_membership_id) and source = 'manuelle')
  );
