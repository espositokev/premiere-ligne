import "server-only";

import {
  parseActionPlan,
  type ActionPlanItem,
  type CoachingMode,
  type CoachingStatus,
} from "@/lib/domain/coaching";
import { createClient } from "@/lib/supabase/server";

type Person = { profiles: { first_name: string; last_name: string } | null } | null;

function fullName(
  person: Person | { first_name: string; last_name: string } | null,
  fallback = "—",
) {
  if (!person) return fallback;
  if ("profiles" in person) {
    return person.profiles
      ? `${person.profiles.first_name} ${person.profiles.last_name}`
      : fallback;
  }
  return `${person.first_name} ${person.last_name}`;
}

export type CoachingSummary = {
  id: string;
  organizationId: string;
  subjectMembershipId: string;
  subjectName: string;
  coachUserId: string;
  coachName: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: CoachingMode;
  location: string | null;
  objective: string | null;
  status: CoachingStatus;
  cancelReason: string | null;
  closedAt: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  repComment: string | null;
  requestId: string | null;
  skills: { id: string; name: string }[];
};

const COACHING_FIELDS = `id, organization_id, subject_membership_id, coach_user_id, scheduled_at, duration_minutes, mode,
  location, objective, status, cancel_reason, closed_at, reopened_at, reopen_reason, rep_comment, request_id,
  subject:memberships!coachings_subject_membership_id_organization_id_fkey(profiles(first_name, last_name)),
  coach:profiles!coachings_coach_user_id_fkey(first_name, last_name),
  coaching_skills(skill_id, skills(name))`;

type RawCoaching = {
  id: string;
  organization_id: string;
  subject_membership_id: string;
  coach_user_id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: CoachingMode;
  location: string | null;
  objective: string | null;
  status: CoachingStatus;
  cancel_reason: string | null;
  closed_at: string | null;
  reopened_at: string | null;
  reopen_reason: string | null;
  rep_comment: string | null;
  request_id: string | null;
  subject: Person;
  coach: { first_name: string; last_name: string } | null;
  coaching_skills: { skill_id: string; skills: { name: string } | null }[];
};

function toSummary(raw: RawCoaching): CoachingSummary {
  return {
    id: raw.id,
    organizationId: raw.organization_id,
    subjectMembershipId: raw.subject_membership_id,
    subjectName: fullName(raw.subject),
    coachUserId: raw.coach_user_id,
    coachName: fullName(raw.coach, "Votre manager"),
    scheduledAt: raw.scheduled_at,
    durationMinutes: raw.duration_minutes,
    mode: raw.mode,
    location: raw.location,
    objective: raw.objective,
    status: raw.status,
    cancelReason: raw.cancel_reason,
    closedAt: raw.closed_at,
    reopenedAt: raw.reopened_at,
    reopenReason: raw.reopen_reason,
    repComment: raw.rep_comment,
    requestId: raw.request_id,
    skills: raw.coaching_skills.map((s) => ({ id: s.skill_id, name: s.skills?.name ?? "—" })),
  };
}

/** Coachings visibles par l'utilisateur (la base filtre : ses commerciaux, ou lui-même). */
export async function listCoachings(
  organizationId: string,
  filters: { memberId?: string; from?: string; to?: string } = {},
): Promise<CoachingSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("coachings")
    .select(COACHING_FIELDS)
    .eq("organization_id", organizationId)
    .order("scheduled_at", { ascending: false })
    .limit(500);
  if (filters.memberId) query = query.eq("subject_membership_id", filters.memberId);
  if (filters.from) query = query.gte("scheduled_at", filters.from);
  if (filters.to) query = query.lt("scheduled_at", filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as RawCoaching[]).map(toSummary);
}

export type CoachingReport = {
  context: string | null;
  strengths: string | null;
  improvements: string | null;
  actionPlan: ActionPlanItem[];
};

export type CoachingDetail = CoachingSummary & {
  /** null tant que le commercial n'y a pas accès (CR non clôturé) ou qu'il n'a pas commencé. */
  report: CoachingReport | null;
  observations: Record<string, { score: number | null; comment: string | null }>;
  actionIds: string[];
};

