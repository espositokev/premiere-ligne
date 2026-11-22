"use client";

import { useActionState, useState } from "react";

import { updateMember } from "@/app/actions/members";
import { Field, FormFeedback, Select, SubmitButton } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/domain/roles";
import { initialFormState } from "@/lib/forms";
import type { OrgRole } from "@/lib/supabase/types";

export function MemberEditForm({
  member,
  teams,
  isSelf,
}: {
  member: { id: string; role: OrgRole; teamId: string | null; jobTitle: string | null };
  teams: { id: string; name: string }[];
  isSelf: boolean;
}) {
  const [state, action] = useActionState(updateMember, initialFormState);
  const [role, setRole] = useState<OrgRole>(member.role);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="membership_id" value={member.id} />
      <Field
        label="Rôle"
        htmlFor="member-role"
        error={errors.role}
        hint={isSelf ? "Vous ne pouvez pas changer votre propre rôle." : undefined}
      >
        <Select
          id="member-role"
          name="role"
          value={role}
          disabled={isSelf}
          onChange={(event) => setRole(event.target.value as OrgRole)}
        >
          {(["org_admin", "manager", "sales_rep"] as const).map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </Select>
        {isSelf ? <input type="hidden" name="role" value={role} /> : null}
      </Field>
      {role === "sales_rep" ? (
        <Field label="Équipe" htmlFor="member-team" error={errors.team_id}>
          <Select id="member-team" name="team_id" defaultValue={member.teamId ?? ""} required>
            <option value="">Choisir une équipe</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label="Poste (facultatif)" htmlFor="member-job_title" error={errors.job_title}>
        <Input id="member-job_title" name="job_title" defaultValue={member.jobTitle ?? ""} />
      </Field>
      <FormFeedback state={state} />
      <div>
        <SubmitButton>Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
