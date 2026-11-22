-- Les managers font évoluer la matrice de leur entreprise.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

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



insert into ids values ('competency', (select competency_id from public.skills where id = (select id from ids where name = 'skill')));

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ insert into public.skills (organization_id, competency_id, name, position)
     values ('aaaaaaaa-0000-0000-0000-000000000000', (select id from ids where name = 'competency'), 'Accueil téléphonique', 99) $$,
  'un manager ajoute une sous-compétence');
update public.skills set name = 'Accueil en moins de 15s' where id = (select id from ids where name = 'skill');
select is((select name from public.skills where id = (select id from ids where name = 'skill')), 'Accueil en moins de 15s',
  'un manager renomme une sous-compétence');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
  $$ insert into public.skills (organization_id, competency_id, name, position)
     values ('aaaaaaaa-0000-0000-0000-000000000000', (select id from ids where name = 'competency'), 'Par un commercial', 100) $$,
  '42501', null, 'un commercial ne modifie pas la matrice');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
update public.skills set name = 'Piraté' where id = (select id from ids where name = 'skill');
select pg_temp.logout();
select is((select name from public.skills where id = (select id from ids where name = 'skill')), 'Accueil en moins de 15s',
  'une autre entreprise ne la modifie pas');

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select throws_ok(
  $$ insert into public.frameworks (organization_id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Autre') $$,
  '42501', null, 'mettre en place une matrice reste réservé au responsable');
select pg_temp.logout();

select * from finish();
rollback;
