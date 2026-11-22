"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/current-user";
import { orgSettingsSchema } from "@/lib/domain/settings";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import type { Json } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation/schemas";

/** Paramètres de l'entreprise (§6.8) : responsable ou super admin (vérifié par la base). */
export async function updateOrgSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const orgId = uuidSchema.safeParse(formData.get("organization_id"));
  const slug = z.string().min(1).safeParse(formData.get("slug"));
  const days = z.coerce
    .number()
    .int()
    .min(7, "7 jours minimum")
    .max(365, "365 jours maximum")
    .safeParse(formData.get("daysWithoutCoaching"));
  if (!orgId.success || !slug.success) return formError("Demande invalide.");
  if (!days.success)
    return formError("Vérifiez le nombre de jours.", {
      daysWithoutCoaching: days.error.issues[0]?.message ?? "Invalide",
    });

  const settings = orgSettingsSchema.parse({
    daysWithoutCoaching: days.data,
    allowSelfEvaluation: formData.get("allowSelfEvaluation") === "on",
    allowCoachingRequests: formData.get("allowCoachingRequests") === "on",
  });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ settings: settings as unknown as Json })
    .eq("id", orgId.data)
    .select("id");
  if (error || !data?.length) return formError(UNEXPECTED_ERROR);
  await audit({
    action: "settings.updated",
    actorUserId: user.id,
    organizationId: orgId.data,
    targetType: "organization",
    targetId: orgId.data,
    details: settings as unknown as Json,
  });
  revalidatePath(`/e/${slug.data}`, "layout");
  return formSuccess("Paramètres enregistrés");
}
