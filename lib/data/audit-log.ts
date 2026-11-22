import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AuditEntry = {
  id: number;
  action: string;
  actorName: string;
  organizationName: string | null;
  targetType: string | null;
  details: unknown;
  createdAt: string;
};

export const AUDIT_PAGE_SIZE = 100;

/** Journal visible par l'utilisateur (la base filtre : tout pour le super admin, son entreprise pour le responsable). */
export async function listAudit(
  filters: { organizationId?: string; prefix?: string; before?: number } = {},
) {
  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select(
      "id, action, target_type, details, created_at, profiles(first_name, last_name), organizations(name)",
    )
    .order("id", { ascending: false })
    .limit(AUDIT_PAGE_SIZE + 1);
  if (filters.organizationId) query = query.eq("organization_id", filters.organizationId);
  if (filters.prefix) query = query.like("action", `${filters.prefix}%`);
  if (filters.before) query = query.lt("id", filters.before);
  const { data, error } = await query;
  if (error) throw error;
  type Raw = {
    id: number;
    action: string;
    target_type: string | null;
    details: unknown;
    created_at: string;
    profiles: { first_name: string; last_name: string } | null;
    organizations: { name: string } | null;
  };
  const rows = (data ?? []) as unknown as Raw[];
  return {
    entries: rows.slice(0, AUDIT_PAGE_SIZE).map((r): AuditEntry => ({
      id: r.id,
      action: r.action,
      actorName: r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : "Système",
      organizationName: r.organizations?.name ?? null,
      targetType: r.target_type,
      details: r.details,
      createdAt: r.created_at,
    })),
    nextBefore: rows.length > AUDIT_PAGE_SIZE ? rows[AUDIT_PAGE_SIZE - 1]?.id : undefined,
  };
}
