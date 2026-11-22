"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/current-user";
import { sendEmail } from "@/lib/email/send";
import { coachingRequestEmail, requestDeclinedEmail } from "@/lib/email/templates";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fieldErrors, uuidSchema } from "@/lib/validation/schemas";

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

const requestSchema = z.object({
  slug: z.string().min(1),
  organization_id: uuidSchema,
  member_id: uuidSchema,
  skill_ids: z
    .array(uuidSchema)
    .min(1, "Choisis au moins une compétence")
    .max(3, "3 compétences au maximum"),
  message: z
    .string()
    .trim()
    .max(2000, "2 000 caractères maximum")
    .transform((v) => v || null),
});

/** Le commercial demande un coaching (§4.7) ; les managers de son équipe sont prévenus. */
export async function createCoachingRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = requestSchema.safeParse({
    slug: formData.get("slug"),
    organization_id: formData.get("organization_id"),
    member_id: formData.get("member_id"),
    skill_ids: [...new Set(formData.getAll("skill_ids").map(String))],
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return formError("Vérifie ta demande.", fieldErrors(parsed.error));
  const input = parsed.data;

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("coaching_requests")
    .insert({
      organization_id: input.organization_id,
      requester_membership_id: input.member_id,
      message: input.message,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[demandes] création impossible", error?.message);
    return formError(UNEXPECTED_ERROR);
  }
  const { error: skillsError } = await supabase.from("coaching_request_skills").insert(
    input.skill_ids.map((skillId) => ({
      request_id: created.id,
      skill_id: skillId,
      organization_id: input.organization_id,
    })),
  );
  if (skillsError) {
    await supabase.from("coaching_requests").delete().eq("id", created.id);
    return formError("Ces compétences ne sont pas disponibles. Recharge la page.");
  }

  await audit({
    action: "coaching_request.created",
    actorUserId: user.id,
    organizationId: input.organization_id,
    targetType: "coaching_request",
    targetId: created.id,
  });

  // Destinataires : managers de l'équipe du commercial (lus avec la clé serveur, la demande
  // venant d'être créée par le commercial lui-même sous contrôle de la base).
  const service = createServiceClient();
  const [{ data: member }, { data: skills }] = await Promise.all([
    service
      .from("memberships")
      .select("team_id, profiles!inner(first_name, last_name)")
      .eq("id", input.member_id)
      .single(),
    service.from("skills").select("name").in("id", input.skill_ids),
  ]);
  if (member?.team_id) {
    const { data: managers } = await service
      .from("team_managers")
      .select("memberships!inner(active, profiles!inner(first_name, email))")
      .eq("team_id", member.team_id);
    const repName = `${member.profiles.first_name} ${member.profiles.last_name}`;
    for (const m of managers ?? []) {
      if (!m.memberships.active) continue;
      const email = coachingRequestEmail({
        managerFirstName: m.memberships.profiles.first_name,
        repName,
        message: input.message,
        skills: (skills ?? []).map((s) => s.name),
        link: `${appUrl()}/e/${input.slug}/coachings?vue=demandes`,
      });
      await sendEmail({
        to: m.memberships.profiles.email,
        ...email,
        template: "coaching.demande",
        organizationId: input.organization_id,
      });
    }
  }

  revalidatePath(`/e/${input.slug}/coachings`, "layout");
  revalidatePath(`/e/${input.slug}/moi`, "layout");
  return formSuccess("Demande envoyée à ton manager");
}

const declineSchema = z.object({
  slug: z.string().min(1),
  request_id: uuidSchema,
  answer: z.string().trim().min(1, "Écrivez un message pour expliquer").max(2000),
});

/** Le manager refuse une demande, avec un message pour le commercial. */
export async function declineCoachingRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = declineSchema.safeParse({
    slug: formData.get("slug"),
    request_id: formData.get("request_id"),
    answer: formData.get("answer"),
  });
  if (!parsed.success) return formError("Écrivez un message.", fieldErrors(parsed.error));
  const { slug, request_id, answer } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coaching_requests")
    .update({ status: "refusee", answer })
    .eq("id", request_id)
    .eq("status", "en_attente")
    .select("id, organization_id, requester_membership_id");
  const request = data?.[0];
  if (error || !request) return formError("Cette demande a déjà reçu une réponse.");

  await audit({
    action: "coaching_request.declined",
    actorUserId: user.id,
    organizationId: request.organization_id,
    targetType: "coaching_request",
    targetId: request_id,
  });

  const service = createServiceClient();
  const [{ data: rep }, { data: me }] = await Promise.all([
    service
      .from("memberships")
      .select("profiles!inner(first_name, email)")
      .eq("id", request.requester_membership_id)
      .single(),
    service.from("profiles").select("first_name, last_name").eq("id", user.id).single(),
  ]);
  if (rep) {
    const email = requestDeclinedEmail({
      firstName: rep.profiles.first_name,
      managerName: me ? `${me.first_name} ${me.last_name}` : "Ton manager",
      answer,
      link: `${appUrl()}/e/${slug}/coachings`,
    });
    await sendEmail({
      to: rep.profiles.email,
      ...email,
      template: "coaching.demande_refusee",
      organizationId: request.organization_id,
    });
  }
  revalidatePath(`/e/${slug}/coachings`, "layout");
  return formSuccess("Réponse envoyée");
}

/** Le commercial retire une demande encore en attente. */
export async function withdrawCoachingRequest(formData: FormData): Promise<void> {
  await requireUser();
  const requestId = uuidSchema.parse(formData.get("request_id"));
  const slug = z.string().min(1).parse(formData.get("slug"));
  const supabase = await createClient();
  await supabase.from("coaching_requests").delete().eq("id", requestId).eq("status", "en_attente");
  revalidatePath(`/e/${slug}/coachings`, "layout");
}
