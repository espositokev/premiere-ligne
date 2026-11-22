"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/current-user";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, memberUpdateSchema, uuidSchema } from "@/lib/validation/schemas";

async function loadMember(formData: FormData) {
  const id = uuidSchema.safeParse(formData.get("membership_id"));
  if (!id.success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("id, organization_id, user_id, role, team_id, active, organizations!inner(slug)")
    .eq("id", id.data)
    .maybeSingle();
  return data ? { supabase, member: data } : null;
}

/** Modification du rôle, de l'équipe ou du poste (org_admin et super admin, contrôlé par la RLS). */
export async function updateMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const context = await loadMember(formData);
  if (!context) return formError("Utilisateur introuvable.");
  const { supabase, member } = context;

  const parsed = memberUpdateSchema.safeParse({
    role: formData.get("role"),
    team_id: formData.get("team_id"),
    job_title: formData.get("job_title"),
  });
  if (!parsed.success) return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));

  if (member.user_id === user.id && parsed.data.role !== member.role) {
    return formError("Vous ne pouvez pas changer votre propre rôle.");
  }

  // Un manager qui change de rôle quitte les équipes qu'il managait.
  if (member.role !== "sales_rep" && parsed.data.role === "sales_rep") {
    await supabase.from("team_managers").delete().eq("membership_id", member.id);
  }

  const { data, error } = await supabase
    .from("memberships")
    .update(parsed.data)
    .eq("id", member.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("[membre] mise à jour", error.message);
    return formError(
      error ? UNEXPECTED_ERROR : "Vous n'avez pas le droit de modifier cet utilisateur.",
    );
  }

  await audit({
    action: parsed.data.role !== member.role ? "member.role_changed" : "member.updated",
    actorUserId: user.id,
    organizationId: member.organization_id,
    targetType: "membership",
    targetId: member.id,
    details: { from: member.role, to: parsed.data.role },
  });
  revalidatePath(`/e/${member.organizations.slug}`, "layout");
  revalidatePath(`/admin/entreprises/${member.organization_id}`);
  return formSuccess("Modifications enregistrées");
}

/** Désactivation ou réactivation : jamais de suppression d'un utilisateur qui a des données (§4.3). */
export async function setMemberActive(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const context = await loadMember(formData);
  if (!context) return formError("Utilisateur introuvable.");
  const { supabase, member } = context;
  const active = formData.get("active") === "true";

  if (member.user_id === user.id && !active) {
    return formError("Vous ne pouvez pas désactiver votre propre accès.");
  }

  const { data, error } = await supabase
    .from("memberships")
    .update({ active })
    .eq("id", member.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("[membre] activation", error.message);
    return formError(
      error ? UNEXPECTED_ERROR : "Vous n'avez pas le droit de modifier cet utilisateur.",
    );
  }

  await audit({
    action: active ? "member.reactivated" : "member.deactivated",
    actorUserId: user.id,
    organizationId: member.organization_id,
    targetType: "membership",
    targetId: member.id,
  });
  revalidatePath(`/e/${member.organizations.slug}`, "layout");
  revalidatePath(`/admin/entreprises/${member.organization_id}`);
  return formSuccess(active ? "Accès réactivé" : "Accès désactivé");
}
