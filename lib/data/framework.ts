import "server-only";

import {
  byPosition,
  type BlockNode,
  type CompetencyNode,
  type FrameworkTree,
  type SkillNode,
} from "@/lib/domain/framework";
import { createClient } from "@/lib/supabase/server";

type RawSkill = {
  id: string;
  name: string;
  statement: string | null;
  position: number;
  active?: boolean;
  level_0: string | null;
  level_1: string | null;
  level_2: string | null;
  level_3: string | null;
  level_4: string | null;
};
type RawCompetency = {
  id: string;
  name: string;
  statement: string | null;
  position: number;
  active?: boolean;
  skills: RawSkill[];
};
type RawBlock = {
  id: string;
  name: string;
  position: number;
  active?: boolean;
  competencies: RawCompetency[];
};

function toTree(id: string, name: string, blocks: RawBlock[]): FrameworkTree {
  const skill = (s: RawSkill): SkillNode => ({
    id: s.id,
    name: s.name,
    statement: s.statement,
    position: s.position,
    active: s.active ?? true,
    levels: {
      level_0: s.level_0,
      level_1: s.level_1,
      level_2: s.level_2,
      level_3: s.level_3,
      level_4: s.level_4,
    },
  });
  const competency = (c: RawCompetency): CompetencyNode => ({
    id: c.id,
    name: c.name,
    statement: c.statement,
    position: c.position,
    active: c.active ?? true,
    skills: c.skills.map(skill).sort(byPosition),
  });
  const block = (b: RawBlock): BlockNode => ({
    id: b.id,
    name: b.name,
    position: b.position,
    active: b.active ?? true,
    competencies: b.competencies.map(competency).sort(byPosition),
  });
  return { id, name, blocks: blocks.map(block).sort(byPosition) };
}

const SKILL_FIELDS = "id, name, statement, position, level_0, level_1, level_2, level_3, level_4";

/** Modèle global (super admin). */
export async function loadTemplateTree(templateId: string) {
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("framework_templates")
    .select("id, name, description, published")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) return null;

  const { data: blocks, error } = await supabase
    .from("template_blocks")
    .select(
      `id, name, position, competencies:template_competencies(id, name, statement, position, skills:template_skills(${SKILL_FIELDS}))`,
    )
    .eq("template_id", templateId);
  if (error) throw error;

  return { template, tree: toTree(template.id, template.name, (blocks ?? []) as RawBlock[]) };
}

/** Référentiel actif d'une entreprise, avec les sous-compétences déjà utilisées (non supprimables). */
export async function loadOrganizationTree(organizationId: string) {
  const supabase = await createClient();
  const { data: framework } = await supabase
    .from("frameworks")
    .select("id, name, source_template_id")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle();
  if (!framework) return null;

  const [{ data: blocks, error }, { data: used }] = await Promise.all([
    supabase
      .from("blocks")
      .select(
        `id, name, position, active, competencies(id, name, statement, position, active, skills(${SKILL_FIELDS}, active))`,
      )
      .eq("framework_id", framework.id),
    supabase.rpc("used_skill_ids", { org: organizationId }),
  ]);
  if (error) throw error;

  return {
    framework,
    tree: toTree(framework.id, framework.name, (blocks ?? []) as RawBlock[]),
    usedSkillIds: (used ?? []) as string[],
  };
}

export async function listTemplates(options: { publishedOnly?: boolean } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("framework_templates")
    .select(
      "id, name, description, published, updated_at, template_blocks(template_competencies(template_skills(id)))",
    )
    .order("name");
  if (options.publishedOnly) query = query.eq("published", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    published: t.published,
    skillCount: t.template_blocks
      .flatMap((b) => b.template_competencies)
      .flatMap((c) => c.template_skills).length,
  }));
}
