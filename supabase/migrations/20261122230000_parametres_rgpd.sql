-- Étapes 6 et 7 — Paramètres d'entreprise appliqués par la base, RGPD (anonymisation, archivage, purge).

-- ---------------------------------------------------------------------------
-- Paramètres (§6.8)
-- ---------------------------------------------------------------------------

-- Lecture d'un interrupteur des paramètres d'une entreprise (vrai par défaut).
create or replace function public.org_setting_enabled(org uuid, key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (o.settings ->> key)::boolean from public.organizations o where o.id = org), true);
$$;
revoke execute on function public.org_setting_enabled(uuid, text) from public, anon;
grant execute on function public.org_setting_enabled(uuid, text) to authenticated, service_role;

-- L'auto-évaluation peut être désactivée par l'entreprise.
drop policy evaluations_insert on public.evaluations;
create policy evaluations_insert on public.evaluations for insert to authenticated
  with check (
    (kind = 'manager' and public.can_manage_member(subject_membership_id))
    or (
      kind = 'self'
      and public.is_my_membership(subject_membership_id)
      and public.org_setting_enabled(organization_id, 'allowSelfEvaluation')
    )
  );

-- Les demandes de coaching aussi.
drop policy coaching_requests_insert on public.coaching_requests;
create policy coaching_requests_insert on public.coaching_requests for insert to authenticated
  with check (
    public.is_my_membership(requester_membership_id)
    and public.org_setting_enabled(organization_id, 'allowCoachingRequests')
  );

-- ---------------------------------------------------------------------------
-- RGPD (§14)
-- ---------------------------------------------------------------------------

-- Date d'archivage : la purge définitive n'est possible que 30 jours après.
alter table public.organizations add column archived_at timestamptz;

create or replace function public.guard_organization_archive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'archive' and old.status is distinct from 'archive' then
    new.archived_at := now();
  elsif new.status <> 'archive' then
    new.archived_at := null;
  end if;
  return new;
end;
$$;
create trigger guard_organization_archive before update of status on public.organizations
  for each row execute function public.guard_organization_archive();

-- Anonymisation d'un utilisateur désactivé (§14) : nom, prénom et email remplacés,
-- les évaluations et coachings restent (données agrégées). Appelée par le serveur uniquement,
-- après contrôle des droits ; refusée si la personne a encore un accès actif quelque part.
create or replace function public.anonymize_profile(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.memberships where user_id = target and active) then
    raise exception 'Désactivez d''abord tous les accès de cette personne' using errcode = '23514';
  end if;
  if exists (select 1 from public.profiles where id = target and is_super_admin) then
    raise exception 'Un super admin ne peut pas être anonymisé' using errcode = '23514';
  end if;
  update public.profiles
    set first_name = 'Utilisateur',
        last_name = 'anonymisé',
        email = 'anonyme-' || target::text || '@anonyme.invalid',
        phone = null,
        avatar_url = null
    where id = target;
  update public.memberships set job_title = null, hired_at = null where user_id = target;
  delete from public.manager_notes where subject_membership_id in (select id from public.memberships where user_id = target);
end;
$$;
revoke execute on function public.anonymize_profile(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_profile(uuid) to service_role;

-- Purge définitive d'une entreprise archivée depuis au moins 30 jours (§14). Serveur uniquement.
-- Renvoie les utilisateurs qui n'ont plus aucun accès ailleurs (leur compte est supprimé ensuite).
create or replace function public.purge_organization(org uuid)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  users uuid[];
begin
  if not exists (
    select 1 from public.organizations
    where id = org and status = 'archive' and archived_at <= now() - interval '30 days'
  ) then
    raise exception 'L''entreprise doit être archivée depuis au moins 30 jours' using errcode = '23514';
  end if;

  select coalesce(array_agg(distinct m.user_id), '{}') into users
  from public.memberships m where m.organization_id = org;

  delete from public.dojo_session_participants where organization_id = org;
  delete from public.dojo_sessions where organization_id = org;
  delete from public.actions where organization_id = org;
  delete from public.coaching_observations where organization_id = org;
  delete from public.coaching_reports where organization_id = org;
  delete from public.coaching_skills where organization_id = org;
  delete from public.coachings where organization_id = org;
  delete from public.coaching_request_skills where organization_id = org;
  delete from public.coaching_requests where organization_id = org;
  delete from public.manager_notes where organization_id = org;
  delete from public.evaluation_scores where organization_id = org;
  delete from public.evaluations where organization_id = org;
  delete from public.dojos where organization_id = org;
  update public.skills set active = false where organization_id = org;
  delete from public.skills where organization_id = org;
  delete from public.competencies where organization_id = org;
  delete from public.blocks where organization_id = org;
  delete from public.frameworks where organization_id = org;
  delete from public.invitations where organization_id = org;
  delete from public.team_managers where organization_id = org;
  update public.memberships set team_id = null where organization_id = org;
  delete from public.teams where organization_id = org;
  delete from public.memberships where organization_id = org;
  delete from public.email_log where organization_id = org;
  -- Le journal garde la trace de la purge, sans rattachement à l'entreprise supprimée.
  update public.audit_log set organization_id = null where organization_id = org;
  delete from public.organizations where id = org;

  return query
    select u from unnest(users) as u
    where not exists (select 1 from public.memberships m where m.user_id = u)
      and not exists (select 1 from public.profiles p where p.id = u and p.is_super_admin);
end;
$$;
revoke execute on function public.purge_organization(uuid) from public, anon, authenticated;
grant execute on function public.purge_organization(uuid) to service_role;
