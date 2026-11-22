import type { OrgRole } from "@/lib/supabase/types";

/** Rôle effectif dans un espace entreprise : le super admin y entre avec ses propres droits. */
export type SpaceRole = OrgRole | "super_admin";

export const ROLE_LABELS: Record<SpaceRole, string> = {
  super_admin: "Super admin",
  org_admin: "Responsable",
  manager: "Manager",
  sales_rep: "Commercial",
};

/** Peut gérer les utilisateurs, les équipes et le référentiel de l'entreprise (§2.2). */
export function canAdministerOrg(role: SpaceRole): boolean {
  return role === "super_admin" || role === "org_admin";
}

/** Rôles qu'un utilisateur peut inviter (§2.2). */
export function invitableRoles(role: SpaceRole): OrgRole[] {
  if (canAdministerOrg(role)) return ["org_admin", "manager", "sales_rep"];
  if (role === "manager") return ["sales_rep"];
  return [];
}

/** Un utilisateur qui coache des commerciaux (voit un tableau de bord d'équipe). */
export function isCoach(role: SpaceRole): boolean {
  return role !== "sales_rep";
}
