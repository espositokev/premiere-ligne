"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/current-user";
import { formError, formSuccess, type FormState } from "@/lib/forms";
import { createInvitation, resendInvitation, revokeInvitation } from "@/lib/invitations";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, invitationSchema, uuidSchema } from "@/lib/validation/schemas";

/** Charge l'entreprise visée : si l'utilisateur ne la voit pas (RLS), l'action s'arrête. */
async function loadOrganization(formData: FormData) {
  const id = uuidSchema.safeParse(formData.get("organization_id"));
  if (!id.success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", id.data)
    .maybeSingle();
  return data ? { supabase, organization: data } : null;
}

function revalidateOrg(slug: string, id: string) {
  revalidatePath(`/e/${slug}`, "layout");
  revalidatePath(`/admin/entreprises/${id}`);
}

export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const context = await loadOrganization(formData);
  if (!context) return formError("Entreprise introuvable.");

  const parsed = invitationSchema.safeParse({
    email: formData.get("email"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    role: formData.get("role"),
    team_id: formData.get("team_id"),
    job_title: formData.get("job_title"),
  });
  if (!parsed.success) return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));

  const result = await createInvitation(context.supabase, user, context.organization, parsed.data);
  if (!result.ok) {
    return formError(result.error, result.field ? { [result.field]: result.error } : undefined);
  }
  revalidateOrg(context.organization.slug, context.organization.id);
  const name = `${parsed.data.first_name} ${parsed.data.last_name}`;
  return formSuccess(
    result.emailSent
      ? `Invitation envoyée à ${name}`
      : `Invitation créée pour ${name}, mais l'email n'a pas pu partir. Renvoyez-la plus tard.`,
  );
}

export async function resendInvitationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const context = await loadOrganization(formData);
  const invitationId = uuidSchema.safeParse(formData.get("invitation_id"));
  if (!context || !invitationId.success) return formError("Invitation introuvable.");

  const result = await resendInvitation(
    context.supabase,
    user,
    context.organization,
    invitationId.data,
  );
  if (!result.ok) return formError(result.error);
  revalidateOrg(context.organization.slug, context.organization.id);
  return formSuccess(
    result.emailSent ? "Invitation renvoyée" : "Lien renouvelé, mais l'email n'a pas pu partir.",
  );
}

export async function revokeInvitationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const context = await loadOrganization(formData);
  const invitationId = uuidSchema.safeParse(formData.get("invitation_id"));
  if (!context || !invitationId.success) return formError("Invitation introuvable.");

  const result = await revokeInvitation(
    context.supabase,
    user,
    context.organization.id,
    invitationId.data,
  );
  if (!result.ok) return formError(result.error);
  revalidateOrg(context.organization.slug, context.organization.id);
  return formSuccess("Invitation annulée");
}
