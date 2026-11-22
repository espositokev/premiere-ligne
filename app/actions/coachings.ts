"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/current-user";
import { sendEmail } from "@/lib/email/send";
import {
  coachingCancelledEmail,
  coachingPlannedEmail,
  coachingReportEmail,
} from "@/lib/email/templates";
import {
  actionPlanSchema,
  buildIcs,
  COACHING_MODE_LABELS,
  formatShortDay,
  formatWhen,
  localToUtc,
  MAX_COACHING_SKILLS,
  parseActionPlan,
} from "@/lib/domain/coaching";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fieldErrors, uuidSchema } from "@/lib/validation/schemas";

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function revalidateCoachings(slug: string, memberId?: string) {
  revalidatePath(`/e/${slug}/coachings`, "layout");
  revalidatePath(`/e/${slug}/moi`, "layout");
  revalidatePath(`/e/${slug}`);
  if (memberId) revalidatePath(`/e/${slug}/equipe/${memberId}`, "layout");
}

/**
 * Coordonnées nécessaires aux emails d'un coaching. Lu avec la clé serveur, uniquement après
 * que l'utilisateur a prouvé ses droits (sa propre lecture du coaching est passée par la RLS).
 */
async function coachingMailContext(coachingId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("coachings")
    .select(
      `id, organization_id, scheduled_at, duration_minutes, mode, location, objective, updated_at, created_at,
       subject:memberships!coachings_subject_membership_id_organization_id_fkey(profiles(first_name, email)),
       coach:profiles!coachings_coach_user_id_fkey(first_name, last_name, email),
       coaching_skills(skills(name)),
       organizations(slug)`,
    )
    .eq("id", coachingId)
    .maybeSingle();
  if (!data) return null;
  type Raw = {
    id: string;
    organization_id: string;
    scheduled_at: string;
    duration_minutes: number;
    mode: "terrain" | "distance";
    location: string | null;
    objective: string | null;
    subject: { profiles: { first_name: string; email: string } | null } | null;
    coach: { first_name: string; last_name: string; email: string } | null;
    coaching_skills: { skills: { name: string } | null }[];
    organizations: { slug: string } | null;
  };
  const raw = data as unknown as Raw;
  if (!raw.subject?.profiles || !raw.organizations) return null;
  return {
    ...raw,
    rep: raw.subject.profiles,
    coachName: raw.coach ? `${raw.coach.first_name} ${raw.coach.last_name}` : "Ton manager",
    skillNames: raw.coaching_skills
      .map((s) => s.skills?.name)
      .filter((n): n is string => Boolean(n)),
    slug: raw.organizations.slug,
  };
}

async function notifyPlanned(
  coachingId: string,
  options: { updated: boolean; fromRequest: boolean },
) {
  const c = await coachingMailContext(coachingId);
  if (!c) return;
  const when = formatWhen(c.scheduled_at);
  const email = coachingPlannedEmail({
    firstName: c.rep.first_name,
    coachName: c.coachName,
    when,
    mode: COACHING_MODE_LABELS[c.mode],
    location: c.location,
    objective: c.objective,
    skills: c.skillNames,
    link: `${appUrl()}/e/${c.slug}/coachings/${c.id}`,
    updated: options.updated,
    fromRequest: options.fromRequest,
  });
  const ics = buildIcs({
    uid: c.id,
    start: c.scheduled_at,
    durationMinutes: c.duration_minutes,
    title: `Coaching avec ${c.coachName}`,
    description: [c.objective, c.skillNames.join(", ")].filter(Boolean).join("\n"),
    location: c.location,
    sequence: Math.floor(Date.now() / 60_000) % 2_000_000_000,
    now: new Date(),
  });
  await sendEmail({
    to: c.rep.email,
    ...email,
    template: options.updated ? "coaching.modifie" : "coaching.planifie",
    organizationId: c.organization_id,
    attachments: [
      { filename: "coaching.ics", content: ics, contentType: "text/calendar; charset=utf-8" },
    ],
  });
}

// ---------------------------------------------------------------------------
// Planification
// ---------------------------------------------------------------------------

