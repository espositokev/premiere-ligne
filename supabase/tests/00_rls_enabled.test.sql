-- §8.1 : la RLS doit être activée sur TOUTES les tables du schéma public, sans exception.
-- Ce test reste vrai à mesure que des tables sont ajoutées par les migrations.
begin;
create extension if not exists pgtap with schema extensions;

select plan(1);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'Toutes les tables du schéma public ont la RLS activée'
);

select * from finish();
rollback;
