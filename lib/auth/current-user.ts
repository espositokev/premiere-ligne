import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { SpaceRole } from "@/lib/domain/roles";
import { createClient } from "@/lib/supabase/server";
import type { OrgStatus } from "@/lib/supabase/types";

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isSuperAdmin: boolean;
  termsAcceptedAt: string | null;
};

export type Space = {
  organizationId: string;
  membershipId: string;
  name: string;
  slug: string;
  status: OrgStatus;
  role: SpaceRole;
};

/**
 * Utilisateur connecté, lu une seule fois par requête.
 * `getUser()` revalide le jeton auprès de Supabase : on ne fait jamais confiance au seul cookie.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, phone, is_super_admin, terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone,
    isSuperAdmin: profile.is_super_admin,
    termsAcceptedAt: profile.terms_accepted_at,
  };
});

/** Redirige vers la connexion si personne n'est connecté. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/espaces");
  return user;
}

/** Espaces entreprise actifs de l'utilisateur connecté (la RLS ne renvoie que les siens). */
export const getMySpaces = cache(async (): Promise<Space[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("id, role, organization_id, organizations!inner(name, slug, status)")
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.status", "actif")
    .order("created_at");

  return (data ?? []).map((m) => ({
    organizationId: m.organization_id,
    membershipId: m.id,
    name: m.organizations.name,
    slug: m.organizations.slug,
    status: m.organizations.status,
    role: m.role,
  }));
});
