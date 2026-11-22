"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/current-user";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, teamSchema, uuidSchema } from "@/lib/validation/schemas";

async function loadOrganization(formData: FormData) {
  const id = uuidSchema.safeParse(formData.get("organization_id"));
  if (!id.success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("id", id.data)
    .maybeSingle();
  return data ? { supabase, organization: data } : null;
}

function parseTeam(formData: FormData) {
  return teamSchema.safeParse({
    name: formData.get("name"),
    manager_ids: formData.getAll("manager_ids").map(String),
  });
}

/** Remplace la liste des managers d'une équipe. */
async function setManagers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  teamId: string,
  managerIds: string[],
) {
  const { data: current } = await supabase
    .from("team_managers")
    .select("membership_id")
    .eq("team_id", teamId);
  const currentIds = new Set((current ?? []).map((row) => row.membership_id));
  const wanted = new Set(managerIds);

  const toRemove = [...currentIds].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !currentIds.has(id));

  if (toRemove.length) {
    const { error } = await supabase
      .from("team_managers")
      .delete()
      .eq("team_id", teamId)
      .in("membership_id", toRemove);
    if (error) throw error;
  }
  if (toAdd.length) {
    const { error } = await supabase.from("team_managers").insert(
      toAdd.map((membership_id) => ({
        team_id: teamId,
        membership_id,
        organization_id: organizationId,
      })),
    );
    if (error) throw error;
  }
}

export async function createTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const context = await loadOrganization(formData);
  if (!context) return formError("Entreprise introuvable.");
  const parsed = parseTeam(formData);
  if (!parsed.success) return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));

  const { supabase, organization } = context;
  const { data: team, error } = await supabase
    .from("teams")
    .insert({ organization_id: organization.id, name: parsed.data.name })
    .select("id")
    .single();
  if (error || !team) {
    if (error?.code === "23505")
      return formError("Une équipe porte déjà ce nom.", { name: "Nom déjà utilisé" });
    if (error?.code === "42501") return formError("Vous n'avez pas le droit de créer une équipe.");
    console.error("[équipe] création", error?.message);
    return formError(UNEXPECTED_ERROR);
  }

  try {
    await setManagers(supabase, organization.id, team.id, parsed.data.manager_ids);
  } catch (managerError) {
    console.error("[équipe] managers", managerError);
    return formError("L'équipe est créée, mais ses managers n'ont pas pu être enregistrés.");
  }

  await audit({
    action: "team.created",
    actorUserId: user.id,
    organizationId: organization.id,
    targetType: "team",
    targetId: team.id,
  });
  revalidatePath(`/e/${organization.slug}`, "layout");
  return formSuccess(`Équipe « ${parsed.data.name} » créée`);
}

export async function updateTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const context = await loadOrganization(formData);
  const teamId = uuidSchema.safeParse(formData.get("team_id"));
  if (!context || !teamId.success) return formError("Équipe introuvable.");
  const parsed = parseTeam(formData);
  if (!parsed.success) return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));

  const { supabase, organization } = context;
  const { data, error } = await supabase
    .from("teams")
    .update({ name: parsed.data.name })
    .eq("id", teamId.data)
    .eq("organization_id", organization.id)
    .select("id");
  if (error || !data?.length) {
    if (error?.code === "23505")
      return formError("Une équipe porte déjà ce nom.", { name: "Nom déjà utilisé" });
    if (error) console.error("[équipe] mise à jour", error.message);
    return formError(
      error ? UNEXPECTED_ERROR : "Vous n'avez pas le droit de modifier cette équipe.",
    );
  }

  try {
    await setManagers(supabase, organization.id, teamId.data, parsed.data.manager_ids);
  } catch (managerError) {
    console.error("[équipe] managers", managerError);
    return formError("Les managers n'ont pas pu être enregistrés.");
  }

  await audit({
    action: "team.updated",
    actorUserId: user.id,
    organizationId: organization.id,
    targetType: "team",
    targetId: teamId.data,
  });
  revalidatePath(`/e/${organization.slug}`, "layout");
  return formSuccess("Équipe enregistrée");
}

export async function setTeamActive(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const context = await loadOrganization(formData);
  const teamId = uuidSchema.safeParse(formData.get("team_id"));
  if (!context || !teamId.success) return formError("Équipe introuvable.");
  const active = formData.get("active") === "true";

  const { supabase, organization } = context;
  if (!active) {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId.data)
      .eq("active", true);
    if (count) {
      return formError(
        `Cette équipe compte encore ${count} commercial${count > 1 ? "aux" : ""} actif${count > 1 ? "s" : ""}. Changez-les d'équipe d'abord.`,
      );
    }
  }

  const { data, error } = await supabase
    .from("teams")
    .update({ active })
    .eq("id", teamId.data)
    .eq("organization_id", organization.id)
    .select("id");
  if (error || !data?.length)
    return formError("Vous n'avez pas le droit de modifier cette équipe.");

  await audit({
    action: "team.updated",
    actorUserId: user.id,
    organizationId: organization.id,
    targetType: "team",
    targetId: teamId.data,
    details: { active },
  });
  revalidatePath(`/e/${organization.slug}`, "layout");
  return formSuccess(active ? "Équipe réactivée" : "Équipe désactivée");
}
