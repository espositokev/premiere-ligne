-- Tests de l'étape 4 : coachings, comptes rendus, demandes de coaching, actions.
begin;
create extension if not exists pgtap with schema extensions;

select plan(34);

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


-- 1. Le manager planifie un coaching (passé) pour son commercial, avec 1 à 3 compétences.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ insert into public.coachings (id, organization_id, subject_membership_id, scheduled_at, objective)
     values ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
             'a0000000-0000-0000-0000-0000000000a3', now() - interval '3 days', 'Travailler l''accueil')
     returning id $$,
  'un manager planifie un coaching pour son commercial (et le relit)');
select is((select coach_membership_id from public.coachings where id = 'c0000000-0000-0000-0000-000000000001'),
  'a0000000-0000-0000-0000-0000000000a2'::uuid, 'le coach est renseigné par la base');
select throws_ok(
  $$ insert into public.coachings (organization_id, subject_membership_id, scheduled_at)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a4', now()) $$,
  '42501', null, 'pas de coaching pour un commercial d''une autre équipe');
select lives_ok(
  $$ insert into public.coaching_skills (coaching_id, skill_id, organization_id)
     select 'c0000000-0000-0000-0000-000000000001', id, 'aaaaaaaa-0000-0000-0000-000000000000'
     from ids where name in ('skill', 'skill2', 'skill3') $$,
  'trois compétences ciblées');
select throws_ok(
  $$ insert into public.coaching_skills (coaching_id, skill_id, organization_id)
     values ('c0000000-0000-0000-0000-000000000001', (select id from ids where name = 'skill4'), 'aaaaaaaa-0000-0000-0000-000000000000') $$,
  '23514', null, 'pas plus de trois compétences');
select lives_ok(
  $$ insert into public.coaching_reports (coaching_id, organization_id, context, strengths)
     values ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Samedi chargé', 'Sourire');
     insert into public.coaching_observations (coaching_id, skill_id, organization_id, score)
     values ('c0000000-0000-0000-0000-000000000001', (select id from ids where name = 'skill'), 'aaaaaaaa-0000-0000-0000-000000000000', 3) $$,
  'le manager rédige le compte rendu');
select throws_ok(
  $$ insert into public.coaching_observations (coaching_id, skill_id, organization_id, score)
     values ('c0000000-0000-0000-0000-000000000001', (select id from ids where name = 'skill4'), 'aaaaaaaa-0000-0000-0000-000000000000', 2) $$,
  '23514', null, 'une observation ne vise qu''une compétence ciblée');
select pg_temp.logout();

-- 2. Avant la clôture, le commercial voit le coaching mais pas le compte rendu.
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.coachings), 1, 'le commercial voit son coaching planifié');
select is((select count(*)::int from public.coaching_skills), 3, 'et les compétences ciblées');
select is((select count(*)::int from public.coaching_reports) + (select count(*)::int from public.coaching_observations), 0,
  'mais pas le compte rendu en cours');
update public.coachings set objective = 'Autre chose' where id = 'c0000000-0000-0000-0000-000000000001';
select pg_temp.logout();
select is((select objective from public.coachings where id = 'c0000000-0000-0000-0000-000000000001'), 'Travailler l''accueil',
  'le commercial ne modifie pas le coaching');

-- 3. Clôture.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
update public.coachings set status = 'cloture' where id = 'c0000000-0000-0000-0000-000000000001';
select isnt((select closed_at from public.coachings where id = 'c0000000-0000-0000-0000-000000000001'), null,
  'la clôture est datée par la base');
update public.coaching_reports set strengths = 'Modifié' where coaching_id = 'c0000000-0000-0000-0000-000000000001';
select is((select strengths from public.coaching_reports where coaching_id = 'c0000000-0000-0000-0000-000000000001'), 'Sourire',
  'un compte rendu clôturé ne se modifie plus');
select throws_ok(
  $$ update public.coachings set status = 'planifie', reopen_reason = 'Oubli' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'un manager ne rouvre pas un compte rendu');
select throws_ok(
  $$ update public.coachings set rep_comment = 'Je suis d''accord' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'le manager n''écrit pas le commentaire du commercial');
select lives_ok(
  $$ insert into public.coachings (id, organization_id, subject_membership_id, scheduled_at)
     values ('c0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
             'a0000000-0000-0000-0000-0000000000a3', now() + interval '2 days') $$,
  'un deuxième coaching, à venir');
select throws_ok(
  $$ update public.coachings set status = 'cloture' where id = 'c0000000-0000-0000-0000-000000000002' $$,
  '23514', null, 'on ne clôture pas un coaching qui n''a pas eu lieu');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.coaching_reports), 1, 'le commercial lit le compte rendu clôturé');
select is((select score::int from public.coaching_observations), 3, 'et les observations');
select lives_ok(
  $$ update public.coachings set rep_comment = 'Merci, je vais travailler ça' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  'le commercial ajoute son commentaire');
select throws_ok(
  $$ update public.coachings set objective = 'Autre' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'mais rien d''autre');
select pg_temp.logout();

-- 4. Réouverture par le responsable, avec motif.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ update public.coachings set status = 'planifie' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'le motif de réouverture est obligatoire');
select lives_ok(
  $$ update public.coachings set status = 'planifie', reopen_reason = 'Erreur de note' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  'le responsable rouvre le compte rendu');
select pg_temp.logout();

-- 5. Annulation : le commercial ne voit plus le coaching.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
update public.coachings set status = 'annule', cancel_reason = 'Client absent' where id = 'c0000000-0000-0000-0000-000000000002';
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.coachings where id = 'c0000000-0000-0000-0000-000000000002'), 0,
  'un coaching annulé disparaît pour le commercial');

-- 6. Demande de coaching.
select lives_ok(
  $$ insert into public.coaching_requests (id, organization_id, requester_membership_id, message)
     values ('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
             'a0000000-0000-0000-0000-0000000000a3', 'Je bloque sur les objections') returning id $$,
  'le commercial demande un coaching');
select throws_ok(
  $$ update public.coaching_requests set status = 'acceptee' where id = 'd0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'le commercial ne répond pas à sa propre demande');
select lives_ok(
  $$ insert into public.actions (organization_id, subject_membership_id, title, status)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000a3', 'Relire la fiche objections', 'faite') $$,
  'le commercial crée une action dans son plan de progrès');
select isnt((select done_at from public.actions limit 1), null, 'la date de réalisation est tenue par la base');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
select is((select count(*)::int from public.coaching_requests) + (select count(*)::int from public.coachings)
  + (select count(*)::int from public.actions), 0, 'un manager d''une autre équipe ne voit rien');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
update public.coaching_requests set status = 'acceptee', answer = 'On voit ça jeudi' where id = 'd0000000-0000-0000-0000-000000000001';
select is((select answered_by from public.coaching_requests where id = 'd0000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-0000000000a2'::uuid, 'le manager répond à la demande');
select is((select count(*)::int from public.actions), 1, 'le manager voit le plan de progrès');
select pg_temp.logout();

-- 7. Sous-compétence utilisée, cloisonnement.
select ok(public.is_skill_used((select id from ids where name = 'skill3')), 'une compétence ciblée est « utilisée »');
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.coachings) + (select count(*)::int from public.coaching_requests)
  + (select count(*)::int from public.actions) + (select count(*)::int from public.coaching_reports), 0,
  'l''entreprise B ne voit rien des coachings de A');
select pg_temp.logout();

select * from finish();
rollback;
