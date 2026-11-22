-- Tests de l'étape 5 : plan de progrès (actions).
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

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



-- Une action issue d'un coaching, créée par le manager.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ insert into public.actions (id, organization_id, subject_membership_id, title, source, skill_id, due_date)
     values ('ac000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
             'a0000000-0000-0000-0000-0000000000a3', 'Saluer en moins de 20 s', 'coaching',
             (select id from ids where name = 'skill'), current_date - 2) returning id $$,
  'le manager ajoute une action au plan de son commercial (et la relit)');
select throws_ok(
  $$ insert into public.actions (organization_id, subject_membership_id, title)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a4', 'Hors équipe') $$,
  '42501', null, 'pas d''action pour un commercial d''une autre équipe');
select pg_temp.logout();

-- Le commercial fait avancer son plan.
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
update public.actions set status = 'faite' where id = 'ac000000-0000-0000-0000-000000000001';
select isnt((select done_at from public.actions where id = 'ac000000-0000-0000-0000-000000000001'), null,
  'le commercial coche son action : la date de réalisation est posée');
update public.actions set status = 'a_faire' where id = 'ac000000-0000-0000-0000-000000000001';
select is((select done_at from public.actions where id = 'ac000000-0000-0000-0000-000000000001'), null,
  'et retirée s''il la rouvre');
select lives_ok(
  $$ insert into public.actions (id, organization_id, subject_membership_id, title)
     values ('ac000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
             'a0000000-0000-0000-0000-0000000000a3', 'Relire mes fiches produit') $$,
  'le commercial ajoute sa propre action');
select is((select created_by from public.actions where id = 'ac000000-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-0000000000a3'::uuid, 'l''auteur est renseigné par la base');
delete from public.actions where id = 'ac000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.actions where id = 'ac000000-0000-0000-0000-000000000001'), 1,
  'le commercial ne supprime pas une action issue d''un coaching');
delete from public.actions where id = 'ac000000-0000-0000-0000-000000000002';
select is((select count(*)::int from public.actions where id = 'ac000000-0000-0000-0000-000000000002'), 0,
  'mais il supprime ses propres ajouts');
select throws_ok(
  $$ insert into public.actions (organization_id, subject_membership_id, title)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a4', 'Pour un collègue') $$,
  '42501', null, 'le commercial n''écrit pas dans le plan d''un collègue');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.actions), 0, 'un autre commercial ne voit pas le plan');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select is((select count(*)::int from public.actions), 0, 'un manager d''une autre équipe non plus');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.actions), 0, 'ni une autre entreprise');
select pg_temp.logout();

select * from finish();
rollback;
