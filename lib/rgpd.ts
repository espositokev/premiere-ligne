import "server-only";

import { getActivePreview } from "@/lib/auth/preview";
import { createServiceClient } from "@/lib/supabase/service";
import { createSessionClient } from "@/lib/supabase/session";

/**
 * Droits RGPD (§14) : toujours vérifiés avec la vraie session avant d'utiliser la clé serveur.
 * Le super admin agit partout, le responsable dans son entreprise.
 */
export async function canAdministerMembership(memberId: string) {
  // Pendant un « voir en tant que », rien ne s'écrit ni ne s'exporte au nom de la personne regardée.
  if (await getActivePreview()) return null;
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: member } = await service
    .from("memberships")
    .select("id, organization_id, user_id, active, role")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return null;
  const [{ data: me }, { data: isAdmin }] = await Promise.all([
    supabase.from("profiles").select("is_super_admin").eq("id", user.id).single(),
    supabase.rpc("is_org_admin", { org: member.organization_id }),
  ]);
  if (!me?.is_super_admin && isAdmin !== true) return null;
  return { actorId: user.id, member };
}

/** Toutes les données personnelles d'une personne dans une entreprise, pour un export (droit d'accès). */
export async function collectMemberData(memberId: string, organizationId: string, userId: string) {
  const service = createServiceClient();
  const by = <T>(promise: PromiseLike<{ data: T | null }>) => promise.then((r) => r.data ?? []);
  const [profile, membership, evaluations, coachings, actions, requests, notes, sessions] =
    await Promise.all([
      service
        .from("profiles")
        .select(
          "id, email, first_name, last_name, phone, created_at, last_seen_at, terms_accepted_at",
        )
        .eq("id", userId)
        .single()
        .then((r) => r.data),
      service
        .from("memberships")
        .select(
          "id, role, job_title, hired_at, active, created_at, teams(name), organizations(name)",
        )
        .eq("id", memberId)
        .single()
        .then((r) => r.data),
      by(
        service
          .from("evaluations")
          .select(
            "id, kind, status, general_comment, validated_at, created_at, evaluation_scores(score, comment, skills(name))",
          )
          .eq("subject_membership_id", memberId),
      ),
      by(
        service
          .from("coachings")
          .select(
            "id, scheduled_at, duration_minutes, mode, location, objective, status, rep_comment, closed_at, coaching_reports(context, strengths, improvements), coaching_observations(score, comment, skills(name)), coaching_skills(skills(name))",
          )
          .eq("subject_membership_id", memberId),
      ),
      by(
        service
          .from("actions")
          .select("title, description, due_date, status, source, done_at, created_at, skills(name)")
          .eq("subject_membership_id", memberId),
      ),
      by(
        service
          .from("coaching_requests")
          .select("message, status, answer, created_at, coaching_request_skills(skills(name))")
          .eq("requester_membership_id", memberId),
      ),
      by(
        service
          .from("manager_notes")
          .select("body, created_at")
          .eq("subject_membership_id", memberId),
      ),
      by(
        service
          .from("dojo_session_participants")
          .select(
            "dojo_sessions(held_on, scenario, went_well, priority_axis, commitment, dojos(title))",
          )
          .eq("membership_id", memberId),
      ),
    ]);
  return {
    exported_at: new Date().toISOString(),
    organization_id: organizationId,
    profile,
    membership,
    evaluations,
    coachings,
    actions,
    coaching_requests: requests,
    manager_notes: notes,
    dojo_sessions: sessions,
  };
}
