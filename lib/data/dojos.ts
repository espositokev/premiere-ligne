import "server-only";

import {
  parseDojoContent,
  type DojoContent,
  type DojoSource,
  type DojoStatus,
} from "@/lib/domain/dojo";
import { createClient } from "@/lib/supabase/server";

export type DojoSummary = {
  id: string;
  title: string;
  tagline: string | null;
  status: DojoStatus;
  source: DojoSource;
  skillId: string;
  createdBy: string | null;
  updatedAt: string | null;
};

export type DojoDetail = DojoSummary & {
  organizationId: string;
  content: DojoContent;
  pptxPath: string | null;
  skill: { id: string; name: string; statement: string | null; competencyName: string };
  authorName: string | null;
};

/** Dojos visibles de l'entreprise (un commercial ne reçoit que les validés, par la RLS). */
export async function listDojos(organizationId: string): Promise<DojoSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dojos")
    .select(
      "id, title, tagline:content->>tagline, status, source, skill_id, created_by, updated_at",
    )
    .eq("organization_id", organizationId)
    .neq("status", "archive")
    .order("title");
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    tagline: (d.tagline as string | null) ?? null,
    status: d.status,
    source: d.source,
    skillId: d.skill_id,
    createdBy: d.created_by,
    updatedAt: d.updated_at,
  }));
}

export async function getDojo(organizationId: string, id: string): Promise<DojoDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dojos")
    .select(
      "id, organization_id, title, content, status, source, skill_id, created_by, updated_at, pptx_path, skills!inner(id, name, statement, competencies!inner(name)), profiles(first_name, last_name)",
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const content = parseDojoContent(data.content);
  return {
    id: data.id,
    organizationId: data.organization_id,
    title: data.title,
    tagline: content.tagline,
    status: data.status,
    source: data.source,
    skillId: data.skill_id,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
    content,
    pptxPath: data.pptx_path,
    skill: {
      id: data.skills.id,
      name: data.skills.name,
      statement: data.skills.statement,
      competencyName: data.skills.competencies.name,
    },
    authorName: data.profiles ? `${data.profiles.first_name} ${data.profiles.last_name}` : null,
  };
}