const planningSchema = z.object({
  slug: z.string().min(1),
  organization_id: uuidSchema,
  member_id: uuidSchema,
  scheduled_local: z
    .string()
    .min(1, "Choisissez la date et l'heure")
    .transform((v, ctx) => {
      const utc = localToUtc(v);
      if (!utc) {
        ctx.addIssue({ code: "custom", message: "Date invalide" });
        return z.NEVER;
      }
      return utc;
    }),
  duration_minutes: z.coerce.number().int().min(15).max(720),
  mode: z.enum(["terrain", "distance"]),
  location: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null),
  objective: z
    .string()
    .trim()
    .max(500, "500 caractères maximum")
    .transform((v) => v || null),
  skill_ids: z
    .array(uuidSchema)
    .min(1, "Choisissez au moins une compétence")
    .max(MAX_COACHING_SKILLS, `${MAX_COACHING_SKILLS} compétences au maximum`),
  request_id: uuidSchema.optional(),
});

function readPlanning(formData: FormData) {
  return planningSchema.safeParse({
    slug: formData.get("slug"),
    organization_id: formData.get("organization_id"),
    member_id: formData.get("member_id"),
    scheduled_local: formData.get("scheduled_local"),
    duration_minutes: formData.get("duration_minutes"),
    mode: formData.get("mode"),
    location: formData.get("location") ?? "",
    objective: formData.get("objective") ?? "",
    skill_ids: [...new Set(formData.getAll("skill_ids").map(String))],
    request_id: formData.get("request_id") || undefined,
  });
}

