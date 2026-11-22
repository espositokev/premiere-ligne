"use client";

import { useActionState } from "react";

import { createTeam, updateTeam } from "@/app/actions/teams";
import { Checkbox, Field, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

type TeamFormProps = {
  organizationId: string;
  /** Managers et responsables qui peuvent manager une équipe. */
  candidates: { id: string; name: string }[];
  team?: { id: string; name: string; managerIds: string[] };
};

export function TeamForm({ organizationId, candidates, team }: TeamFormProps) {
  const [state, action] = useActionState(team ? updateTeam : createTeam, initialFormState);
  const errors = state.fieldErrors ?? {};
  const prefix = team ? `team-${team.id}` : "team-new";

  return (
    <form key={team ? team.id : (state.nonce ?? 0)} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="organization_id" value={organizationId} />
      {team ? <input type="hidden" name="team_id" value={team.id} /> : null}
      <Field label="Nom de l'équipe" htmlFor={`${prefix}-name`} error={errors.name}>
        <Input
          id={`${prefix}-name`}
          name="name"
          defaultValue={team?.name ?? ""}
          required
          placeholder="Équipe Nord"
        />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Manager(s)</legend>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">
            Invitez d&apos;abord un manager pour l&apos;attribuer à l&apos;équipe.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {candidates.map((candidate) => (
              <label
                key={candidate.id}
                className="flex min-h-11 items-center gap-3 rounded-(--radius-control) px-2 hover:bg-bone"
              >
                <Checkbox
                  name="manager_ids"
                  value={candidate.id}
                  defaultChecked={team?.managerIds.includes(candidate.id)}
                />
                <span>{candidate.name}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <FormFeedback state={state} />
      <div>
        <SubmitButton>{team ? "Enregistrer" : "Créer l'équipe"}</SubmitButton>
      </div>
    </form>
  );
}
