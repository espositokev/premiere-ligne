import "server-only";

import type { EvaluationKind, EvaluationRecord, EvaluationStatus } from "@/lib/domain/evaluation";
import { createClient } from "@/lib/supabase/server";

import { listTeams } from "./organization";

export type MemberProfile = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  role: string;
  active: boolean;
  teamName: string | null;
  managerNames: string[];
  hiredAt: string | null;
  joinedAt: string;
};

/** Commercial visible par l'utilisateur connecté (null sinon : la base filtre). */
export async function loadMemberProfile(
  organizationId: string,
  memberId: string,
): Promise<MemberProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select(
      "id, user_id, role, job_title, team_id, active, hired_at, created_at, profiles!inner(first_name, last_name, email)",
    )
    .eq("organization_id", organizationId)
    .eq("id", memberId)
    .maybeSingle();
  if (!data) return null;

  const team = data.team_id
    ? (await listTeams(organizationId)).find((t) => t.id === data.team_id)
    : undefined;

  return {
    id: data.id,
    userId: data.user_id,
    firstName: data.profiles.first_name,
    lastName: data.profiles.last_name,
    email: data.profiles.email,
    jobTitle: data.job_title,
    role: data.role,
    active: data.active,
    teamName: team?.name ?? null,
    managerNames: team?.managerNames ?? [],
    hiredAt: data.hired_at,
    joinedAt: data.created_at,
  };
}

export type EvaluationDetail = EvaluationRecord & {
  subjectMembershipId: string;
  organizationId: string;
  authorName: string;
  authorUserId: string;
  generalComment: string | null;
  createdAt: string;
  updatedAt: string | null;
  comments: Record<string, string | null>;
};

const EVALUATION_FIELDS =
  "id, organization_id, subject_membership_id, kind, status, validated_at, general_comment, author_user_id, created_at, updated_at, profiles(first_name, last_name), evaluation_scores(skill_id, score, comment)";

type RawEvaluation = {
  id: string;
  organization_id: string;
  subject_membership_id: string;
  kind: EvaluationKind;
  status: EvaluationStatus;
  validated_at: string | null;
  general_comment: string | null;
  author_user_id: string;
  created_at: string;
  updated_at: string | null;
  profiles: { first_name: string; last_name: string } | null;
  evaluation_scores: { skill_id: string; score: number | null; comment: string | null }[];
};

function toDetail(raw: RawEvaluation): EvaluationDetail {
  return {
    id: raw.id,
    organizationId: raw.organization_id,
    subjectMembershipId: raw.subject_membership_id,
    kind: raw.kind,
    status: raw.status,
    validatedAt: raw.validated_at,
    generalComment: raw.general_comment,
    authorUserId: raw.author_user_id,
    authorName: raw.profiles ? `${raw.profiles.first_name} ${raw.profiles.last_name}` : "—",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    scores: Object.fromEntries(raw.evaluation_scores.map((s) => [s.skill_id, s.score])),
    comments: Object.fromEntries(raw.evaluation_scores.map((s) => [s.skill_id, s.comment])),
  };
}

/** Évaluations d'un commercial visibles par l'utilisateur, de la plus récente à la plus ancienne. */
export async function listEvaluations(memberId: string): Promise<EvaluationDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluations")
    .select(EVALUATION_FIELDS)
    .eq("subject_membership_id", memberId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RawEvaluation[])
    .map(toDetail)
    .sort((a, b) => (b.validatedAt ?? b.createdAt).localeCompare(a.validatedAt ?? a.createdAt));
}

export async function getEvaluation(evaluationId: string): Promise<EvaluationDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluations")
    .select(EVALUATION_FIELDS)
    .eq("id", evaluationId)
    .maybeSingle();
  return data ? toDetail(data as RawEvaluation) : null;
}

export type ManagerNote = {
  id: string;
  body: string;
  authorName: string;
  authorUserId: string;
  createdAt: string;
};

/** Notes privées : la base ne les renvoie qu'aux managers et responsables du commercial. */
export async function listManagerNotes(memberId: string): Promise<ManagerNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manager_notes")
    .select("id, body, author_user_id, created_at, profiles(first_name, last_name)")
    .eq("subject_membership_id", memberId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((n) => ({
    id: n.id,
    body: n.body,
    authorUserId: n.author_user_id,
    authorName: n.profiles ? `${n.profiles.first_name} ${n.profiles.last_name}` : "—",
    createdAt: n.created_at,
  }));
}

/** Le manager connecté peut-il encadrer ce commercial ? (même règle que la base) */
export async function canManageMember(memberId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_manage_member", { member: memberId });
  return data === true;
}
