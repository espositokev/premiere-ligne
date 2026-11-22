import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Indicateurs du tableau de bord super admin (§4.10). */
export async function getPlatformStats() {
  const supabase = await createClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: organizations }, { count: activeUsers }, { count: pendingInvitations }] =
    await Promise.all([
      supabase.from("organizations").select("id, status"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("last_seen_at", thirtyDaysAgo)
        .eq("is_super_admin", false),
      supabase
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", now.toISOString()),
    ]);

  return {
    organizations: organizations ?? [],
    activeUsers: activeUsers ?? 0,
    pendingInvitations: pendingInvitations ?? 0,
  };
}

export type OrganizationActivity = {
  id: string;
  name: string;
  slug: string;
  status: string;
  members: number;
  activeUsers30d: number;
  coachingsThisMonth: number;
  evaluationsThisMonth: number;
};

/** Activité par entreprise (§4.10 super admin) : utilisateurs actifs 30 j, coachings et évaluations du mois. */
export async function getOrganizationActivity(): Promise<OrganizationActivity[]> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const [{ data: organizations }, { data: members }, { data: coachings }, { data: evaluations }] =
    await Promise.all([
      supabase.from("organizations").select("id, name, slug, status").order("name"),
      supabase
        .from("memberships")
        .select("organization_id, active, profiles!inner(last_seen_at)")
        .eq("active", true),
      supabase
        .from("coachings")
        .select("organization_id")
        .eq("status", "cloture")
        .gte("closed_at", monthStart),
      supabase
        .from("evaluations")
        .select("organization_id")
        .eq("status", "validee")
        .gte("validated_at", monthStart),
    ]);
  const count = <T extends { organization_id: string }>(rows: T[] | null, org: string) =>
    (rows ?? []).filter((r) => r.organization_id === org).length;
  return (organizations ?? []).map((o) => {
    const orgMembers = (members ?? []).filter((m) => m.organization_id === o.id);
    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      status: o.status,
      members: orgMembers.length,
      activeUsers30d: orgMembers.filter(
        (m) => m.profiles.last_seen_at && m.profiles.last_seen_at >= thirtyDaysAgo,
      ).length,
      coachingsThisMonth: count(coachings, o.id),
      evaluationsThisMonth: count(evaluations, o.id),
    };
  });
}
