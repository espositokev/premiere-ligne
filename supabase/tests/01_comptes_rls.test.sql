-- Tests de sécurité de l'étape 1 (SPEC §8.4) : isolation entre entreprises,
-- visibilité par rôle, écritures interdites.
begin;
create extension if not exists pgtap with schema extensions;

select plan(38);

-- ---------------------------------------------------------------------------
-- Jeu de données (en tant que postgres, la RLS ne s'applique pas)
-- ---------------------------------------------------------------------------
-- Utilisateurs
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'manager.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'rep1.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'rep2.a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'rep.b@test.local');

insert into public.profiles (id, email, first_name, last_name, is_super_admin) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local', 'Super', 'Admin', true),
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local', 'Claire', 'Martin', false),
  ('00000000-0000-0000-0000-0000000000a2', 'manager.a@test.local', 'Julien', 'Petit', false),
  ('00000000-0000-0000-0000-0000000000a3', 'rep1.a@test.local', 'Léo', 'Bernard', false),
  ('00000000-0000-0000-0000-0000000000a4', 'rep2.a@test.local', 'Inès', 'Moreau', false),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local', 'Paul', 'Durand', false),
  ('00000000-0000-0000-0000-0000000000b2', 'rep.b@test.local', 'Nora', 'Lefèvre', false);

insert into public.organizations (id, name, slug) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Entreprise A', 'entreprise-a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Entreprise B', 'entreprise-b');

insert into public.teams (id, organization_id, name) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', 'Équipe A1'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-000000000000', 'Équipe A2'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'Équipe B1');

insert into public.memberships (id, organization_id, user_id, role, team_id) values
  ('10000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'org_admin', null),
  ('10000000-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'manager', null),
  ('10000000-0000-0000-0000-0000000000a3', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'sales_rep', 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-0000000000a4', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a4', 'sales_rep', 'aaaaaaaa-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1', 'org_admin', null),
  ('10000000-0000-0000-0000-0000000000b2', 'bbbbbbbb-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b2', 'sales_rep', 'bbbbbbbb-0000-0000-0000-0000000000b1');

insert into public.team_managers (team_id, membership_id, organization_id) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-000000000000');

insert into public.invitations (organization_id, email, first_name, last_name, role, team_id, token_hash, expires_at) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'nouveau.a@test.local', 'Nouveau', 'A', 'sales_rep', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'hash-a', now() + interval '7 days'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'nouveau.b@test.local', 'Nouveau', 'B', 'sales_rep', 'bbbbbbbb-0000-0000-0000-0000000000b1', 'hash-b', now() + interval '7 days');

insert into public.audit_log (organization_id, action) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'test.a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'test.b');

-- Bascule sur un utilisateur connecté (comme le ferait l'API Supabase avec son JWT).
create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Anonyme : rien
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok($$ select count(*) from public.organizations $$, '42501', null,
  'anon ne peut pas lire les entreprises');
select throws_ok($$ select count(*) from public.profiles $$, '42501', null,
  'anon ne peut pas lire les profils');
reset role;

-- ---------------------------------------------------------------------------
-- org_admin de A : voit tout A, rien de B
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.organizations), 1, 'admin A voit une seule entreprise');
select is((select count(*)::int from public.organizations where slug = 'entreprise-b'), 0, 'admin A ne voit pas B');
select is((select count(*)::int from public.memberships), 4, 'admin A voit les 4 membres de A');
select is((select count(*)::int from public.teams), 2, 'admin A voit les 2 équipes de A');
select is((select count(*)::int from public.invitations), 1, 'admin A voit seulement les invitations de A');
select is((select count(*)::int from public.audit_log), 1, 'admin A voit seulement le journal de A');
select is((select count(*)::int from public.profiles where email like '%.b@test.local'), 0, 'admin A ne voit aucun profil de B');
select is((select count(*)::int from public.email_log), 0, 'admin A ne voit pas le journal des emails');
select throws_ok(
  $$ update public.organizations set status = 'suspendu' where slug = 'entreprise-a' $$,
  '42501', null, 'admin A ne peut pas changer le statut de son entreprise');
select lives_ok(
  $$ update public.organizations set settings = '{"no_coaching_days": 30}' where slug = 'entreprise-a' $$,
  'admin A peut modifier les paramètres de son entreprise');
update public.memberships set active = false where id = '10000000-0000-0000-0000-0000000000b2';
select pg_temp.logout();
select ok((select active from public.memberships where id = '10000000-0000-0000-0000-0000000000b2'),
  'admin A ne peut pas désactiver un membre de B');

-- ---------------------------------------------------------------------------
-- Manager de A (équipe A1 seulement)
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.memberships), 2, 'le manager voit lui-même et son commercial');
select is((select count(*)::int from public.memberships where id = '10000000-0000-0000-0000-0000000000a4'), 0,
  'le manager ne voit pas le commercial d''une équipe qu''il ne manage pas');
