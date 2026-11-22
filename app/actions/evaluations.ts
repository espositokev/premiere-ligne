"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/current-user";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, uuidSchema } from "@/lib/validation/schemas";

/** Adresse de l'écran d'une évaluation, selon qu'on est le commercial ou son manager. */
function evaluationPath(slug: string, memberId: string, evaluationId: string, self: boolean) {
  return self
    ? `/e/${slug}/moi/evaluations/${evaluationId}`
    : `/e/${slug}/equipe/${memberId}/evaluations/${evaluationId}`;
}

function memberPaths(slug: string, memberId: string) {
  revalidatePath(`/e/${slug}/equipe/${memberId}`, "layout");
  revalidatePath(`/e/${slug}/moi`, "layout");
}

async function loadOrganization(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  return data ? { supabase, organization: data } : null;
}

const startSchema = z.object({
  slug: z.string().min(1),
  member_id: uuidSchema,
  kind: z.enum(["manager", "self"]),
});

/**
 * « Nouvelle évaluation » : reprend le brouillon en cours s'il existe, sinon en crée un.
 * Les droits (manager du commercial, ou commercial lui-même) sont vérifiés par la base.
 */
export async function startEvaluation(formData: FormData): Promise<void> {
  await requireUser();
  const input = startSchema.parse({
    slug: formData.get("slug"),
    member_id: formData.get("member_id"),
    kind: formData.get("kind"),
  });
  const context = await loadOrganization(input.slug);
  if (!context) redirect("/espaces");
  const { supabase, organization } = context;
  const self = input.kind === "self";

  const { data: draft } = await supabase
    .from("evaluations")
    .select("id")
    .eq("subject_membership_id", input.member_id)
    .eq("kind", input.kind)
    .eq("status", "brouillon")
    .maybeSingle();
  if (draft) redirect(evaluationPath(organization.slug, input.member_id, draft.id, self));

  const { data: framework } = await supabase
    .from("frameworks")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("active", true)
    .maybeSingle();
  if (!framework) redirect(self ? `/e/${organization.slug}/moi` : `/e/${organization.slug}/equipe`);

  const { data: created, error } = await supabase
    .from("evaluations")
    .insert({
      organization_id: organization.id,
      subject_membership_id: input.member_id,
      framework_id: framework.id,
      kind: input.kind,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[evaluations] création impossible", error?.message);
    redirect(
      self ? `/e/${organization.slug}/moi` : `/e/${organization.slug}/equipe/${input.member_id}`,
    );
  }
  memberPaths(organization.slug, input.member_id);
  redirect(evaluationPath(organization.slug, input.member_id, created.id, self));
}

const scoreSchema = z.object({
  skillId: uuidSchema,
  score: z.number().int().min(0).max(4).nullable(),
  comment: z
    .string()
    .trim()
    .max(1000, "1 000 caractères maximum")
    .nullable()
    .transform((v) => (v ? v : null)),
});

const saveSchema = z.object({
  evaluationId: uuidSchema,
  scores: z.array(scoreSchema).max(500),
  generalComment: z
    .string()
    .trim()
    .max(4000, "4 000 caractères maximum")
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null)),
});

export type SaveResult = { ok: true; savedAt: string } | { ok: false; message: string };

/**
 * Enregistrement automatique du brouillon (appelé ~1,5 s après la dernière saisie).
 * Une note vide sans commentaire est retirée : la sous-compétence redevient « non évaluée ».
 * Sur une évaluation validée, seul un responsable peut écrire (la base le vérifie) et la
 * correction est inscrite au journal.
 */
export async function saveEvaluationDraft(input: z.input<typeof saveSchema>): Promise<SaveResult> {
  const user = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Saisie invalide. Rechargez la page." };
  const { evaluationId, scores, generalComment } = parsed.data;

  const supabase = await createClient();
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, organization_id, status, subject_membership_id, evaluation_scores(skill_id)")
    .eq("id", evaluationId)
    .maybeSingle();
  if (!evaluation) return { ok: false, message: "Évaluation introuvable." };

  const existing = new Set(evaluation.evaluation_scores.map((s) => s.skill_id));
  const toDelete = scores.filter((s) => s.score === null && !s.comment).map((s) => s.skillId);
  const toWrite = scores.filter((s) => s.score !== null || s.comment);
  const toInsert = toWrite.filter((s) => !existing.has(s.skillId));
  const toUpdate = toWrite.filter((s) => existing.has(s.skillId));

  try {
    if (toDelete.length) {
      const { error } = await supabase
        .from("evaluation_scores")
        .delete()
        .eq("evaluation_id", evaluationId)
        .in("skill_id", toDelete);
      if (error) throw error;
    }
    if (toInsert.length) {
      const { error } = await supabase.from("evaluation_scores").insert(
        toInsert.map((s) => ({
          evaluation_id: evaluationId,
          organization_id: evaluation.organization_id,
          skill_id: s.skillId,
          score: s.score,
          comment: s.comment,
        })),
      );
      if (error) throw error;
    }
    for (const s of toUpdate) {
      const { data, error } = await supabase
        .from("evaluation_scores")
        .update({ score: s.score, comment: s.comment })
        .eq("evaluation_id", evaluationId)
        .eq("skill_id", s.skillId)
        .select("skill_id");
      if (error) throw error;
      if (!data?.length)
        return { ok: false, message: "Vous ne pouvez plus modifier cette évaluation." };
    }
    if (generalComment !== undefined) {
      const { data, error } = await supabase
        .from("evaluations")
        .update({ general_comment: generalComment })
        .eq("id", evaluationId)
        .select("id");
      if (error) throw error;
      if (!data?.length)
        return { ok: false, message: "Vous ne pouvez plus modifier cette évaluation." };
    }
  } catch (error) {
    console.error("[evaluations] enregistrement impossible", error);
    return { ok: false, message: "Enregistrement impossible. Vérifiez votre connexion." };
  }

  if (evaluation.status === "validee") {
    await audit({
      action: "evaluation.corrected",
      actorUserId: user.id,
      organizationId: evaluation.organization_id,
      targetType: "evaluation",
      targetId: evaluationId,
      details: {
        scores: scores.map((s) => ({ skill_id: s.skillId, score: s.score })),
        general_comment_changed: generalComment !== undefined,
      },
    });
  }
  return { ok: true, savedAt: new Date().toISOString() };
}

