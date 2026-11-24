-- Options IA payantes (DECISIONS.md, 24 novembre 2026) : la plateforme reste offerte,
-- l'entreprise peut avoir l'option « Dojos à la demande » ou le « Pack IA ».
-- Activation par le super admin seulement, en attendant le paiement en ligne.

alter table public.organizations
  add column ai_plan text not null default 'aucune'
    check (ai_plan in ('aucune', 'dojos', 'pack_ia')),
  add column ai_plan_updated_at timestamptz;

grant update (ai_plan) on public.organizations to authenticated;

create or replace function public.guard_organization_ai_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ai_plan is distinct from old.ai_plan then
    if (select auth.uid()) is not null and not public.is_super_admin() then
      raise exception 'Seul le super admin change l''option IA d''une entreprise'
        using errcode = '42501';
    end if;
    new.ai_plan_updated_at := now();
  end if;
  return new;
end;
$$;
create trigger guard_organization_ai_plan before update of ai_plan on public.organizations
  for each row execute function public.guard_organization_ai_plan();

-- Une ligne par utilisation d'une fonction IA, pour compter l'usage du mois.
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  -- Supprimé avec l'entreprise lors d'une purge RGPD.
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('dojo', 'analyse_appel')),
  -- Qui a lancé l'utilisation ; vidé si la personne est supprimée.
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index ai_usage_org_kind_created on public.ai_usage (organization_id, kind, created_at);

alter table public.ai_usage enable row level security;
grant select, insert on public.ai_usage to authenticated;
grant all on public.ai_usage to service_role;

-- Qui peut utiliser les fonctions IA : le responsable et les managers de l'entreprise.
create or replace function public.can_use_ai(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_org_admin(org) or coalesce(public.my_role(org) = 'manager', false);
$$;

create policy ai_usage_select on public.ai_usage for select to authenticated
  using (public.can_use_ai(organization_id));
create policy ai_usage_insert on public.ai_usage for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_use_ai(organization_id)
    and exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.ai_plan <> 'aucune'
    )
  );
-- Pas de modification ni de suppression : l'historique d'usage fait foi.
