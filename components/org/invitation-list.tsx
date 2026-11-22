"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Send } from "lucide-react";
import { useActionState } from "react";

import { resendInvitationAction, revokeInvitationAction } from "@/app/actions/invitations";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import type { InvitationSummary } from "@/lib/data/organization";
import { INVITATION_STATE_LABELS, invitationState } from "@/lib/domain/invitations";
import { ROLE_LABELS } from "@/lib/domain/roles";
import { initialFormState } from "@/lib/forms";

export function InvitationList({
  organizationId,
  invitations,
}: {
  organizationId: string;
  invitations: InvitationSummary[];
}) {
  if (invitations.length === 0) {
    return <p className="text-sm text-muted">Aucune invitation en attente.</p>;
  }
  return (
    <ul className="divide-y divide-line rounded-(--radius-card) border border-line bg-surface">
      {invitations.map((invitation) => (
        <InvitationRow
          key={invitation.id}
          organizationId={organizationId}
          invitation={invitation}
        />
      ))}
    </ul>
  );
}

function InvitationRow({
  organizationId,
  invitation,
}: {
  organizationId: string;
  invitation: InvitationSummary;
}) {
  const [resendState, resend] = useActionState(resendInvitationAction, initialFormState);
  const [revokeState, revoke] = useActionState(revokeInvitationAction, initialFormState);
  const state = invitationState({
    accepted_at: invitation.acceptedAt,
    revoked_at: invitation.revokedAt,
    expires_at: invitation.expiresAt,
  });

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold">
          {invitation.firstName} {invitation.lastName}
        </p>
        <p className="truncate text-sm text-muted">{invitation.email}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge>{ROLE_LABELS[invitation.role]}</Badge>
          {invitation.teamName ? <Badge tone="muted">{invitation.teamName}</Badge> : null}
          <Badge tone={state === "expiree" ? "danger" : "warning"}>
            {INVITATION_STATE_LABELS[state]}
            {state === "en_attente"
              ? ` · jusqu'au ${format(new Date(invitation.expiresAt), "dd/MM/yyyy", { locale: fr })}`
              : ""}
          </Badge>
        </div>
        <div className="mt-2 empty:hidden">
          <FormFeedback state={resendState} />
          <FormFeedback state={revokeState} />
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <form action={resend}>
          <input type="hidden" name="organization_id" value={organizationId} />
          <input type="hidden" name="invitation_id" value={invitation.id} />
          <SubmitButton variant="outline" size="sm" pendingLabel="Envoi…">
            <Send aria-hidden="true" />
            Renvoyer
          </SubmitButton>
        </form>
        <form action={revoke}>
          <input type="hidden" name="organization_id" value={organizationId} />
          <input type="hidden" name="invitation_id" value={invitation.id} />
          <ConfirmSubmitButton
            label="Annuler"
            confirmLabel="Confirmer l'annulation"
            variant="ghost"
          />
        </form>
      </div>
    </li>
  );
}
