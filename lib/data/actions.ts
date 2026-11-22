import "server-only";

import type { ActionSource, ActionStatus } from "@/lib/domain/actions";
import { createClient } from "@/lib/supabase/server";

export type ActionItem = {
  id: string;
  subjectMembershipId: string;
  subjectName: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: ActionStatus;
  source: ActionSource;
  coachingId: string | null;
  skillId: string | null;
  skillName: string | null;
  createdBy: string;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type Raw = {
  id: string;
  subject_membership_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: ActionStatus;
  source: ActionSource;
  coaching_id: string | null;
  skill_id: string | null;
  created_by: string;
  done_at: string | null;
  created_at: string;
  updated_at: string | null;
  skills: { name: string } | null;
  subject: { profiles: { first_name: string; last_name: string } | null } | null;
};

/** Actions visibles (la base filtre : ses commerciaux, ou soi-même). */
export async function listActions(
  organizationId: string,
  filters: { memberId?: string; skillId?: string } = {},
): Promise<ActionItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("actions")
    .select(
      `id, subject_membership_id, title, description, due_date, status, source, coaching_id, skill_id,
       created_by, done_at, created_at, updated_at,
       skills(name),
       subject:memberships!actions_subject_membership_id_organization_id_fkey(profiles(first_name, last_name))`,
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (filters.memberId) query = query.eq("subject_membership_id", filters.memberId);
  if (filters.skillId) query = query.eq("skill_id", filters.skillId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Raw[]).map((a) => ({
    id: a.id,
    subjectMembershipId: a.subject_membership_id,
    subjectName: a.subject?.profiles
      ? `${a.subject.profiles.first_name} ${a.subject.profiles.last_name}`
      : "—",
    title: a.title,
    description: a.description,
    dueDate: a.due_date,
    status: a.status,
    source: a.source,
    coachingId: a.coaching_id,
    skillId: a.skill_id,
    skillName: a.skills?.name ?? null,
    createdBy: a.created_by,
    doneAt: a.done_at,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }));
}
