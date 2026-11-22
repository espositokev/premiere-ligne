-- Étape 4 — Séances de Dojo (DECISIONS.md, étape 2 puis 4)
--
-- Le manager note une séance animée : participants (un ou plusieurs commerciaux, un Dojo se joue
-- souvent en groupe), scénario joué, ce qui a marché, axe prioritaire et engagement pris.

create table public.dojo_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  dojo_id uuid not null,
  coach_user_id uuid not null default auth.uid() references public.profiles (id),
  held_on date not null default current_date,
  scenario smallint check (scenario between 1 and 3),
  went_well text check (went_well is null or length(went_well) <= 2000),
  priority_axis text check (priority_axis is null or length(priority_axis) <= 1000),
  commitment text check (commitment is null or length(commitment) <= 1000),
  coaching_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, organization_id),
  -- Un Dojo qui a servi ne se supprime plus : on l'archive.
  foreign key (dojo_id, organization_id) references public.dojos (id, organization_id),
  foreign key (coaching_id, organization_id) references public.coachings (id, organization_id)
);
create index dojo_sessions_dojo_idx on public.dojo_sessions (dojo_id, held_on desc);
create index dojo_sessions_organization_idx on public.dojo_sessions (organization_id, held_on desc);

create table public.dojo_session_participants (
  session_id uuid not null,
  membership_id uuid not null,
  organization_id uuid not null references public.organizations (id),
  primary key (session_id, membership_id),
  foreign key (session_id, organization_id) references public.dojo_sessions (id, organization_id) on delete cascade,
  foreign key (membership_id, organization_id) references public.memberships (id, organization_id)
);
create index dojo_session_participants_member_idx on public.dojo_session_participants (membership_id);

create trigger set_updated_at before update on public.dojo_sessions
  for each row execute function public.set_updated_at();

-- L'auteur est l'utilisateur connecté, qui doit encadrer des commerciaux dans l'entreprise.
create or replace function public.guard_dojo_session()
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
    new.coach_user_id := (select auth.uid());
  else
    new.coach_user_id := old.coach_user_id;
  end if;
  return new;
end;
$$;

create trigger guard_dojo_session before insert or update on public.dojo_sessions
  for each row execute function public.guard_dojo_session();

create or replace function public.guard_dojo_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select role from public.memberships where id = new.membership_id) is distinct from 'sales_rep' then
    raise exception 'Seuls les commerciaux participent à une séance' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guard_dojo_participant before insert on public.dojo_session_participants
  for each row execute function public.guard_dojo_participant();

-- Lecture d'une séance : son auteur, ou qui voit l'un des participants (le commercial voit les siennes).
create or replace function public.can_view_dojo_session(session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.dojo_session_participants p
    where p.session_id = session and public.can_view_member(p.membership_id)
  );
$$;

revoke all on public.dojo_sessions, public.dojo_session_participants from anon, authenticated;
grant select, insert, delete on public.dojo_sessions to authenticated;
grant update (held_on, scenario, went_well, priority_axis, commitment) on public.dojo_sessions to authenticated;
grant select, insert, delete on public.dojo_session_participants to authenticated;
grant all on public.dojo_sessions, public.dojo_session_participants to service_role;
revoke execute on function public.can_view_dojo_session(uuid) from public, anon;
grant execute on function public.can_view_dojo_session(uuid) to authenticated, service_role;

alter table public.dojo_sessions enable row level security;
alter table public.dojo_session_participants enable row level security;

create policy dojo_sessions_select on public.dojo_sessions for select to authenticated
  using (coach_user_id = (select auth.uid()) or public.can_view_dojo_session(id));
create policy dojo_sessions_insert on public.dojo_sessions for insert to authenticated
  with check (public.my_role(organization_id) in ('manager', 'org_admin') or public.is_org_admin(organization_id));
create policy dojo_sessions_update on public.dojo_sessions for update to authenticated
  using (coach_user_id = (select auth.uid()) or public.is_org_admin(organization_id))
  with check (coach_user_id = (select auth.uid()) or public.is_org_admin(organization_id));
create policy dojo_sessions_delete on public.dojo_sessions for delete to authenticated
  using (coach_user_id = (select auth.uid()) or public.is_org_admin(organization_id));

create policy dojo_session_participants_select on public.dojo_session_participants for select to authenticated
  using (
    public.can_view_member(membership_id)
    or exists (select 1 from public.dojo_sessions s where s.id = session_id and s.coach_user_id = (select auth.uid()))
  );
create policy dojo_session_participants_insert on public.dojo_session_participants for insert to authenticated
  with check (
    public.can_manage_member(membership_id)
    and exists (select 1 from public.dojo_sessions s where s.id = session_id and s.coach_user_id = (select auth.uid()))
  );
create policy dojo_session_participants_delete on public.dojo_session_participants for delete to authenticated
  using (exists (
    select 1 from public.dojo_sessions s
    where s.id = session_id and (s.coach_user_id = (select auth.uid()) or public.is_org_admin(s.organization_id))
  ));
