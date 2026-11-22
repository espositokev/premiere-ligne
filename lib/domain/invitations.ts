/** Règles des invitations (§3.2, §8.5) : fonctions pures. */

export const INVITATION_VALIDITY_DAYS = 7;

export type InvitationState = "en_attente" | "acceptee" | "annulee" | "expiree";

export function invitationExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

export function invitationState(
  invitation: { accepted_at: string | null; revoked_at: string | null; expires_at: string },
  now: Date = new Date(),
): InvitationState {
  if (invitation.accepted_at) return "acceptee";
  if (invitation.revoked_at) return "annulee";
  if (new Date(invitation.expires_at).getTime() <= now.getTime()) return "expiree";
  return "en_attente";
}

export const INVITATION_STATE_LABELS: Record<InvitationState, string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  annulee: "Annulée",
  expiree: "Expirée",
};
