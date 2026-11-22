-- Tests de l'étape 3 : évaluations, auto-évaluations, notes privées, dernière note et % de maîtrise.
begin;
create extension if not exists pgtap with schema extensions;

select plan(30);

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
                and name <> 'Accueil en moins de 20s' order by name limit 1));

-- 1. Le manager crée une évaluation de son commercial et la note.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ insert into public.evaluations (id, organization_id, subject_membership_id, framework_id, kind)
     values ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
             'a0000000-0000-0000-0000-0000000000a3', (select id from ids where name = 'framework'), 'manager')
     returning id $$,
  'un manager évalue un commercial de son équipe (et relit l''évaluation créée)');
select is((select author_membership_id from public.evaluations where id = 'e0000000-0000-0000-0000-000000000001'),
  'a0000000-0000-0000-0000-0000000000a2'::uuid, 'l''auteur est renseigné par la base');
select lives_ok(
  $$ insert into public.evaluation_scores (evaluation_id, skill_id, organization_id, score)
     values ('e0000000-0000-0000-0000-000000000001', (select id from ids where name = 'skill'), 'aaaaaaaa-0000-0000-0000-000000000000', 2),
            ('e0000000-0000-0000-0000-000000000001', (select id from ids where name = 'skill2'), 'aaaaaaaa-0000-0000-0000-000000000000', 3) $$,
  'le manager note son brouillon');
select throws_ok(
  $$ insert into public.evaluations (organization_id, subject_membership_id, framework_id, kind)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a3',
             (select id from ids where name = 'framework'), 'manager') $$,
  '23505', null, 'un seul brouillon manager à la fois par commercial');
select throws_ok(
  $$ insert into public.evaluations (organization_id, subject_membership_id, framework_id, kind)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a4',
             (select id from ids where name = 'framework'), 'manager') $$,
  '42501', null, 'un manager n''évalue pas un commercial d''une autre équipe');
select throws_ok(
  $$ insert into public.evaluations (organization_id, subject_membership_id, framework_id, kind)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a3',
             (select id from ids where name = 'framework'), 'self') $$,
  '42501', null, 'un manager ne fait pas l''auto-évaluation à la place du commercial');
select throws_ok(
  $$ insert into public.evaluations (organization_id, subject_membership_id, framework_id, kind)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a5',
             (select id from ids where name = 'framework'), 'manager') $$,
  null, null, 'seul un commercial peut être évalué');
select pg_temp.logout();

-- 2. Le commercial ne voit pas le brouillon du manager et ne peut pas le modifier.
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.evaluations where kind = 'manager'), 0,
  'le commercial ne voit pas le brouillon du manager');
select is((select count(*)::int from public.evaluation_scores), 0, 'ni ses notes');
update public.evaluation_scores set score = 4 where evaluation_id = 'e0000000-0000-0000-0000-000000000001';
select pg_temp.logout();
select is((select max(score)::int from public.evaluation_scores where evaluation_id = 'e0000000-0000-0000-0000-000000000001'), 3,
  'le commercial ne modifie pas l''évaluation du manager');

-- 3. Validation : datée, définitive pour le manager.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
update public.evaluations set status = 'validee' where id = 'e0000000-0000-0000-0000-000000000001';
select isnt((select validated_at from public.evaluations where id = 'e0000000-0000-0000-0000-000000000001'), null,
  'la validation est datée par la base');
update public.evaluation_scores set score = 0 where evaluation_id = 'e0000000-0000-0000-0000-000000000001';
select is((select min(score)::int from public.evaluation_scores where evaluation_id = 'e0000000-0000-0000-0000-000000000001'), 2,
  'le manager ne modifie plus une évaluation validée');
delete from public.evaluations where id = 'e0000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.evaluations where id = 'e0000000-0000-0000-0000-000000000001'), 1,
  'une évaluation validée ne se supprime pas');
select pg_temp.logout();

-- 4. Le commercial voit l'évaluation validée, fait son auto-évaluation.
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.evaluations where kind = 'manager'), 1,
  'le commercial voit l''évaluation du manager une fois validée');
select is((select count(*)::int from public.evaluation_scores), 2, 'avec ses notes');
select lives_ok(
  $$ insert into public.evaluations (id, organization_id, subject_membership_id, framework_id, kind)
     values ('e0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
             'a0000000-0000-0000-0000-0000000000a3', (select id from ids where name = 'framework'), 'self');
     insert into public.evaluation_scores (evaluation_id, skill_id, organization_id, score)
     values ('e0000000-0000-0000-0000-000000000002', (select id from ids where name = 'skill'), 'aaaaaaaa-0000-0000-0000-000000000000', 4) $$,
  'le commercial fait son auto-évaluation');
select throws_ok(
  $$ insert into public.evaluations (organization_id, subject_membership_id, framework_id, kind)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a3',
             (select id from ids where name = 'framework'), 'manager') $$,
  '42501', null, 'un commercial ne crée pas d''évaluation manager');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.evaluations where kind = 'self'), 0,
  'le manager ne voit pas l''auto-évaluation en cours');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
update public.evaluations set status = 'validee' where id = 'e0000000-0000-0000-0000-000000000002';
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.evaluations where kind = 'self'), 1,
  'le manager voit l''auto-évaluation une fois validée');

-- 5. Dernière note : l'auto-évaluation ne compte pas ; % de maîtrise.
select is((select score::int from public.v_latest_skill_scores where skill_id = (select id from ids where name = 'skill')), 2,
  'la dernière note vient de l''évaluation manager, pas de l''auto-évaluation');
select is(public.mastery_percent('a0000000-0000-0000-0000-0000000000a3'),
  round(100.0 / (select count(*) from public.skills where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'))::int,
  '% de maîtrise : une sous-compétence à 3 sur l''ensemble du référentiel');
select pg_temp.logout();

-- 6. Le responsable corrige une évaluation validée.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
update public.evaluation_scores set score = 3
  where evaluation_id = 'e0000000-0000-0000-0000-000000000001' and skill_id = (select id from ids where name = 'skill');
select pg_temp.logout();
select is((select score::int from public.evaluation_scores
  where evaluation_id = 'e0000000-0000-0000-0000-000000000001' and skill_id = (select id from ids where name = 'skill')), 3,
  'le responsable peut corriger une évaluation validée');

-- 7. Une sous-compétence notée ne se supprime plus.
select ok(public.is_skill_used((select id from ids where name = 'skill')), 'une sous-compétence notée est « utilisée »');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ delete from public.skills where id = (select id from ids where name = 'skill') $$,
  '23503', null, 'on ne supprime pas une sous-compétence déjà notée');
select pg_temp.logout();

-- 8. Notes privées : jamais pour le commercial ni pour un manager d'une autre équipe.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ insert into public.manager_notes (organization_id, subject_membership_id, body)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a3', 'Très bon contact client') $$,
  'le manager écrit une note privée');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.manager_notes), 0, 'le commercial ne lit jamais les notes privées');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select is((select count(*)::int from public.manager_notes), 0, 'un manager d''une autre équipe ne les lit pas');
select is((select count(*)::int from public.evaluations), 0, 'ni les évaluations');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.manager_notes), 1, 'le responsable les lit');
select pg_temp.logout();

-- 9. Cloisonnement entre entreprises.
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.evaluations) + (select count(*)::int from public.evaluation_scores)
  + (select count(*)::int from public.manager_notes) + (select count(*)::int from public.v_latest_skill_scores), 0,
  'l''entreprise B ne voit rien des évaluations de A');
select pg_temp.logout();

select * from finish();
rollback;
