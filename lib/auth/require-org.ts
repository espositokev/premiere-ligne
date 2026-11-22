import "server-only";

import { redirect } from "next/navigation";

import { canAdministerOrg, isCoach } from "@/lib/domain/roles";

import { getOrgContext, type OrgContext } from "./org-context";

/** Pages de paramètres : responsable ou super admin uniquement. */
export async function requireOrgAdmin(slug: string): Promise<OrgContext> {
  const context = await getOrgContext(slug);
  if (!canAdministerOrg(context.role)) redirect(`/e/${slug}`);
  return context;
}

/** Pages d'encadrement (équipe, coachings) : tout sauf les commerciaux. */
export async function requireCoach(slug: string): Promise<OrgContext> {
  const context = await getOrgContext(slug);
  if (!isCoach(context.role)) redirect(`/e/${slug}/moi`);
  return context;
}
