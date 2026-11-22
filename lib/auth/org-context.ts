import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import type { SpaceRole } from "@/lib/domain/roles";
import { createClient } from "@/lib/supabase/server";
import type { OrgStatus } from "@/lib/supabase/types";

import { requireUser, type CurrentUser } from "./current-user";

export type OrgContext = {
  user: CurrentUser;
  organization: { id: string; name: string; slug: string; status: OrgStatus };
  /** Rôle effectif : celui de l'appartenance, ou super_admin pour le fondateur. */
  role: SpaceRole;
  membershipId: string | null;
  /** Le super admin consulte l'espace sans en être membre. */
  isSuperAdminVisit: boolean;
};

/**
 * Charge l'entreprise d'une adresse /e/[slug] et le rôle de l'utilisateur dedans.
 * Une entreprise invisible (autre client, suspendue, membre désactivé) donne une page 404 :
 * on ne révèle pas son existence.
 */
export const getOrgContext = cache(async (slug: string): Promise<OrgContext> => {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!organization) notFound();

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (membership && organization.status === "actif") {
    return {
      user,
      organization,
      role: user.isSuperAdmin ? "super_admin" : membership.role,
      membershipId: membership.id,
      isSuperAdminVisit: false,
    };
  }

  if (user.isSuperAdmin) {
    return { user, organization, role: "super_admin", membershipId: null, isSuperAdminVisit: true };
  }

  notFound();
});
