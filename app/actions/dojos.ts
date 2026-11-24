"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { generateDojo } from "@/lib/ai/dojo-generator";
import { loadAiAccess, recordAiUsage } from "@/lib/data/ai-usage";
import { requireUser } from "@/lib/auth/current-user";
import { dojoContentSchema, emptyDojoContent, type DojoContent } from "@/lib/domain/dojo";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import type { Json } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, uuidSchema } from "@/lib/validation/schemas";

const createSchema = z.object({
  organization_id: uuidSchema,
  skill_id: uuidSchema.or(z.literal("").transform(() => null)).pipe(uuidSchema.nullable()),
  mode: z.enum(["ia", "manuel"]),
  subject: z.string().trim().max(400, "400 caractères maximum").default(""),
  title: z.string().trim().max(140, "140 caractères maximum").default(""),
});

async function loadOrg(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();
  return data ? { supabase, organization: data } : null;
}

function toJson(content: DojoContent): Json {
  return JSON.parse(JSON.stringify(content)) as Json;
}

/** Création d'un Dojo : page blanche structurée, ou génération selon la méthode Première Ligne. */
export async function createDojo(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse({
    organization_id: formData.get("organization_id"),
    skill_id: formData.get("skill_id") ?? "",
    mode: formData.get("mode"),
    subject: formData.get("subject") ?? "",
    title: formData.get("title") ?? "",
  });
  if (!parsed.success) return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));
  const input = parsed.data;
  if (!input.skill_id)
    return formError("Choisissez la sous-compétence visée.", { skill_id: "Champ obligatoire" });
  if (input.mode === "ia" && input.subject.length < 5) {
    return formError("Décrivez le sujet du Dojo en une phrase.", {
      subject: "Décrivez le sujet du Dojo",
    });
  }
  if (input.mode === "manuel" && input.title.length < 2) {
    return formError("Donnez un titre au Dojo.", { title: "Champ obligatoire" });
  }

  const context = await loadOrg(input.organization_id);
  if (!context) return formError("Entreprise introuvable.");
  const { supabase, organization } = context;

  const { data: skill } = await supabase
    .from("skills")
    .select("id, name, statement, competencies!inner(name)")
    .eq("id", input.skill_id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!skill)
    return formError("Sous-compétence introuvable.", { skill_id: "Sous-compétence introuvable" });

  let title = input.title;
  let content = emptyDojoContent();
  if (input.mode === "ia") {
    const access = await loadAiAccess(organization.id, "dojo");
    if (!access.allowed) return formError(access.message);
    const result = await generateDojo({
      subject: input.subject,
      skillName: skill.name,
      skillStatement: skill.statement,
      competencyName: skill.competencies.name,
      organizationName: organization.name,
    });
    if (!result.ok) return formError(result.error);
    await recordAiUsage(organization.id, "dojo");
    title = result.title;
    content = result.content;
  }

  const { data: dojo, error } = await supabase
    .from("dojos")
    .insert({
      organization_id: organization.id,
      skill_id: skill.id,
      title,
      content: toJson(content),
      status: "brouillon",
      source: input.mode,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !dojo) {
    if (error?.code === "42501") return formError("Vous n'avez pas le droit de créer un Dojo.");
    console.error("[dojo] création", error?.message);
    return formError(UNEXPECTED_ERROR);
  }

  revalidatePath(`/e/${organization.slug}/dojos`);
  redirect(`/e/${organization.slug}/dojos/${dojo.id}/modifier`);
}

const updateSchema = z.object({
  id: uuidSchema,
  skill_id: uuidSchema,
  title: z
    .string()
    .trim()
    .min(2, "Titre : au moins 2 caractères")
    .max(140, "Titre : 140 caractères maximum"),
  content: z.string().max(200_000, "Contenu trop long"),
});

export async function updateDojo(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    skill_id: formData.get("skill_id"),
    title: formData.get("title"),
    content: formData.get("content"),
  });
  if (!parsed.success) return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));

  let content: DojoContent;
  try {
    const value = dojoContentSchema.safeParse(JSON.parse(parsed.data.content));
    if (!value.success) return formError("Le contenu du Dojo est incomplet ou invalide.");
    content = value.data;
  } catch {
    return formError("Le contenu du Dojo est illisible.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dojos")
    .update({ title: parsed.data.title, skill_id: parsed.data.skill_id, content: toJson(content) })
    .eq("id", parsed.data.id)
    .select("id, organizations!inner(slug)")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[dojo] mise à jour", error.message);
    return formError(error ? UNEXPECTED_ERROR : "Vous ne pouvez modifier que vos propres Dojos.");
  }
  revalidatePath(`/e/${data.organizations.slug}/dojos`, "layout");
  return formSuccess("Dojo enregistré");
}

const statusSchema = z.enum(["brouillon", "a_tester", "valide", "archive"]);

export async function setDojoStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = uuidSchema.safeParse(formData.get("id"));
  const status = statusSchema.safeParse(formData.get("status"));
  if (!id.success || !status.success) return formError("Demande invalide.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dojos")
    .update({ status: status.data })
    .eq("id", id.data)
    .select("id, organization_id, organizations!inner(slug)")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[dojo] statut", error.message);
    return formError("Vous ne pouvez modifier que vos propres Dojos.");
  }
  await audit({
    action: "dojo.status_changed",
    actorUserId: user.id,
    organizationId: data.organization_id,
    targetType: "dojo",
    targetId: data.id,
    details: { status: status.data },
  });
  revalidatePath(`/e/${data.organizations.slug}/dojos`, "layout");
  const labels = {
    brouillon: "Repassé en brouillon",
    a_tester: "Prêt à tester : faites-le jouer une première fois avec un commercial volontaire",
    valide: "Dojo validé : il est visible par les commerciaux",
    archive: "Dojo archivé",
  } as const;
  return formSuccess(labels[status.data]);
}

/** Copie un Dojo (par exemple de la bibliothèque) pour l'adapter : la copie appartient à son auteur. */
export async function duplicateDojo(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return formError("Demande invalide.");

  const supabase = await createClient();
  const { data: source } = await supabase
    .from("dojos")
    .select("organization_id, skill_id, title, content, organizations!inner(slug)")
    .eq("id", id.data)
    .maybeSingle();
  if (!source) return formError("Dojo introuvable.");

  const { data: copy, error } = await supabase
    .from("dojos")
    .insert({
      organization_id: source.organization_id,
      skill_id: source.skill_id,
      title: `${source.title} (adapté)`.slice(0, 140),
      content: source.content,
      status: "brouillon",
      source: "manuel",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !copy) {
    if (error?.code === "42501") return formError("Vous n'avez pas le droit de créer un Dojo.");
    console.error("[dojo] copie", error?.message);
    return formError(UNEXPECTED_ERROR);
  }
  revalidatePath(`/e/${source.organizations.slug}/dojos`);
  redirect(`/e/${source.organizations.slug}/dojos/${copy.id}/modifier`);
}

export async function deleteDojo(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return formError("Demande invalide.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dojos")
    .delete()
    .eq("id", id.data)
    .select("id, organization_id, organizations!inner(slug)")
    .maybeSingle();
  if (error || !data) {
    return formError(
      "Ce Dojo ne peut pas être supprimé. Un manager ne supprime que ses brouillons ; archivez-le sinon.",
    );
  }
  await audit({
    action: "dojo.deleted",
    actorUserId: user.id,
    organizationId: data.organization_id,
    targetType: "dojo",
    targetId: data.id,
  });
  revalidatePath(`/e/${data.organizations.slug}/dojos`);
  redirect(`/e/${data.organizations.slug}/dojos`);
}