export async function getCoaching(coachingId: string): Promise<CoachingDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coachings")
    .select(COACHING_FIELDS)
    .eq("id", coachingId)
    .maybeSingle();
  if (!data) return null;
  const [{ data: report }, { data: observations }, { data: actions }] = await Promise.all([
    supabase
      .from("coaching_reports")
      .select("context, strengths, improvements, action_plan")
      .eq("coaching_id", coachingId)
      .maybeSingle(),
    supabase
      .from("coaching_observations")
      .select("skill_id, score, comment")
      .eq("coaching_id", coachingId),
    supabase.from("actions").select("id").eq("coaching_id", coachingId),
  ]);
  return {
    ...toSummary(data as unknown as RawCoaching),
    report: report
      ? {
          context: report.context,
          strengths: report.strengths,
          improvements: report.improvements,
          actionPlan: parseActionPlan(report.action_plan),
        }
      : null,
    observations: Object.fromEntries(
      (observations ?? []).map((o) => [o.skill_id, { score: o.score, comment: o.comment }]),
    ),
    actionIds: (actions ?? []).map((a) => a.id),
  };
}

/** Notes « observées en coaching » d'un commercial, par sous-compétence (la plus récente). */
export async function latestObservedScores(memberId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coachings")
    .select("closed_at, coaching_observations(skill_id, score)")
    .eq("subject_membership_id", memberId)
    .eq("status", "cloture")
    .order("closed_at", { ascending: false })
    .limit(50);
  const result = new Map<string, { score: number; observedAt: string }>();
  for (const coaching of data ?? []) {
    for (const o of coaching.coaching_observations) {
      if (o.score !== null && !result.has(o.skill_id) && coaching.closed_at) {
        result.set(o.skill_id, { score: o.score, observedAt: coaching.closed_at });
      }
    }
  }
  return result;
}

export type CoachingRequestSummary = {
  id: string;
  requesterMembershipId: string;
  requesterName: string;
  message: string | null;
  status: "en_attente" | "acceptee" | "refusee";
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  skills: { id: string; name: string }[];
};

export async function listCoachingRequests(
  organizationId: string,
  filters: { memberId?: string; pendingOnly?: boolean } = {},
): Promise<CoachingRequestSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("coaching_requests")
    .select(
      `id, requester_membership_id, message, status, answer, answered_at, created_at,
       requester:memberships!coaching_requests_requester_membership_id_organization_id_fkey(profiles(first_name, last_name)),
       coaching_request_skills(skill_id, skills(name))`,
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.memberId) query = query.eq("requester_membership_id", filters.memberId);
  if (filters.pendingOnly) query = query.eq("status", "en_attente");
  const { data, error } = await query;
  if (error) throw error;
  type Raw = {
    id: string;
    requester_membership_id: string;
    message: string | null;
    status: "en_attente" | "acceptee" | "refusee";
    answer: string | null;
    answered_at: string | null;
    created_at: string;
    requester: Person;
    coaching_request_skills: { skill_id: string; skills: { name: string } | null }[];
  };
  return ((data ?? []) as unknown as Raw[]).map((r) => ({
    id: r.id,
    requesterMembershipId: r.requester_membership_id,
    requesterName: fullName(r.requester),
    message: r.message,
    status: r.status,
    answer: r.answer,
    answeredAt: r.answered_at,
    createdAt: r.created_at,
    skills: r.coaching_request_skills.map((s) => ({ id: s.skill_id, name: s.skills?.name ?? "—" })),
  }));
}

/** Commerciaux que l'utilisateur peut coacher (la base filtre), pour les formulaires. */
export async function listCoachableReps(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("id, active, profiles!inner(first_name, last_name)")
    .eq("organization_id", organizationId)
    .eq("role", "sales_rep")
    .eq("active", true);
  const reps = await Promise.all(
    (data ?? []).map(async (m) => {
      const { data: ok } = await supabase.rpc("can_manage_member", { member: m.id });
      return ok ? { id: m.id, name: `${m.profiles.first_name} ${m.profiles.last_name}` } : null;
    }),
  );
  return reps
    .filter((r): r is { id: string; name: string } => r !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
