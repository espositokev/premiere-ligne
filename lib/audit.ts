import "server-only";

import type { Json } from "@/lib/supabase/types";
import { createServiceClient } from "@/lib/supabase/service";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "organization.created"
  | "organization.updated"
  | "organization.status_changed"
  | "invitation.created"
  | "invitation.resent"
  | "invitation.revoked"
  | "invitation.accepted"
  | "member.updated"
  | "member.role_changed"
  | "member.deactivated"
  | "member.reactivated"
  | "team.created"
  | "team.updated"
  | "profile.updated";

/**
 * Journal d'activité (§4.12). Écrit avec la clé serveur : les utilisateurs ne peuvent pas
 * y écrire eux-mêmes. Un échec d'écriture du journal ne bloque jamais l'action de l'utilisateur.
 */
export async function audit(entry: {
  action: AuditAction;
  actorUserId: string | null;
  organizationId?: string | null;
  targetType?: string;
  targetId?: string | null;
  details?: Json;
}): Promise<void> {
  try {
    const service = createServiceClient();
    const { error } = await service.from("audit_log").insert({
      action: entry.action,
      actor_user_id: entry.actorUserId,
      organization_id: entry.organizationId ?? null,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      details: entry.details ?? null,
    });
    if (error) console.error("[audit] écriture impossible", error.message);
  } catch (error) {
    console.error("[audit] écriture impossible", error);
  }
}
