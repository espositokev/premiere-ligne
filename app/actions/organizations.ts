"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { audit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/auth/current-user";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  organizationSchema,
  organizationStatusSchema,
  uuidSchema,
} from "@/lib/validation/schemas";

/** Création d'une entreprise cliente (§3.1), réservée au super admin. */
export async function createOrganization(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return formError("Cette adresse est déjà utilisée.", {
        slug: "Cette adresse est déjà utilisée",
      });
    }
    console.error("[entreprise] création", error?.message);
    return formError(UNEXPECTED_ERROR);
  }

  // Modèle de matrice choisi à la création : copié dans l'entreprise (§3.1).
  const templateId = uuidSchema.safeParse(formData.get("template_id"));
  if (templateId.success) {
    const { error: copyError } = await supabase.rpc("copy_template_to_organization", {
      template: templateId.data,
      org: data.id,
    });
    if (copyError) console.error("[entreprise] copie du modèle", copyError.message);
  }

  await audit({
    action: "organization.created",
    actorUserId: user.id,
    organizationId: data.id,
    targetType: "organization",
    targetId: data.id,
    details: { name: parsed.data.name, template_id: templateId.success ? templateId.data : null },
  });
  revalidatePath("/admin", "layout");
  redirect(`/admin/entreprises/${data.id}`);
}

export async function setOrganizationStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireSuperAdmin();
  const id = uuidSchema.safeParse(formData.get("organization_id"));
  const status = organizationStatusSchema.safeParse(formData.get("status"));
  if (!id.success || !status.success) return formError("Demande invalide.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ status: status.data })
    .eq("id", id.data);
  if (error) {
    console.error("[entreprise] statut", error.message);
    return formError(UNEXPECTED_ERROR);
  }
  await audit({
    action: "organization.status_changed",
    actorUserId: user.id,
    organizationId: id.data,
    targetType: "organization",
    targetId: id.data,
    details: { status: status.data },
  });
  revalidatePath("/admin", "layout");
  const labels = { actif: "réactivée", suspendu: "suspendue", archive: "archivée" } as const;
  return formSuccess(`Entreprise ${labels[status.data]}`);
}
