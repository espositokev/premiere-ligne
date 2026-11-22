-- Tests des étapes 6 et 7 : paramètres d'entreprise, anonymisation, purge.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

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



-- Paramètres : l'entreprise coupe l'auto-évaluation et les demandes.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
update public.organizations set settings = '{"allowSelfEvaluation": false, "allowCoachingRequests": false}'
  where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
  $$ insert into public.evaluations (organization_id, subject_membership_id, framework_id, kind)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a3',
             (select id from ids where name = 'framework'), 'self') $$,
  '42501', null, 'auto-évaluation refusée quand l''entreprise l''a désactivée');
select throws_ok(
  $$ insert into public.coaching_requests (organization_id, requester_membership_id)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a3') $$,
  '42501', null, 'demande de coaching refusée quand l''entreprise l''a désactivée');
update public.organizations set settings = '{}' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select pg_temp.logout();
select is((select settings ->> 'allowSelfEvaluation' from public.organizations where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'false', 'un commercial ne modifie pas les paramètres');

-- Les fonctions RGPD ne sont pas accessibles aux utilisateurs.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select public.anonymize_profile('00000000-0000-0000-0000-0000000000a3') $$,
  '42501', null, 'l''anonymisation passe uniquement par le serveur');
select throws_ok($$ select public.purge_organization('aaaaaaaa-0000-0000-0000-000000000000') $$,
  '42501', null, 'la purge passe uniquement par le serveur');
select pg_temp.logout();

-- Anonymisation : refusée tant que l'accès est actif, puis efface l'identité.
select throws_ok($$ select public.anonymize_profile('00000000-0000-0000-0000-0000000000a3') $$,
  '23514', null, 'on n''anonymise pas une personne encore active');
update public.memberships set active = false where id = 'a0000000-0000-0000-0000-0000000000a3';
insert into public.manager_notes (organization_id, subject_membership_id, author_user_id, body)
  values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a2', 'Note');
select lives_ok($$ select public.anonymize_profile('00000000-0000-0000-0000-0000000000a3') $$, 'anonymisation');
select is((select first_name || ' ' || last_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  'Utilisateur anonymisé', 'le nom est remplacé');
select is((select count(*)::int from public.manager_notes where subject_membership_id = 'a0000000-0000-0000-0000-0000000000a3'), 0,
  'les notes privées sont supprimées');

-- Purge : seulement 30 jours après l'archivage.
update public.organizations set status = 'archive' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select throws_ok($$ select public.purge_organization('aaaaaaaa-0000-0000-0000-000000000000') $$,
  '23514', null, 'pas de purge avant 30 jours d''archivage');
update public.organizations set archived_at = now() - interval '31 days' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select set_eq(
  $$ select * from public.purge_organization('aaaaaaaa-0000-0000-0000-000000000000') $$,
  $$ values ('00000000-0000-0000-0000-0000000000a1'::uuid), ('00000000-0000-0000-0000-0000000000a2'::uuid),
            ('00000000-0000-0000-0000-0000000000a5'::uuid), ('00000000-0000-0000-0000-0000000000a3'::uuid),
            ('00000000-0000-0000-0000-0000000000a4'::uuid) $$,
  'la purge efface l''entreprise et rend les comptes sans autre accès');

select * from finish();
rollback;
