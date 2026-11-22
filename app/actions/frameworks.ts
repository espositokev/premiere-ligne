"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSuperAdmin, requireUser } from "@/lib/auth/current-user";
import { audit } from "@/lib/audit";
import { reorder, type NodeKind } from "@/lib/domain/framework";
import { formError, formSuccess, UNEXPECTED_ERROR, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, uuidSchema } from "@/lib/validation/schemas";

/**
 * Éditeur de référentiel, commun aux modèles (super admin) et aux entreprises (responsable).
 * Les droits sont appliqués par la base (RLS) ; ici on valide les entrées et on route
 * vers la bonne table.
 */

type Scope = "template" | "org";

const TABLES: Record<Scope, Record<NodeKind, string>> = {
  template: {
    block: "template_blocks",
    competency: "template_competencies",
    skill: "template_skills",
  },
  org: { block: "blocks", competency: "competencies", skill: "skills" },
};

/** Colonne qui rattache un élément à son parent. */
const PARENT_COLUMN: Record<Scope, Record<NodeKind, string>> = {
  template: { block: "template_id", competency: "block_id", skill: "competency_id" },
  org: { block: "framework_id", competency: "block_id", skill: "competency_id" },
};

const PARENT_TABLE: Record<Scope, Record<NodeKind, string>> = {
  template: {
    block: "framework_templates",
    competency: "template_blocks",
    skill: "template_competencies",
  },
  org: { block: "frameworks", competency: "blocks", skill: "competencies" },
};