/** Planifier un coaching (§4.7) : le commercial reçoit un email avec l'invitation agenda. */
export async function createCoaching(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = readPlanning(formData);
  if (!parsed.success)
    return formError("Vérifiez les informations du coaching.", fieldErrors(parsed.error));
  const input = parsed.data;

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("coachings")
    .insert({
      organization_id: input.organization_id,
      subject_membership_id: input.member_id,
      scheduled_at: input.scheduled_local,
      duration_minutes: input.duration_minutes,
      mode: input.mode,
      location: input.location,
      objective: input.objective,
      request_id: input.request_id ?? null,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[coachings] création impossible", error?.message);
    return formError(
      error?.code === "42501" ? "Vous ne pouvez pas coacher ce commercial." : UNEXPECTED_ERROR,
    );
  }

  const { error: skillsError } = await supabase.from("coaching_skills").insert(
    input.skill_ids.map((skillId) => ({
      coaching_id: created.id,
      skill_id: skillId,
      organization_id: input.organization_id,
    })),
  );
  if (skillsError) {
    console.error("[coachings] compétences impossibles", skillsError.message);
    await supabase.from("coachings").delete().eq("id", created.id);
    return formError("Ces compétences ne sont pas disponibles. Rechargez la page.");
  }

  if (input.request_id) {
    await supabase
      .from("coaching_requests")
      .update({ status: "acceptee", answer: "Coaching planifié" })
      .eq("id", input.request_id);
  }

  await audit({
    action: "coaching.created",
    actorUserId: user.id,
    organizationId: input.organization_id,
    targetType: "coaching",
    targetId: created.id,
  });
  await notifyPlanned(created.id, { updated: false, fromRequest: Boolean(input.request_id) });
  revalidateCoachings(input.slug, input.member_id);
  redirect(`/e/${input.slug}/coachings/${created.id}?planifie=1`);
}

/** Modifier la planification d'un coaching à venir ; le commercial reçoit l'invitation mise à jour. */
export async function updateCoachingPlanning(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const coachingId = uuidSchema.safeParse(formData.get("coaching_id"));
  const parsed = readPlanning(formData);
  if (!coachingId.success || !parsed.success) {
    return formError(
      "Vérifiez les informations du coaching.",
      parsed.success ? undefined : fieldErrors(parsed.error),
    );
  }
  const input = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coachings")
    .update({
      scheduled_at: input.scheduled_local,
      duration_minutes: input.duration_minutes,
      mode: input.mode,
      location: input.location,
      objective: input.objective,
    })
    .eq("id", coachingId.data)
    .eq("status", "planifie")
    .select("id");
  if (error || !data?.length) return formError("Ce coaching ne peut plus être modifié.");

  const { data: current } = await supabase
    .from("coaching_skills")
    .select("skill_id")
    .eq("coaching_id", coachingId.data);
  const currentIds = new Set((current ?? []).map((s) => s.skill_id));
  const removed = [...currentIds].filter((id) => !input.skill_ids.includes(id));
  const added = input.skill_ids.filter((id) => !currentIds.has(id));
  if (removed.length) {
    await supabase
      .from("coaching_observations")
      .delete()
      .eq("coaching_id", coachingId.data)
      .in("skill_id", removed);
    await supabase
      .from("coaching_skills")
      .delete()
      .eq("coaching_id", coachingId.data)
      .in("skill_id", removed);
  }
  if (added.length) {
    const { error: addError } = await supabase.from("coaching_skills").insert(
      added.map((skillId) => ({
        coaching_id: coachingId.data,
        skill_id: skillId,
        organization_id: input.organization_id,
      })),
    );
    if (addError) return formError("Ces compétences ne sont pas disponibles. Rechargez la page.");
  }

  if (formData.get("notify") === "on")
    await notifyPlanned(coachingId.data, { updated: true, fromRequest: false });
  revalidateCoachings(input.slug, input.member_id);
  return formSuccess("Coaching modifié");
}

const cancelSchema = z.object({
  slug: z.string().min(1),
  coaching_id: uuidSchema,
  reason: z.string().trim().min(1, "Indiquez le motif").max(500),
});

/** Annuler un coaching à venir ou à rédiger, avec motif. */
export async function cancelCoaching(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = cancelSchema.safeParse({
    slug: formData.get("slug"),
    coaching_id: formData.get("coaching_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success)
    return formError("Indiquez le motif d'annulation.", fieldErrors(parsed.error));
  const { slug, coaching_id, reason } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coachings")
    .update({ status: "annule", cancel_reason: reason })
    .eq("id", coaching_id)
    .eq("status", "planifie")
    .select("id, organization_id, subject_membership_id, scheduled_at, duration_minutes");
  const coaching = data?.[0];
  if (error || !coaching) return formError("Ce coaching ne peut pas être annulé.");

  await audit({
    action: "coaching.cancelled",
    actorUserId: user.id,
    organizationId: coaching.organization_id,
    targetType: "coaching",
    targetId: coaching_id,
    details: { reason },
  });

  // Le commercial n'est prévenu que si le coaching était encore à venir.
  if (Date.parse(coaching.scheduled_at) > Date.now()) {
    const c = await coachingMailContext(coaching_id);
    if (c) {
      const email = coachingCancelledEmail({
        firstName: c.rep.first_name,
        coachName: c.coachName,
        when: formatWhen(c.scheduled_at),
        reason,
      });
      await sendEmail({
        to: c.rep.email,
        ...email,
        template: "coaching.annule",
        organizationId: c.organization_id,
        attachments: [
          {
            filename: "coaching-annule.ics",
            content: buildIcs({
              uid: c.id,
              start: c.scheduled_at,
              durationMinutes: c.duration_minutes,
              title: `Coaching avec ${c.coachName}`,
              cancelled: true,
              sequence: Math.floor(Date.now() / 60_000) % 2_000_000_000,
              now: new Date(),
            }),
            contentType: "text/calendar; charset=utf-8",
          },
        ],
      });
    }
  }
  revalidateCoachings(slug, coaching.subject_membership_id);
  return formSuccess("Coaching annulé");
}

// ---------------------------------------------------------------------------
// Compte rendu (enregistrement automatique)
// ---------------------------------------------------------------------------

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));

const reportSchema = z.object({
  coachingId: uuidSchema,
  context: optionalText(4000),
  strengths: optionalText(4000),
  improvements: optionalText(4000),
  actionPlan: actionPlanSchema.optional(),
  observations: z
    .array(
      z.object({
        skillId: uuidSchema,
        score: z.number().int().min(0).max(4).nullable(),
        comment: z
          .string()
          .trim()
          .max(1000)
          .nullable()
          .transform((v) => v || null),
      }),
    )
    .max(MAX_COACHING_SKILLS)
    .optional(),
});

export type SaveResult = { ok: true; savedAt: string } | { ok: false; message: string };

export async function saveCoachingReport(input: z.input<typeof reportSchema>): Promise<SaveResult> {
  await requireUser();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const { coachingId, observations, actionPlan, ...texts } = parsed.data;
  const supabase = await createClient();

  const { data: coaching } = await supabase
    .from("coachings")
    .select(
      "id, organization_id, status, coaching_reports(coaching_id), coaching_observations(skill_id)",
    )
    .eq("id", coachingId)
    .maybeSingle();
  if (!coaching) return { ok: false, message: "Coaching introuvable." };
  if (coaching.status !== "planifie") return { ok: false, message: "Ce compte rendu est clôturé." };

  const fields = Object.fromEntries(Object.entries(texts).filter(([, v]) => v !== undefined));
  const reportFields = actionPlan !== undefined ? { ...fields, action_plan: actionPlan } : fields;

  try {
    if (Object.keys(reportFields).length > 0) {
      const exists =
        coaching.coaching_reports !== null &&
        (!Array.isArray(coaching.coaching_reports) || coaching.coaching_reports.length > 0);
      if (exists) {
        const { data, error } = await supabase
          .from("coaching_reports")
          .update(reportFields)
          .eq("coaching_id", coachingId)
          .select("coaching_id");
        if (error) throw error;
        if (!data?.length)
          return { ok: false, message: "Vous ne pouvez pas modifier ce compte rendu." };
      } else {
        const { error } = await supabase.from("coaching_reports").insert({
          coaching_id: coachingId,
          organization_id: coaching.organization_id,
          ...reportFields,
        });
        if (error) throw error;
      }
    }

    if (observations?.length) {
      const existing = new Set(coaching.coaching_observations.map((o) => o.skill_id));
      for (const o of observations) {
        if (o.score === null && !o.comment) {
          if (existing.has(o.skillId)) {
            const { error } = await supabase
              .from("coaching_observations")
              .delete()
              .eq("coaching_id", coachingId)
              .eq("skill_id", o.skillId);
            if (error) throw error;
          }
        } else if (existing.has(o.skillId)) {
          const { error } = await supabase
            .from("coaching_observations")
            .update({ score: o.score, comment: o.comment })
            .eq("coaching_id", coachingId)
            .eq("skill_id", o.skillId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("coaching_observations").insert({
            coaching_id: coachingId,
            skill_id: o.skillId,
            organization_id: coaching.organization_id,
            score: o.score,
            comment: o.comment,
          });
          if (error) throw error;
        }
      }
    }
  } catch (error) {
    console.error("[coachings] enregistrement du CR impossible", error);
    return { ok: false, message: "Enregistrement impossible. Vérifiez votre connexion." };
  }
  return { ok: true, savedAt: new Date().toISOString() };
}

/**
 * Clôturer (§4.7) : fige le CR, crée les actions du plan d'action dans le plan de progrès du
 * commercial, puis le prévient par email.
 */
export async function closeCoaching(input: {
  coachingId: string;
  slug: string;
}): Promise<{ ok: true; redirectTo: string } | { ok: false; message: string }> {
  const user = await requireUser();
  const coachingId = uuidSchema.safeParse(input.coachingId);
  if (!coachingId.success) return { ok: false, message: UNEXPECTED_ERROR };
  const supabase = await createClient();

  const { data: coaching } = await supabase
    .from("coachings")
    .select(
      "id, organization_id, subject_membership_id, status, scheduled_at, coaching_reports(action_plan)",
    )
    .eq("id", coachingId.data)
    .maybeSingle();
  if (!coaching) return { ok: false, message: "Coaching introuvable." };
  if (coaching.status !== "planifie")
    return { ok: false, message: "Ce compte rendu est déjà clôturé." };
  if (Date.parse(coaching.scheduled_at) > Date.now()) {
    return { ok: false, message: "Le coaching n'a pas encore eu lieu." };
  }

  const reports = coaching.coaching_reports as unknown as
    { action_plan: unknown } | { action_plan: unknown }[] | null;
  const report = Array.isArray(reports) ? reports[0] : reports;
  const plan = parseActionPlan(report?.action_plan);

  // Une réouverture suivie d'une nouvelle clôture ne recrée pas les actions déjà créées.
  const { count } = await supabase
    .from("actions")
    .select("id", { count: "exact", head: true })
    .eq("coaching_id", coaching.id);
  if (plan.length > 0 && !count) {
    const { error } = await supabase.from("actions").insert(
      plan.map((item) => ({
        organization_id: coaching.organization_id,
        subject_membership_id: coaching.subject_membership_id,
        title: item.title,
        description: item.description,
        skill_id: item.skillId,
        due_date: item.dueDate,
        source: "coaching" as const,
        coaching_id: coaching.id,
      })),
    );
    if (error) {
      console.error("[coachings] actions impossibles", error.message);
      return { ok: false, message: "Les actions du plan n'ont pas pu être créées." };
    }
  }

  const { data: closed, error } = await supabase
    .from("coachings")
    .update({ status: "cloture" })
    .eq("id", coaching.id)
    .select("id");
  if (error || !closed?.length) {
    console.error("[coachings] clôture impossible", error?.message);
    return { ok: false, message: UNEXPECTED_ERROR };
  }

  await audit({
    action: "coaching.closed",
    actorUserId: user.id,
    organizationId: coaching.organization_id,
    targetType: "coaching",
    targetId: coaching.id,
    details: { actions: plan.length },
  });

  const c = await coachingMailContext(coaching.id);
  if (c) {
    const email = coachingReportEmail({
      firstName: c.rep.first_name,
      coachName: c.coachName,
      when: formatShortDay(c.scheduled_at),
      actionCount: count ? 0 : plan.length,
      link: `${appUrl()}/e/${c.slug}/coachings/${c.id}`,
    });
    await sendEmail({
      to: c.rep.email,
      ...email,
      template: "coaching.cr",
      organizationId: c.organization_id,
    });
  }

  revalidateCoachings(input.slug, coaching.subject_membership_id);
  return { ok: true, redirectTo: `/e/${input.slug}/coachings/${coaching.id}` };
}

const reopenSchema = z.object({
  slug: z.string().min(1),
  coaching_id: uuidSchema,
  reason: z.string().trim().min(1, "Indiquez le motif").max(500),
});

/** Rouvrir un CR clôturé : responsable uniquement (la base le vérifie), avec motif, journalisé. */
export async function reopenCoaching(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = reopenSchema.safeParse({
    slug: formData.get("slug"),
    coaching_id: formData.get("coaching_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success)
    return formError("Indiquez le motif de réouverture.", fieldErrors(parsed.error));
  const { slug, coaching_id, reason } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coachings")
    .update({ status: "planifie", reopen_reason: reason })
    .eq("id", coaching_id)
    .eq("status", "cloture")
    .select("id, organization_id, subject_membership_id");
  const coaching = data?.[0];
  if (error || !coaching) {
    return formError(
      error?.code === "42501"
        ? "Seul un responsable peut rouvrir un compte rendu."
        : UNEXPECTED_ERROR,
    );
  }
  await audit({
    action: "coaching.reopened",
    actorUserId: user.id,
    organizationId: coaching.organization_id,
    targetType: "coaching",
    targetId: coaching_id,
    details: { reason },
  });
  revalidateCoachings(slug, coaching.subject_membership_id);
  return formSuccess("Compte rendu rouvert");
}

const repCommentSchema = z.object({
  slug: z.string().min(1),
  coaching_id: uuidSchema,
  rep_comment: z
    .string()
    .trim()
    .max(2000, "2 000 caractères maximum")
    .transform((v) => v || null),
});

/** Le commercial ajoute son commentaire au CR clôturé. */
export async function saveRepComment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = repCommentSchema.safeParse({
    slug: formData.get("slug"),
    coaching_id: formData.get("coaching_id"),
    rep_comment: formData.get("rep_comment") ?? "",
  });
  if (!parsed.success) return formError("Vérifie ton commentaire.", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coachings")
    .update({ rep_comment: parsed.data.rep_comment })
    .eq("id", parsed.data.coaching_id)
    .select("id");
  if (error || !data?.length) return formError(UNEXPECTED_ERROR);
  revalidatePath(`/e/${parsed.data.slug}/coachings/${parsed.data.coaching_id}`);
  return formSuccess("Commentaire enregistré");
}
