"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/current-user";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, uuidSchema } from "@/lib/validation/schemas";

/**
 * Plan de progrès (§4.8) : le commercial et ceux qui l'encadrent créent, modifient et font
 * avancer ses actions. Les droits sont vérifiés par la base (RLS).
 */

function revalidatePlan(slug: string, memberId: string) {
  revalidatePath(`/e/${slug}/moi`, "layout");
  revalidatePath(`/e/${slug}/equipe`, "layout");
  revalidatePath(`/e/${slug}/equipe/${memberId}`, "layout");
  revalidatePath(`/e/${slug}`);
}

const actionSchema = z.object({
  slug: z.string().min(1),
  organization_id: uuidSchema,
  member_id: uuidSchema,
  title: z.string().trim().min(1, "Donnez un titre à l'action").max(200, "200 caractères maximum"),
  description: z
    .string()
    .trim()
    .max(2000, "2 000 caractères maximum")
    .transform((v) => v || null),
  skill_id: z.union([z.literal(""), uuidSchema]).transform((v) => v || null),
  due_date: z.union([z.literal(""), z.iso.date("Date invalide")]).transform((v) => v || null),
});

function readAction(formData: FormData) {
  return actionSchema.safeParse({
    slug: formData.get("slug"),
    organization_id: formData.get("organization_id"),
    member_id: formData.get("member_id"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    skill_id: formData.get("skill_id") ?? "",
    due_date: formData.get("due_date") ?? "",
  });
}

export async function createAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = readAction(formData);
  if (!parsed.success) return formError("Vérifiez l'action.", fieldErrors(parsed.error));
  const input = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("actions").insert({
    organization_id: input.organization_id,
    subject_membership_id: input.member_id,
    title: input.title,
    description: input.description,
    skill_id: input.skill_id,
    due_date: input.due_date,
    source: "manuelle",
  });
  if (error) {
    console.error("[actions] création impossible", error.message);
    return formError(
      error.code === "42501" ? "Vous ne pouvez pas modifier ce plan." : UNEXPECTED_ERROR,
    );
  }
  revalidatePlan(input.slug, input.member_id);
  return formSuccess("Action ajoutée");
}

export async function updateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const id = uuidSchema.safeParse(formData.get("action_id"));
  const parsed = readAction(formData);
  if (!id.success || !parsed.success) {
    return formError("Vérifiez l'action.", parsed.success ? undefined : fieldErrors(parsed.error));
  }
  const input = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("actions")
    .update({
      title: input.title,
      description: input.description,
      skill_id: input.skill_id,
      due_date: input.due_date,
    })
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) return formError(UNEXPECTED_ERROR);
  revalidatePlan(input.slug, input.member_id);
  return formSuccess("Action modifiée");
}

const statusSchema = z.object({
  slug: z.string().min(1),
  action_id: uuidSchema,
  status: z.enum(["a_faire", "en_cours", "faite", "abandonnee"]),
});

/** Changement de statut en un tap (« Je commence », « C'est fait »…). */
export async function setActionStatus(formData: FormData): Promise<void> {
  await requireUser();
  const parsed = statusSchema.safeParse({
    slug: formData.get("slug"),
    action_id: formData.get("action_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("actions")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.action_id)
    .select("subject_membership_id");
  const action = data?.[0];
  if (action) revalidatePlan(parsed.data.slug, action.subject_membership_id);
}

export async function deleteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = uuidSchema.safeParse(formData.get("action_id"));
  const slug = z.string().min(1).safeParse(formData.get("slug"));
  if (!id.success || !slug.success) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("actions")
    .delete()
    .eq("id", id.data)
    .select("organization_id, subject_membership_id, title");
  const action = data?.[0];
  if (!action) return;
  await audit({
    action: "action.deleted",
    actorUserId: user.id,
    organizationId: action.organization_id,
    targetType: "action",
    targetId: id.data,
    details: { title: action.title },
  });
  revalidatePlan(slug.data, action.subject_membership_id);
}
