"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/current-user";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, profileSchema } from "@/lib/validation/schemas";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) {
    console.error("[profil] mise à jour", error.message);
    return formError(UNEXPECTED_ERROR);
  }
  await audit({
    action: "profile.updated",
    actorUserId: user.id,
    targetType: "profile",
    targetId: user.id,
  });
  revalidatePath("/", "layout");
  return formSuccess("Profil enregistré");
}