select is((select count(*)::int from public.profiles where email = 'rep2.a@test.local'), 0,
  'le manager ne voit pas le profil du commercial de l''autre équipe');
select lives_ok(
  $$ insert into public.invitations (organization_id, email, first_name, last_name, role, team_id, token_hash, expires_at, invited_by)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'recrue@test.local', 'Re', 'Crue', 'sales_rep',
             'aaaaaaaa-0000-0000-0000-0000000000a1', 'hash-m1', now() + interval '7 days', '00000000-0000-0000-0000-0000000000a2') $$,
  'le manager peut inviter un commercial dans son équipe');
select throws_ok(
  $$ insert into public.invitations (organization_id, email, first_name, last_name, role, team_id, token_hash, expires_at, invited_by)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'autre@test.local', 'Au', 'Tre', 'sales_rep',
             'aaaaaaaa-0000-0000-0000-0000000000a2', 'hash-m2', now() + interval '7 days', '00000000-0000-0000-0000-0000000000a2') $$,
  '42501', null, 'le manager ne peut pas inviter dans une équipe qu''il ne manage pas');
select throws_ok(
  $$ insert into public.invitations (organization_id, email, first_name, last_name, role, token_hash, expires_at, invited_by)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'chef@test.local', 'Ch', 'Ef', 'manager',
             'hash-m3', now() + interval '7 days', '00000000-0000-0000-0000-0000000000a2') $$,
  '42501', null, 'le manager ne peut pas inviter un manager');
select throws_ok(
  $$ insert into public.teams (organization_id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Pirate') $$,
  '42501', null, 'le manager ne peut pas créer d''équipe');
select is((select count(*)::int from public.audit_log), 0, 'le manager ne lit pas le journal');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- Commercial de A
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.memberships), 1, 'le commercial ne voit que sa propre appartenance');
select is((select count(*)::int from public.profiles), 2, 'le commercial voit son profil et celui de son manager');
select is((select count(*)::int from public.invitations), 0, 'le commercial ne voit aucune invitation');
select throws_ok(
  $$ update public.profiles set is_super_admin = true where id = '00000000-0000-0000-0000-0000000000a3' $$,
  '42501', null, 'le commercial ne peut pas se donner le rôle super admin');
update public.memberships set role = 'org_admin' where id = '10000000-0000-0000-0000-0000000000a3';
select lives_ok(
  $$ update public.profiles set phone = '0600000000' where id = '00000000-0000-0000-0000-0000000000a3' $$,
  'le commercial peut modifier son téléphone');
update public.profiles set first_name = 'Pirate' where id = '00000000-0000-0000-0000-0000000000a2';
select pg_temp.logout();
select is((select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'), 'Julien',
  'le commercial ne peut pas modifier le profil de son manager');
select is((select role from public.memberships where id = '10000000-0000-0000-0000-0000000000a3'), 'sales_rep',
  'le commercial ne peut pas changer son rôle');

-- ---------------------------------------------------------------------------
-- Entreprise B et super admin
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::int from public.organizations where slug = 'entreprise-a'), 0, 'le commercial B ne voit pas A');
select is((select count(*)::int from public.teams where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 0,
  'le commercial B ne voit pas les équipes de A');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.organizations), 2, 'le super admin voit toutes les entreprises');
select is((select count(*)::int from public.memberships), 6, 'le super admin voit tous les membres');
select lives_ok(
  $$ update public.organizations set status = 'suspendu' where slug = 'entreprise-a' $$,
  'le super admin peut suspendre une entreprise');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- Entreprise suspendue, membre désactivé
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.organizations), 0, 'une entreprise suspendue n''est plus accessible à ses membres');
select is((select count(*)::int from public.memberships), 0, 'les membres d''une entreprise suspendue ne voient plus rien');
select pg_temp.logout();

update public.organizations set status = 'actif' where slug = 'entreprise-a';
update public.memberships set active = false where id = '10000000-0000-0000-0000-0000000000a2';
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.memberships), 0, 'un manager désactivé ne voit plus rien');
select is((select count(*)::int from public.organizations), 0, 'un manager désactivé ne voit plus son entreprise');
select pg_temp.logout();

-- Intégrité : une appartenance ne peut pas pointer vers une équipe d'une autre entreprise.
select throws_ok(
  $$ update public.memberships set team_id = 'bbbbbbbb-0000-0000-0000-0000000000b1' where id = '10000000-0000-0000-0000-0000000000a3' $$,
  '23503', null, 'un commercial de A ne peut pas être rattaché à une équipe de B');

select * from finish();
rollback;
