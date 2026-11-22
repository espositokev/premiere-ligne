import "server-only";

import { cache } from "react";

import { now as currentTime } from "@/lib/clock";
import { groupCoachings, todayInZone } from "@/lib/domain/coaching";
import {
  averageMastery,
  closedPerMonth,
  coverageRate,
  repRows,
  reportsOnTimeRate,
  teamRadar,
  weakestSkills,
  withoutCoaching,
} from "@/lib/domain/dashboard";
import type { EvaluationRecord } from "@/lib/domain/evaluation";
import { canAdministerOrg, type SpaceRole } from "@/lib/domain/roles";
import { createClient } from "@/lib/supabase/server";

import { listActions } from "./actions";
import { listCoachingRequests, listCoachings } from "./coachings";
import { loadOrganizationTree } from "./framework";
import { listMembers } from "./organization";
import { getOrgSettings } from "./settings";

/** Commerciaux actifs suivis : tous pour un responsable, ceux de ses équipes pour un manager. */
export const listFollowedReps = cache(async (organizationId: string, role: SpaceRole) => {
  const members = await listMembers(organizationId);
  const reps = members.filter((m) => m.role === "sales_rep" && m.active);
  if (canAdministerOrg(role)) return reps;
  const supabase = await createClient();
  const { data } = await supabase.rpc("managed_member_ids", { org: organizationId });
  const managed = new Set(Array.isArray(data) ? data : []);
  return reps.filter((r) => managed.has(r.id));
});

async function listOrgEvaluations(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluations")
    .select(
      "id, subject_membership_id, kind, status, validated_at, evaluation_scores(skill_id, score)",
    )
    .eq("organization_id", organizationId)
    .eq("kind", "manager")
    .eq("status", "validee")
    .limit(5000);
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    subjectMembershipId: e.subject_membership_id,
    kind: e.kind,
    status: e.status,
    validatedAt: e.validated_at,
    scores: Object.fromEntries(e.evaluation_scores.map((s) => [s.skill_id, s.score])),
  }));
}

/** Toutes les données du tableau de bord manager / responsable (§4.10). */
export async function loadDashboard(organizationId: string, role: SpaceRole) {
  const now = currentTime();
  const today = todayInZone(now);
  const [reps, framework, evaluations, coachings, actions, requests, settings] = await Promise.all([
    listFollowedReps(organizationId, role),
    loadOrganizationTree(organizationId),
    listOrgEvaluations(organizationId),
    listCoachings(organizationId),
    listActions(organizationId),
    listCoachingRequests(organizationId, { pendingOnly: true }),
    getOrgSettings(organizationId),
  ]);
  const followed = new Set(reps.map((r) => r.id));
  const tree = framework?.tree ?? { id: "", name: "", blocks: [] };
  const teamCoachings = coachings.filter((c) => followed.has(c.subjectMembershipId));
  const teamEvaluations = evaluations.filter((e) => followed.has(e.subjectMembershipId));
  const rows = repRows({
    reps: reps.map((r) => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`,
      teamId: r.teamId,
      teamName: r.teamName,
    })),
    tree,
    evaluations: teamEvaluations,
    coachings: teamCoachings,
    actions: actions.filter((a) => followed.has(a.subjectMembershipId)),
    now,
    today,
  });
  const byRep: EvaluationRecord[][] = reps.map((r) =>
    teamEvaluations.filter((e) => e.subjectMembershipId === r.id),
  );
  const groups = groupCoachings(teamCoachings, now);
  const in14days = new Date(now.getTime() + 14 * 86_400_000).toISOString();

  const teams = [...new Set(rows.map((r) => r.teamName ?? "Sans équipe"))].sort().map((name) => {
    const teamRows = rows.filter((r) => (r.teamName ?? "Sans équipe") === name);
    return {
      name,
      reps: teamRows.length,
      mastery: averageMastery(teamRows),
      coverage: coverageRate(teamRows, now),
      withoutCoaching: withoutCoaching(teamRows, settings.daysWithoutCoaching).length,
      overdueActions: teamRows.reduce((s, r) => s + r.overdueActions, 0),
    };
  });

  return {
    now,
    settings,
    hasFramework: framework !== null,
    rows,
    teams,
    toWrite: groups.toWrite,
    upcoming: groups.upcoming.filter((c) => c.scheduledAt < in14days),
    requests: requests.filter((r) => followed.has(r.requesterMembershipId)),
    withoutCoaching: withoutCoaching(rows, settings.daysWithoutCoaching),
    radar: teamRadar(tree, byRep),
    weakest: weakestSkills(tree, byRep, 5),
    perMonth: closedPerMonth(teamCoachings, now, 6),
    onTimeRate: reportsOnTimeRate(teamCoachings, now),
    coverage: coverageRate(rows, now),
    mastery: averageMastery(rows),
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
