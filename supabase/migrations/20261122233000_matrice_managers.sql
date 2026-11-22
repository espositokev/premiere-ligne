-- Les managers peuvent eux aussi faire évoluer la matrice de leur entreprise (blocs, compétences,
-- sous-compétences), comme le responsable. Mettre en place une matrice (choisir le modèle) reste
-- réservé au super admin et au responsable.

create or replace function public.can_edit_framework(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_org_admin(org) or coalesce(public.my_role(org) = 'manager', false);
$$;
revoke execute on function public.can_edit_framework(uuid) from public, anon;
grant execute on function public.can_edit_framework(uuid) to authenticated, service_role;

drop policy blocks_insert on public.blocks;
drop policy blocks_update on public.blocks;
drop policy blocks_delete on public.blocks;
drop policy competencies_insert on public.competencies;
drop policy competencies_update on public.competencies;
drop policy competencies_delete on public.competencies;
drop policy skills_insert on public.skills;
drop policy skills_update on public.skills;
drop policy skills_delete on public.skills;

create policy blocks_insert on public.blocks for insert to authenticated
  with check (public.can_edit_framework(organization_id));
create policy blocks_update on public.blocks for update to authenticated
  using (public.can_edit_framework(organization_id)) with check (public.can_edit_framework(organization_id));
create policy blocks_delete on public.blocks for delete to authenticated
  using (public.can_edit_framework(organization_id));

create policy competencies_insert on public.competencies for insert to authenticated
  with check (public.can_edit_framework(organization_id));
create policy competencies_update on public.competencies for update to authenticated
  using (public.can_edit_framework(organization_id)) with check (public.can_edit_framework(organization_id));
create policy competencies_delete on public.competencies for delete to authenticated
  using (public.can_edit_framework(organization_id));

create policy skills_insert on public.skills for insert to authenticated
  with check (public.can_edit_framework(organization_id));
create policy skills_update on public.skills for update to authenticated
  using (public.can_edit_framework(organization_id)) with check (public.can_edit_framework(organization_id));
create policy skills_delete on public.skills for delete to authenticated
  using (public.can_edit_framework(organization_id));
