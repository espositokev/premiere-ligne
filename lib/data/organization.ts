import "server-only";

import type { OrgRole } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Lectures d'un espace entreprise, toujours avec le client de l'utilisateur :
 * la RLS ne renvoie que ce qu'il a le droit de voir (un manager ne reçoit que ses équipes).
 */

export type MemberSummary = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: OrgRole;
  jobTitle: string | null;
  teamId: string | null;
  teamName: string | null;
  active: boolean;
  lastSeenAt: string | null;
};

export type TeamSummary = {
  id: string;
  name: string;
  active: boolean;
  managerIds: string[];
  managerNames: string[];
  memberCount: number;
};

export type InvitationSummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: OrgRole;
  teamName: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSentAt: string | null;
};

export async function listMembers(organizationId: string): Promise<MemberSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "id, user_id, role, job_title, team_id, active, profiles!inner(first_name, last_name, email, last_seen_at), teams(name)",
    )
    .eq("organization_id", organizationId);
  if (error) throw error;

  return (data ?? [])
    .map((m) => ({
      id: m.id,
      userId: m.user_id,
      firstName: m.profiles.first_name,
      lastName: m.profiles.last_name,
      email: m.profiles.email,
      role: m.role,
      jobTitle: m.job_title,
      teamId: m.team_id,
      teamName: m.teams?.name ?? null,
      active: m.active,
      lastSeenAt: m.profiles.last_seen_at,
    }))
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"),
    );
}

export async function listTeams(organizationId: string): Promise<TeamSummary[]> {
  const supabase = await createClient();
  const [{ data: teams, error }, { data: managers }, { data: reps }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, active")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("team_managers")
      .select("team_id, membership_id, memberships!inner(profiles!inner(first_name, last_name))")
      .eq("organization_id", organizationId),
    supabase
      .from("memberships")
      .select("team_id")
      .eq("organization_id", organizationId)
      .eq("role", "sales_rep")
      .eq("active", true)
      .not("team_id", "is", null),
  ]);
  if (error) throw error;

  return (teams ?? []).map((team) => {
    const teamManagers = (managers ?? []).filter((m) => m.team_id === team.id);
    return {
      id: team.id,
      name: team.name,
      active: team.active,
      managerIds: teamManagers.map((m) => m.membership_id),
      managerNames: teamManagers.map(
        (m) => `${m.memberships.profiles.first_name} ${m.memberships.profiles.last_name}`,
      ),
      memberCount: (reps ?? []).filter((r) => r.team_id === team.id).length,
    };
  });
}

export async function listInvitations(organizationId: string): Promise<InvitationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select(
      "id, email, first_name, last_name, role, expires_at, accepted_at, revoked_at, last_sent_at, teams(name)",
    )
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    firstName: i.first_name,
    lastName: i.last_name,
    role: i.role,
    teamName: i.teams?.name ?? null,
    expiresAt: i.expires_at,
    acceptedAt: i.accepted_at,
    revokedAt: i.revoked_at,
    lastSentAt: i.last_sent_at,
  }));
}

/** Équipes qu'un membre manage (pour proposer l'invitation de commerciaux). */
export async function listManagedTeamIds(membershipId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_managers")
    .select("team_id")
    .eq("membership_id", membershipId);
  return (data ?? []).map((row) => row.team_id);
}
