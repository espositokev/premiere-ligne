"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/auth/current-user";
import { formError, formSuccess, type FormState } from "@/lib/forms";
import { canAdministerMembership } from "@/lib/rgpd";
import { createServiceClient } from "@/lib/supabase/service";
import { uuidSchema } from "@/lib/validation/schemas";

/**
 * Anonymiser une personne dont l'accès est désactivé (§14) : nom, prénom, email remplacés,
 * notes privées supprimées, compte de connexion neutralisé. Les évaluations et coachings restent,
 * sans nom, pour les statistiques de l'entreprise. Irréversible.
 */
export async function anonymizeMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const memberId = uuidSchema.safeParse(formData.get("membership_id"));
  const slug = z.string().min(1).safeParse(formData.get("slug"));
  if (!memberId.success || !slug.success) return formError("Demande invalide.");
  const rights = await canAdministerMembership(memberId.data);
  if (!rights) return formError("Vous n'avez pas le droit de faire cela.");
  if (rights.member.active) return formError("Désactivez d'abord l'accès de cette personne.");

  const service = createServiceClient();
  const { error } = await service.rpc("anonymize_profile", { target: rights.member.user_id });
  if (error) return formError(error.message);
  const { error: authError } = await service.auth.admin.updateUserById(rights.member.user_id, {
    email: `anonyme-${rights.member.user_id}@anonyme.invalid`,
    ban_duration: "876000h",
    user_metadata: {},
  });
  if (authError) console.error("[rgpd] compte de connexion", authError.message);

  await audit({
    action: "member.anonymized",
    actorUserId: rights.actorId,
    organizationId: rights.member.organization_id,
    targetType: "membership",
    targetId: memberId.data,
  });
  revalidatePath(`/e/${slug.data}`, "layout");
  return formSuccess("Personne anonymisée");
}

/**
 * Suppression définitive d'une entreprise archivée depuis 30 jours (§14), super admin uniquement.
 * La base refuse si le délai n'est pas écoulé. Les comptes sans autre accès sont supprimés.
 */
export async function purgeOrganization(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const orgId = uuidSchema.safeParse(formData.get("organization_id"));
  const confirmation = z.string().safeParse(formData.get("confirmation"));
  if (!orgId.success) return formError("Demande invalide.");

  const service = createServiceClient();
  const { data: organization } = await service
    .from("organizations")
    .select("name, slug")
    .eq("id", orgId.data)
    .maybeSingle();
  if (!organization) return formError("Entreprise introuvable.");
  if (!confirmation.success || confirmation.data.trim() !== organization.slug) {
    return formError(`Tapez « ${organization.slug} » pour confirmer.`, {
      confirmation: "Saisie différente",
    });
  }

  const { data: orphans, error } = await service.rpc("purge_organization", { org: orgId.data });
  if (error) return formError(error.message);
  for (const userId of orphans ?? []) {
    const { error: deleteError } = await service.auth.admin.deleteUser(userId);
    if (deleteError) console.error("[rgpd] suppression du compte", userId, deleteError.message);
  }
  await audit({
    action: "organization.purged",
    actorUserId: user.id,
    organizationId: null,
    targetType: "organization",
    targetId: orgId.data,
    details: {
      name: organization.name,
      slug: organization.slug,
      deleted_accounts: (orphans ?? []).length,
    },
  });
  revalidatePath("/admin", "layout");
  redirect("/admin/entreprises");
}
