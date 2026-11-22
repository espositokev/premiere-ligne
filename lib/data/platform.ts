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
