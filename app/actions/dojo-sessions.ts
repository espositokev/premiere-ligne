"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/current-user";
import { formError, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, uuidSchema } from "@/lib/validation/schemas";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .transform((v) => v || null);

const sessionSchema = z.object({
  slug: z.string().min(1),
  organization_id: uuidSchema,
  dojo_id: uuidSchema,
  held_on: z.iso.date("Date invalide"),
  member_ids: z.array(uuidSchema).min(1, "Choisissez au moins un participant").max(50),
  scenario: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(3)])
    .transform((v) => (v === "" ? null : v)),
  went_well: optional(2000),
  priority_axis: optional(1000),
  commitment: optional(1000),
});

/** Noter une séance de Dojo animée avec un ou plusieurs commerciaux. */
export async function createDojoSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = sessionSchema.safeParse({
    slug: formData.get("slug"),
    organization_id: formData.get("organization_id"),
    dojo_id: formData.get("dojo_id"),
    held_on: formData.get("held_on"),
    member_ids: [...new Set(formData.getAll("member_ids").map(String))],
    scenario: formData.get("scenario") ?? "",
    went_well: formData.get("went_well") ?? "",
    priority_axis: formData.get("priority_axis") ?? "",
    commitment: formData.get("commitment") ?? "",
  });
  if (!parsed.success) return formError("Vérifiez la séance.", fieldErrors(parsed.error));
  const input = parsed.data;

  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("dojo_sessions")
    .insert({
      organization_id: input.organization_id,
      dojo_id: input.dojo_id,
      held_on: input.held_on,
      scenario: input.scenario,
      went_well: input.went_well,
      priority_axis: input.priority_axis,
      commitment: input.commitment,
    })
    .select("id")
    .single();
  if (error || !session) {
    console.error("[séances] création impossible", error?.message);
    return formError(
      error?.code === "42501" ? "Seuls les managers notent les séances." : UNEXPECTED_ERROR,
    );
  }
  const { error: participantsError } = await supabase.from("dojo_session_participants").insert(
    input.member_ids.map((membershipId) => ({
      session_id: session.id,
      membership_id: membershipId,
      organization_id: input.organization_id,
    })),
  );
  if (participantsError) {
    await supabase.from("dojo_sessions").delete().eq("id", session.id);
    return formError("Vous ne pouvez noter que les commerciaux que vous encadrez.");
  }

  await audit({
    action: "dojo_session.created",
    actorUserId: user.id,
    organizationId: input.organization_id,
    targetType: "dojo_session",
    targetId: session.id,
    details: { dojo_id: input.dojo_id, participants: input.member_ids.length },
  });
  revalidatePath(`/e/${input.slug}/dojos/${input.dojo_id}`);
  revalidatePath(`/e/${input.slug}/equipe`, "layout");
  revalidatePath(`/e/${input.slug}/coachings`);
  redirect(`/e/${input.slug}/dojos/${input.dojo_id}?seance=1#seances`);
}