const validateSchema = z.object({ evaluationId: uuidSchema, slug: z.string().min(1) });

/** « Valider l'évaluation » : elle devient définitive et datée. */
export async function validateEvaluation(
  input: z.input<typeof validateSchema>,
): Promise<{ ok: true; redirectTo: string } | { ok: false; message: string }> {
  const user = await requireUser();
  const parsed = validateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: UNEXPECTED_ERROR };
  const { evaluationId, slug } = parsed.data;

  const supabase = await createClient();
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, organization_id, kind, status, subject_membership_id, evaluation_scores(score)")
    .eq("id", evaluationId)
    .maybeSingle();
  if (!evaluation) return { ok: false, message: "Évaluation introuvable." };
  if (evaluation.status === "validee") return { ok: false, message: "Évaluation déjà validée." };
  if (!evaluation.evaluation_scores.some((s) => s.score !== null)) {
    return { ok: false, message: "Notez au moins une sous-compétence avant de valider." };
  }

  const { data, error } = await supabase
    .from("evaluations")
    .update({ status: "validee" })
    .eq("id", evaluationId)
    .select("id");
  if (error || !data?.length) {
    console.error("[evaluations] validation impossible", error?.message);
    return { ok: false, message: UNEXPECTED_ERROR };
  }

  await audit({
    action: "evaluation.validated",
    actorUserId: user.id,
    organizationId: evaluation.organization_id,
    targetType: "evaluation",
    targetId: evaluationId,
    details: { kind: evaluation.kind },
  });
  memberPaths(slug, evaluation.subject_membership_id);
  const self = evaluation.kind === "self";
  return {
    ok: true,
    redirectTo: self ? `/e/${slug}/moi` : `/e/${slug}/equipe/${evaluation.subject_membership_id}`,
  };
}

/** Abandon d'un brouillon. */
export async function deleteEvaluationDraft(formData: FormData): Promise<void> {
  await requireUser();
  const evaluationId = uuidSchema.parse(formData.get("evaluation_id"));
  const slug = z.string().min(1).parse(formData.get("slug"));
  const supabase = await createClient();
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, kind, subject_membership_id")
    .eq("id", evaluationId)
    .maybeSingle();
  if (!evaluation) redirect(`/e/${slug}`);
  await supabase.from("evaluations").delete().eq("id", evaluationId).eq("status", "brouillon");
  memberPaths(slug, evaluation.subject_membership_id);
  redirect(
    evaluation.kind === "self"
      ? `/e/${slug}/moi`
      : `/e/${slug}/equipe/${evaluation.subject_membership_id}`,
  );
}

const noteSchema = z.object({
  organization_id: uuidSchema,
  member_id: uuidSchema,
  slug: z.string().min(1),
  body: z.string().trim().min(1, "Écrivez votre note").max(5000, "5 000 caractères maximum"),
});

/** Note privée du manager : jamais visible par le commercial (la base le garantit). */
export async function addManagerNote(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = noteSchema.safeParse({
    organization_id: formData.get("organization_id"),
    member_id: formData.get("member_id"),
    slug: formData.get("slug"),
    body: formData.get("body"),
  });
  if (!parsed.success) return formError("Vérifiez votre note.", fieldErrors(parsed.error));
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("manager_notes").insert({
    organization_id: input.organization_id,
    subject_membership_id: input.member_id,
    body: input.body,
  });
  if (error) {
    console.error("[manager_notes] création impossible", error.message);
    return formError(UNEXPECTED_ERROR);
  }
  revalidatePath(`/e/${input.slug}/equipe/${input.member_id}`);
  return formSuccess("Note enregistrée");
}

export async function deleteManagerNote(formData: FormData): Promise<void> {
  const user = await requireUser();
  const noteId = uuidSchema.parse(formData.get("note_id"));
  const slug = z.string().min(1).parse(formData.get("slug"));
  const supabase = await createClient();
  const { data } = await supabase
    .from("manager_notes")
    .delete()
    .eq("id", noteId)
    .select("organization_id, subject_membership_id");
  const note = data?.[0];
  if (note) {
    await audit({
      action: "manager_note.deleted",
      actorUserId: user.id,
      organizationId: note.organization_id,
      targetType: "manager_note",
      targetId: noteId,
    });
    revalidatePath(`/e/${slug}/equipe/${note.subject_membership_id}`);
  }
}
