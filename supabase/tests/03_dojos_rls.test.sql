-- Tests de l'étape 2b : bibliothèque, copie chez le client, droits sur les Dojos.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'manager.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a5', 'manager2.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'rep.a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local');
insert into public.profiles (id, email, first_name, last_name, is_super_admin) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local', 'Super', 'Admin', true),
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local', 'Claire', 'Martin', false),
  ('00000000-0000-0000-0000-0000000000a2', 'manager.a@test.local', 'Julien', 'Petit', false),
  ('00000000-0000-0000-0000-0000000000a5', 'manager2.a@test.local', 'Sarah', 'Leroy', false),
  ('00000000-0000-0000-0000-0000000000a3', 'rep.a@test.local', 'Léo', 'Bernard', false),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local', 'Paul', 'Durand', false);
insert into public.organizations (id, name, slug) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Entreprise A', 'entreprise-a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Entreprise B', 'entreprise-b');
insert into public.teams (id, organization_id, name) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', 'Équipe A1');
insert into public.memberships (organization_id, user_id, role, team_id) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'org_admin', null),
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'manager', null),
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a5', 'manager', null),
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

select is((select count(*)::int from public.library_dojos), 42, 'la bibliothèque contient les 42 Dojos du kit');

-- Copie des modèles : la matrice arrive avec ses Dojos.
select public.copy_template_to_organization(
  (select id from public.framework_templates where name = 'Vente automobile'), 'aaaaaaaa-0000-0000-0000-000000000000');
select public.copy_template_to_organization(
  (select id from public.framework_templates where name = 'Vente — socle général'), 'bbbbbbbb-0000-0000-0000-000000000000');
select is((select count(*)::int from public.dojos where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 42,
  'le modèle automobile apporte les 42 Dojos');
select ok((select count(*)::int from public.dojos where organization_id = 'bbbbbbbb-0000-0000-0000-000000000000') between 15 and 30,
  'le socle général apporte les Dojos non spécifiques à l''automobile');
select is((select count(*)::int from public.dojos where status <> 'valide' or source <> 'bibliotheque'), 0,
  'les Dojos copiés sont validés et marqués « bibliothèque »');

-- Le manager crée un Dojo, un autre manager ne peut pas le modifier.
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ insert into public.dojos (organization_id, skill_id, title, content, created_by, source)
     select organization_id, id, 'Accueil au téléphone', '{"version":1}'::jsonb, '00000000-0000-0000-0000-0000000000a2', 'manuel'
     from public.skills where name = 'Accueil en moins de 20s' $$,
  'un manager crée un Dojo');
select is((select count(*)::int from public.dojos), 43, 'le manager voit tous les Dojos de l''entreprise');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
update public.dojos set title = 'Pirate' where title = 'Accueil au téléphone';
update public.dojos set title = 'Pirate' where source = 'bibliotheque';
select pg_temp.logout();
select is((select count(*)::int from public.dojos where title = 'Pirate'), 0,
  'un manager ne modifie ni le Dojo d''un autre ni ceux de la bibliothèque');

-- Le commercial ne voit que les Dojos validés et n'en crée pas.
select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.dojos where status = 'brouillon'), 0, 'le commercial ne voit pas les brouillons');
select is((select count(*)::int from public.dojos), 42, 'le commercial voit les Dojos validés');
select throws_ok(
  $$ insert into public.dojos (organization_id, skill_id, title, content, created_by)
     select organization_id, id, 'Pirate', '{}'::jsonb, '00000000-0000-0000-0000-0000000000a3'
     from public.skills where name = 'Accueil en moins de 20s' $$,
  '42501', null, 'un commercial ne crée pas de Dojo');
select pg_temp.logout();

-- Le responsable peut tout modifier ; l'entreprise B ne voit rien de A.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$ update public.dojos set status = 'a_tester' where title = 'Accueil au téléphone' $$,
  'le responsable modifie le statut d''un Dojo');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.dojos where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 0,
  'une autre entreprise ne voit pas les Dojos de A');
select is((select count(*)::int from public.library_dojos), 0, 'un client ne lit pas la bibliothèque globale');
select pg_temp.logout();

-- Supprimer une sous-compétence jamais utilisée retire ses Dojos.
delete from public.skills where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000' and name = 'Utilisation de la boisson';
select is((select count(*)::int from public.dojos where organization_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 42,
  'les Dojos d''une sous-compétence supprimée sont retirés');

select * from finish();
rollback;
