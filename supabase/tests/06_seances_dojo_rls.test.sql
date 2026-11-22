-- Tests de l'étape 4 : séances de Dojo.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'manager.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a5', 'manager2.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'rep.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'rep2.a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local');
insert into public.profiles (id, email, first_name, last_name, is_super_admin) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local', 'Super', 'Admin', true),
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local', 'Claire', 'Martin', false),
  ('00000000-0000-0000-0000-0000000000a2', 'manager.a@test.local', 'Julien', 'Petit', false),
  ('00000000-0000-0000-0000-0000000000a5', 'manager2.a@test.local', 'Sarah', 'Leroy', false),
  ('00000000-0000-0000-0000-0000000000a3', 'rep.a@test.local', 'Léo', 'Bernard', false),
  ('00000000-0000-0000-0000-0000000000a4', 'rep2.a@test.local', 'Inès', 'Robert', false),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local', 'Paul', 'Durand', false);
insert into public.organizations (id, name, slug) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Entreprise A', 'entreprise-a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Entreprise B', 'entreprise-b');
insert into public.teams (id, organization_id, name) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', 'Équipe A1'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-000000000000', 'Équipe A2');
insert into public.memberships (id, organization_id, user_id, role, team_id) values
  ('a0000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'org_admin', null),
  ('a0000000-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'manager', null),
  ('a0000000-0000-0000-0000-0000000000a5', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a5', 'manager', null),
  ('a0000000-0000-0000-0000-0000000000a3', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'sales_rep', 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('a0000000-0000-0000-0000-0000000000a4', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a4', 'sales_rep', 'aaaaaaaa-0000-0000-0000-0000000000a2'),
  ('b0000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1', 'org_admin', null);
insert into public.team_managers (team_id, membership_id, organization_id) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-000000000000');

select public.copy_template_to_organization(
  (select id from public.framework_templates where name = 'Vente automobile'), 'aaaaaaaa-0000-0000-0000-000000000000');

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

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids values
  ('framework', (select id from public.frameworks where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000')),
  ('skill', (select id from public.skills where name = 'Accueil en moins de 20s')),
  ('skill2', (select id from public.skills where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'
                and name <> 'Accueil en moins de 20s' order by name limit 1)),
  ('skill3', (select id from public.skills where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'
                and name <> 'Accueil en moins de 20s' order by name offset 1 limit 1)),
  ('skill4', (select id from public.skills where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'
                and name <> 'Accueil en moins de 20s' order by name offset 2 limit 1));



insert into ids values ('dojo', (select id from public.dojos where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000' limit 1));

-- Le manager note une séance avec son commercial.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ insert into public.dojo_sessions (id, organization_id, dojo_id, scenario, commitment)
     values ('5e000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
             (select id from ids where name = 'dojo'), 2, 'Saluer chaque client') returning id $$,
  'un manager note une séance de Dojo (et la relit)');
select lives_ok(
  $$ insert into public.dojo_session_participants (session_id, membership_id, organization_id)
     values ('5e000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-0000000000a3', 'aaaaaaaa-0000-0000-0000-000000000000') $$,
  'avec son commercial');
select throws_ok(
  $$ insert into public.dojo_session_participants (session_id, membership_id, organization_id)
     values ('5e000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-0000000000a4', 'aaaaaaaa-0000-0000-0000-000000000000') $$,
  '42501', null, 'pas un commercial d''une autre équipe');
select pg_temp.logout();

-- Le commercial voit sa séance, ne peut pas en créer.
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.dojo_sessions), 1, 'le commercial voit la séance à laquelle il a participé');
select throws_ok(
  $$ insert into public.dojo_sessions (organization_id, dojo_id)
     values ('aaaaaaaa-0000-0000-0000-000000000000', (select id from ids where name = 'dojo')) $$,
  '42501', null, 'un commercial ne note pas de séance');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.dojo_sessions), 0, 'un autre commercial ne la voit pas');
select pg_temp.logout();

-- Un Dojo qui a servi ne se supprime plus.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ delete from public.dojos where id = (select id from ids where name = 'dojo') $$,
  '23503', null, 'un Dojo joué ne se supprime pas (on l''archive)');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.dojo_sessions) + (select count(*)::int from public.dojo_session_participants), 0,
  'l''entreprise B ne voit rien');
select pg_temp.logout();

select * from finish();
rollback;
