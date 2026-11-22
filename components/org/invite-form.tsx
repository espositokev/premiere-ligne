"use client";

import { useActionState, useState } from "react";

import { inviteMember } from "@/app/actions/invitations";
import { Field, FormFeedback, Select, SubmitButton } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/domain/roles";
import { initialFormState } from "@/lib/forms";
import type { OrgRole } from "@/lib/supabase/types";

type InviteFormProps = {
  organizationId: string;
  roles: OrgRole[];
  teams: { id: string; name: string }[];
  defaultRole?: OrgRole;
};

/** Formulaire d'invitation (§3.2) : email, prénom, nom, rôle, équipe, poste. */
export function InviteForm({ organizationId, roles, teams, defaultRole }: InviteFormProps) {
  const [state, action] = useActionState(inviteMember, initialFormState);
  const [role, setRole] = useState<OrgRole>(defaultRole ?? roles[0] ?? "sales_rep");
  const errors = state.fieldErrors ?? {};
  const needsTeam = role === "sales_rep";

  return (
    // La clé change après chaque succès : le formulaire se vide pour l'invitation suivante.
    <form key={state.nonce ?? 0} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="organization_id" value={organizationId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="invite-first_name" error={errors.first_name}>
          <Input id="invite-first_name" name="first_name" required autoComplete="off" />
        </Field>
        <Field label="Nom" htmlFor="invite-last_name" error={errors.last_name}>
          <Input id="invite-last_name" name="last_name" required autoComplete="off" />
        </Field>
      </div>
      <Field label="Adresse email" htmlFor="invite-email" error={errors.email}>
        <Input
          id="invite-email"
          name="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoComplete="off"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {roles.length > 1 ? (
          <Field label="Rôle" htmlFor="invite-role" error={errors.role}>
            <Select
              id="invite-role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as OrgRole)}
            >
              {roles.map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="role" value={role} />
        )}
        {needsTeam ? (
          <Field label="Équipe" htmlFor="invite-team" error={errors.team_id}>
            <Select
              id="invite-team"
              name="team_id"
              required
              defaultValue={teams.length === 1 ? teams[0]?.id : ""}
            >
              {teams.length !== 1 ? <option value="">Choisir une équipe</option> : null}
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Poste (facultatif)" htmlFor="invite-job_title" error={errors.job_title}>
          <Input id="invite-job_title" name="job_title" placeholder="Conseiller commercial" />
        </Field>
      </div>
      {needsTeam && teams.length === 0 ? (
        <p className="text-sm text-muted">
          Créez d&apos;abord une équipe pour y inviter des commerciaux.
        </p>
      ) : null}
      <FormFeedback state={state} />
      <div>
        <SubmitButton
          pendingLabel="Envoi de l'invitation…"
          disabled={needsTeam && teams.length === 0}
        >
          Envoyer l&apos;invitation
        </SubmitButton>
      </div>
    </form>
  );
}
