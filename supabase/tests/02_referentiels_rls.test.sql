-- Tests de l'étape 2a : modèles, copie dans une entreprise, droits sur le référentiel.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'rep.a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local');
insert into public.profiles (id, email, first_name, last_name, is_super_admin) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local', 'Super', 'Admin', true),
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local', 'Claire', 'Martin', false),
  ('00000000-0000-0000-0000-0000000000a3', 'rep.a@test.local', 'Léo', 'Bernard', false),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local', 'Paul', 'Durand', false);
insert into public.organizations (id, name, slug) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Entreprise A', 'entreprise-a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Entreprise B', 'entreprise-b');
insert into public.teams (id, organization_id, name) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', 'Équipe A1');
insert into public.memberships (organization_id, user_id, role, team_id) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'org_admin', null),
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'sales_rep', 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('bbbbbbbb-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1', 'org_admin', null);

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

-- Les deux modèles fournis existent et sont publiés.
select is((select count(*)::int from public.framework_templates where published), 2, 'deux modèles publiés sont fournis');
select is(
  (select count(*)::int from public.template_skills ts
     join public.template_competencies tc on tc.id = ts.competency_id
     join public.template_blocks tb on tb.id = tc.block_id
     join public.framework_templates t on t.id = tb.template_id
   where t.name = 'Vente automobile'),
  40, 'le modèle automobile reprend les 40 sous-compétences du kit');

-- Un responsable ne voit pas les modèles et ne peut pas les copier.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.framework_templates), 0, 'un responsable ne voit pas les modèles');
select throws_ok(
  $$ select public.copy_template_to_organization(
       (select id from public.framework_templates where name = 'Vente automobile'),
       'aaaaaaaa-0000-0000-0000-000000000000') $$,
  '42501', null, 'un responsable ne peut pas copier un modèle');
select pg_temp.logout();

-- Le super admin copie le modèle dans l'entreprise A.
select pg_temp.login('00000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ select public.copy_template_to_organization(
       (select id from public.framework_templates where name = 'Vente automobile'),
       'aaaaaaaa-0000-0000-0000-000000000000') $$,
  'le super admin copie un modèle dans une entreprise');
select throws_ok(
  $$ select public.copy_template_to_organization(
       (select id from public.framework_templates where name = 'Vente — socle général'),
       'aaaaaaaa-0000-0000-0000-000000000000') $$,
  '23505', null, 'une entreprise n''a qu''un référentiel actif');
select pg_temp.logout();

select is((select count(*)::int from public.blocks where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 2, 'la copie contient les 2 blocs');
select is((select count(*)::int from public.competencies where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 12, 'la copie contient les 12 compétences');
select is((select count(*)::int from public.skills where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 40, 'la copie contient les 40 sous-compétences');

-- Modifier la copie ne touche pas le modèle.
update public.skills set name = 'Accueil express'
  where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000' and name = 'Accueil en moins de 20s';
select is((select count(*)::int from public.template_skills where name = 'Accueil en moins de 20s'), 1,
  'modifier la matrice d''un client ne change pas le modèle');

-- Le commercial lit la matrice de son entreprise mais ne la modifie pas.
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.skills), 40, 'le commercial lit les sous-compétences de son entreprise');
update public.skills set name = 'Pirate' where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000';
delete from public.skills where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000';
select pg_temp.logout();
select is((select count(*)::int from public.skills where name = 'Pirate'), 0, 'le commercial ne peut pas modifier la matrice');
select is((select count(*)::int from public.skills where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 40,
  'le commercial ne peut pas supprimer de sous-compétence');

-- L'entreprise B ne voit rien de A et ne peut rien y écrire.
create temporary table framework_a as
  select id from public.frameworks where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000';
grant select on framework_a to authenticated;
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.skills where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 0,
  'une autre entreprise ne voit pas la matrice de A');
select throws_ok(
  $$ insert into public.blocks (organization_id, framework_id, name)
     select 'aaaaaaaa-0000-0000-0000-000000000000', id, 'Pirate' from framework_a $$,
  '42501', null, 'une autre entreprise ne peut pas ajouter de bloc chez A');
select pg_temp.logout();

-- Le responsable de A adapte sa matrice.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$ insert into public.skills (organization_id, competency_id, name, position)
     select organization_id, id, 'Prise de rendez-vous atelier', 99 from public.competencies where name = 'Accueil' $$,
  'le responsable ajoute une sous-compétence');
select lives_ok(
  $$ update public.skills set active = false where name = 'Utilisation de la boisson' $$,
  'le responsable désactive une sous-compétence');
select lives_ok(
  $$ delete from public.skills where name = 'Prise de rendez-vous atelier' $$,
  'le responsable supprime une sous-compétence jamais utilisée');
select pg_temp.logout();
select is((select active from public.skills where name = 'Utilisation de la boisson'), false, 'la désactivation est enregistrée');

-- Intégrité : une compétence de A ne peut pas être rattachée à un bloc de B.
insert into public.frameworks (id, organization_id, name) values
  ('bbbbbbbb-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-000000000000', 'Référentiel B');
insert into public.blocks (id, organization_id, framework_id, name) values
  ('bbbbbbbb-0000-0000-0000-0000000000b0', 'bbbbbbbb-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-0000000000f1', 'Bloc B');
select throws_ok(
  $$ insert into public.competencies (organization_id, block_id, name)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-0000000000b0', 'Mélange') $$,
  '23503', null, 'une compétence ne peut pas être rattachée au bloc d''une autre entreprise');

select * from finish();
rollback;
