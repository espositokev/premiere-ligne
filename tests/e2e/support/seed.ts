import { admin, createUser } from "./backend";

/** Entreprise avec la matrice automobile, une équipe, son manager et un commercial. */
export async function seedTeam(id: string) {
  const client = admin();
  const { data: org } = await client
    .from("organizations")
    .insert({ name: `Éval ${id}`, slug: `eval-${id}` })
    .select("id, slug")
    .single();
  const { data: template } = await client
    .from("framework_templates")
    .select("id")
    .eq("name", "Vente automobile")
    .single();
  await client.rpc("copy_template_to_organization", { template: template!.id, org: org!.id });
  const { data: team } = await client
    .from("teams")
    .insert({ organization_id: org!.id, name: "Bordeaux Lac" })
    .select("id")
    .single();

  const adminEmail = `admin.eval.${id}@test.local`;
  const adminId = await createUser({ email: adminEmail, firstName: "Claire", lastName: "Martin" });
  await client
    .from("memberships")
    .insert({ organization_id: org!.id, user_id: adminId, role: "org_admin" });
  const managerEmail = `manager.eval.${id}@test.local`;
  const repEmail = `rep.eval.${id}@test.local`;
  const managerId = await createUser({
    email: managerEmail,
    firstName: "Julien",
    lastName: "Petit",
  });
  const repId = await createUser({ email: repEmail, firstName: "Léo", lastName: "Bernard" });
  const { data: manager } = await client
    .from("memberships")
    .insert({ organization_id: org!.id, user_id: managerId, role: "manager" })
    .select("id")
    .single();
  const { data: rep } = await client
    .from("memberships")
    .insert({ organization_id: org!.id, user_id: repId, role: "sales_rep", team_id: team!.id })
    .select("id")
    .single();
  await client
    .from("team_managers")
    .insert({ team_id: team!.id, membership_id: manager!.id, organization_id: org!.id });

  return { orgId: org!.id, slug: org!.slug, adminEmail, managerEmail, repEmail, repId: rep!.id };
}