const contextSchema = z.object({
  scope: z.enum(["template", "org"]),
  kind: z.enum(["block", "competency", "skill"]),
  path: z
    .string()
    .regex(
      /^\/(admin\/modeles\/[0-9a-f-]{36}|e\/[a-z0-9-]+\/parametres\/referentiel)$/,
      "Chemin invalide",
    ),
});

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} : champ obligatoire`)
    .max(max, `${label} : ${max} caractères maximum`);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .optional()
    .transform((v) => (v ? v : null));

const nodeFieldsSchema = z.object({
  name: text(120, "Nom"),
  statement: optional(300),
  level_0: optional(300),
  level_1: optional(300),
  level_2: optional(300),
  level_3: optional(300),
  level_4: optional(300),
});

function readContext(formData: FormData) {
  return contextSchema.safeParse({
    scope: formData.get("scope"),
    kind: formData.get("kind"),
    path: formData.get("path"),
  });
}

function readFields(formData: FormData, kind: NodeKind) {
  const parsed = nodeFieldsSchema.safeParse({
    name: formData.get("name"),
    statement: formData.get("statement") ?? undefined,
    level_0: formData.get("level_0") ?? undefined,
    level_1: formData.get("level_1") ?? undefined,
    level_2: formData.get("level_2") ?? undefined,
    level_3: formData.get("level_3") ?? undefined,
    level_4: formData.get("level_4") ?? undefined,
  });
  if (!parsed.success) return parsed;
  const { name, statement, ...levels } = parsed.data;
  if (kind === "block") return { success: true as const, data: { name } };
  if (kind === "competency") return { success: true as const, data: { name, statement } };
  return { success: true as const, data: { name, statement, ...levels } };
}

async function client(scope: Scope): Promise<SupabaseClient> {
  if (scope === "template") await requireSuperAdmin();
  else await requireUser();
  // Client sans typage de table : les noms de table viennent des listes fermées ci-dessus.
  return (await createClient()) as unknown as SupabaseClient;
}

function deniedOrUnexpected(error: { code?: string; message?: string } | null): FormState {
  if (error?.code === "42501")
    return formError("Vous n'avez pas le droit de modifier ce référentiel.");
  if (error?.code === "23503") return formError(error.message ?? "Élément déjà utilisé.");
  if (error) console.error("[référentiel]", error.message);
  return formError(UNEXPECTED_ERROR);
}

export async function addNode(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = readContext(formData);
  const parentId = uuidSchema.safeParse(formData.get("parent_id"));
  if (!context.success || !parentId.success) return formError("Demande invalide.");
  const { scope, kind, path } = context.data;
  const fields = readFields(formData, kind);
  if (!fields.success) return formError("Vérifiez les champs indiqués.", fieldErrors(fields.error));

  const db = await client(scope);
  const table = TABLES[scope][kind];
  const parentColumn = PARENT_COLUMN[scope][kind];

  const { data: siblings } = await db
    .from(table)
    .select("position")
    .eq(parentColumn, parentId.data);
  const position =
    Math.max(-1, ...((siblings ?? []) as { position: number }[]).map((s) => s.position)) + 1;

  const row: Record<string, unknown> = { ...fields.data, [parentColumn]: parentId.data, position };
  if (scope === "org") {
    const { data: parent } = await db
      .from(PARENT_TABLE[scope][kind])
      .select("organization_id")
      .eq("id", parentId.data)
      .maybeSingle();
    if (!parent) return formError("Élément parent introuvable.");
    row.organization_id = (parent as { organization_id: string }).organization_id;
  }

  const { error } = await db.from(table).insert(row);
  if (error) return deniedOrUnexpected(error);
  revalidatePath(path);
  return formSuccess(`${fields.data.name} ajouté`);
}

export async function updateNode(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = readContext(formData);
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!context.success || !id.success) return formError("Demande invalide.");
  const { scope, kind, path } = context.data;
  const fields = readFields(formData, kind);
  if (!fields.success) return formError("Vérifiez les champs indiqués.", fieldErrors(fields.error));

  const db = await client(scope);
  const { data, error } = await db
    .from(TABLES[scope][kind])
    .update(fields.data)
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) return deniedOrUnexpected(error ?? { code: "42501" });
  revalidatePath(path);
  return formSuccess("Enregistré");
}

export async function moveNode(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = readContext(formData);
  const id = uuidSchema.safeParse(formData.get("id"));
  const direction = z.enum(["up", "down"]).safeParse(formData.get("direction"));
  if (!context.success || !id.success || !direction.success) return formError("Demande invalide.");
  const { scope, kind, path } = context.data;

  const db = await client(scope);
  const table = TABLES[scope][kind];
  const parentColumn = PARENT_COLUMN[scope][kind];
  const { data: current } = await db
    .from(table)
    .select(parentColumn)
    .eq("id", id.data)
    .maybeSingle();
  if (!current) return formError("Élément introuvable.");
  const parentId = (current as unknown as Record<string, string>)[parentColumn];

  const { data: siblings } = await db
    .from(table)
    .select("id, position, name")
    .eq(parentColumn, parentId);
  const changes = reorder(
    (siblings ?? []) as { id: string; position: number; name: string }[],
    id.data,
    direction.data,
  );
  if (!changes) return { status: "idle" };

  for (const change of changes) {
    const { error } = await db
      .from(table)
      .update({ position: change.position })
      .eq("id", change.id);
    if (error) return deniedOrUnexpected(error);
  }
  revalidatePath(path);
  return { status: "idle" };
}

export async function setNodeActive(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = readContext(formData);
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!context.success || !id.success || context.data.scope !== "org")
    return formError("Demande invalide.");
  const { kind, path } = context.data;
  const active = formData.get("active") === "true";

  const db = await client("org");
  const { data, error } = await db
    .from(TABLES.org[kind])
    .update({ active })
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) return deniedOrUnexpected(error ?? { code: "42501" });
  revalidatePath(path);
  return formSuccess(
    active ? "Réactivé" : "Désactivé : il n'apparaîtra plus dans les nouvelles évaluations",
  );
}

export async function deleteNode(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = readContext(formData);
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!context.success || !id.success) return formError("Demande invalide.");
  const { scope, kind, path } = context.data;

  const db = await client(scope);
  if (scope === "org") {
    // L'interface ne propose « Supprimer » que si c'est possible ; la base revérifie toujours.
    const fn =
      kind === "skill"
        ? "is_skill_used"
        : kind === "competency"
          ? "is_competency_used"
          : "is_block_used";
    const arg =
      kind === "skill"
        ? { skill: id.data }
        : kind === "competency"
          ? { competency: id.data }
          : { block: id.data };
    const { data: used } = await db.rpc(fn, arg);
    if (used)
      return formError("Cet élément est déjà utilisé : désactivez-le plutôt que de le supprimer.");
  }

  const { data, error } = await db
    .from(TABLES[scope][kind])
    .delete()
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) return deniedOrUnexpected(error ?? { code: "42501" });
  revalidatePath(path);
  return formSuccess("Supprimé");
}

// ---------------------------------------------------------------------------
// Modèles (super admin) et application d'un modèle à une entreprise
// ---------------------------------------------------------------------------

const templateSchema = z.object({
  name: text(120, "Nom"),
  description: optional(500),
});

export async function createTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
  });
  if (!parsed.success) return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));
  const source = uuidSchema.safeParse(formData.get("source_id"));

  const supabase = await createClient();
  let id: string | null = null;
  if (source.success) {
    const { data, error } = await supabase.rpc("duplicate_template", {
      template: source.data,
      new_name: parsed.data.name,
    });
    if (error) return deniedOrUnexpected(error);
    id = data;
  } else {
    const { data, error } = await supabase
      .from("framework_templates")
      .insert({ name: parsed.data.name, description: parsed.data.description })
      .select("id")
      .single();
    if (error || !data) return deniedOrUnexpected(error);
    id = data.id;
  }

  await audit({
    action: "template.created",
    actorUserId: user.id,
    targetType: "framework_template",
    targetId: id,
  });
  revalidatePath("/admin/modeles");
  redirect(`/admin/modeles/${id}`);
}

export async function updateTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const id = uuidSchema.safeParse(formData.get("id"));
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
  });
  if (!id.success) return formError("Demande invalide.");
  if (!parsed.success) return formError("Vérifiez les champs indiqués.", fieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase
    .from("framework_templates")
    .update(parsed.data)
    .eq("id", id.data);
  if (error) return deniedOrUnexpected(error);
  revalidatePath("/admin/modeles", "layout");
  return formSuccess("Modèle enregistré");
}

export async function setTemplatePublished(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin();
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return formError("Demande invalide.");
  const published = formData.get("published") === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("framework_templates")
    .update({ published })
    .eq("id", id.data);
  if (error) return deniedOrUnexpected(error);
  revalidatePath("/admin/modeles", "layout");
  return formSuccess(
    published
      ? "Modèle publié : il est proposé à la création d'une entreprise"
      : "Modèle retiré des propositions",
  );
}

export async function deleteTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return formError("Demande invalide.");
  const supabase = await createClient();
  const { error } = await supabase.from("framework_templates").delete().eq("id", id.data);
  if (error) return deniedOrUnexpected(error);
  await audit({
    action: "template.deleted",
    actorUserId: user.id,
    targetType: "framework_template",
    targetId: id.data,
  });
  revalidatePath("/admin/modeles");
  redirect("/admin/modeles");
}

/** Copie un modèle dans une entreprise qui n'a pas encore de référentiel (§3.1). */
export async function applyTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const organizationId = uuidSchema.safeParse(formData.get("organization_id"));
  const templateId = uuidSchema.safeParse(formData.get("template_id"));
  if (!organizationId.success) return formError("Demande invalide.");
  if (!templateId.success)
    return formError("Choisissez un modèle.", { template_id: "Choisissez un modèle" });

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", organizationId.data)
    .maybeSingle();
  const { error } = await supabase.rpc("copy_template_to_organization", {
    template: templateId.data,
    org: organizationId.data,
  });
  if (error) {
    if (error.code === "23505") return formError("Cette entreprise a déjà un référentiel.");
    return deniedOrUnexpected(error);
  }
  await audit({
    action: "framework.created",
    actorUserId: user.id,
    organizationId: organizationId.data,
    targetType: "framework_template",
    targetId: templateId.data,
  });
  revalidatePath(`/admin/entreprises/${organizationId.data}`);
  if (organization) revalidatePath(`/e/${organization.slug}`, "layout");
  return formSuccess("Référentiel créé à partir du modèle");
}
