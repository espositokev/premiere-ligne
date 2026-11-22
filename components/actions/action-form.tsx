"use client";

import { useActionState, useEffect, useRef } from "react";

import { createAction, updateAction } from "@/app/actions/progress-actions";
import { Button } from "@/components/ui/button";
import { Field, FormFeedback, Select, SubmitButton } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

export type SkillGroup = { competency: string; skills: { id: string; name: string }[] };

/** Ajout ou modification d'une action du plan de progrès. */
export function ActionForm({
  slug,
  organizationId,
  memberId,
  skillGroups,
  self,
  action,
  onDone,
}: {
  slug: string;
  organizationId: string;
  memberId: string;
  skillGroups: SkillGroup[];
  self: boolean;
  action?: {
    id: string;
    title: string;
    description: string | null;
    skillId: string | null;
    dueDate: string | null;
  };
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(
    action ? updateAction : createAction,
    initialFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const prefix = action ? `action-${action.id}` : "new-action";

  useEffect(() => {
    if (state.status !== "success") return;
    if (action) onDone?.();
    else formRef.current?.reset();
  }, [state.status, state.nonce, action, onDone]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="member_id" value={memberId} />
      {action ? <input type="hidden" name="action_id" value={action.id} /> : null}
      <Field
        label={self ? "Ton action" : "Action"}
        htmlFor={`${prefix}-title`}
        error={state.fieldErrors?.title}
      >
        <Input
          id={`${prefix}-title`}
          name="title"
          required
          maxLength={200}
          defaultValue={action?.title}
          placeholder="Ex. : Proposer un essai à chaque client"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Compétence" htmlFor={`${prefix}-skill`} hint="Facultatif">
          <Select id={`${prefix}-skill`} name="skill_id" defaultValue={action?.skillId ?? ""}>
            <option value="">Aucune</option>
            {skillGroups.map((group) => (
              <optgroup key={group.competency} label={group.competency}>
                {group.skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field
          label="Échéance"
          htmlFor={`${prefix}-due`}
          hint="Facultatif"
          error={state.fieldErrors?.due_date}
        >
          <Input
            id={`${prefix}-due`}
            name="due_date"
            type="date"
            defaultValue={action?.dueDate ?? ""}
          />
        </Field>
      </div>
      <Field label="Détails" htmlFor={`${prefix}-description`} hint="Facultatif">
        <Textarea
          id={`${prefix}-description`}
          name="description"
          maxLength={2000}
          defaultValue={action?.description ?? ""}
        />
      </Field>
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Enregistrement…">
          {action ? "Enregistrer" : "Ajouter l'action"}
        </SubmitButton>
        {onDone ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            Annuler
          </Button>
        ) : null}
      </div>
    </form>
  );
}
