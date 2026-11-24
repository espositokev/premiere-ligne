-- Options IA : activation réservée au super admin, usage compté par entreprise.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'manager.a@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'rep.a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local');
insert into public.profiles (id, email, first_name, last_name, is_super_admin) values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local', 'Super', 'Admin', true),
  ('00000000-0000-0000-0000-0000000000a1', 'admin.a@test.local', 'Claire', 'Martin', false),
  ('00000000-0000-0000-0000-0000000000a2', 'manager.a@test.local', 'Julien', 'Petit', false),
  ('00000000-0000-0000-0000-0000000000a3', 'rep.a@test.local', 'Léo', 'Bernard', false),
  ('00000000-0000-0000-0000-0000000000b1', 'admin.b@test.local', 'Paul', 'Durand', false);
insert into public.organizations (id, name, slug) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Entreprise A', 'entreprise-a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Entreprise B', 'entreprise-b');
insert into public.memberships (organization_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'org_admin'),
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'manager'),
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'sales_rep'),
  ('bbbbbbbb-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1', 'org_admin');

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

-- Le responsable de l'entreprise ne s'active pas l'option lui-même.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ update public.organizations set ai_plan = 'pack_ia' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '42501', null, 'le responsable ne change pas l''option IA');
-- Sans option, aucun usage IA n'est enregistré.
select throws_ok(
  $$ insert into public.ai_usage (organization_id, kind) values ('aaaaaaaa-0000-0000-0000-000000000000', 'dojo') $$,
  '42501', null, 'pas d''usage IA sans option');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-000000000001');
update public.organizations set ai_plan = 'pack_ia' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select pg_temp.logout();
select is((select ai_plan from public.organizations where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'pack_ia', 'le super admin active le Pack IA');
select isnt((select ai_plan_updated_at from public.organizations where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  null, 'la date d''activation est notée');

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ insert into public.ai_usage (organization_id, kind) values ('aaaaaaaa-0000-0000-0000-000000000000', 'dojo') $$,
  'un manager enregistre un usage');
select is((select count(*)::int from public.ai_usage), 1, 'le manager voit l''usage de son entreprise');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
  $$ insert into public.ai_usage (organization_id, kind) values ('aaaaaaaa-0000-0000-0000-000000000000', 'dojo') $$,
  '42501', null, 'un commercial n''utilise pas les fonctions IA');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.ai_usage), 0, 'une autre entreprise ne voit rien');
select throws_ok(
  $$ insert into public.ai_usage (organization_id, kind) values ('aaaaaaaa-0000-0000-0000-000000000000', 'dojo') $$,
  '42501', null, 'une autre entreprise n''écrit pas chez A');
select pg_temp.logout();

select * from finish();
rollback;
