"use client";

import { useActionState } from "react";

import { createDojoSession } from "@/app/actions/dojo-sessions";
import { Field, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

/** Formulaire « Noter une séance » d'un Dojo. */
export function SessionForm({
  slug,
  organizationId,
  dojoId,
  reps,
  scenarios,
  today,
  defaultMemberId,
}: {
  slug: string;
  organizationId: string;
  dojoId: string;
  reps: { id: string; name: string }[];
  scenarios: string[];
  today: string;
  defaultMemberId?: string;
}) {
  const [state, action] = useActionState(createDojoSession, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="dojo_id" value={dojoId} />

      <Field label="Date" htmlFor="held_on" error={errors.held_on}>
        <Input id="held_on" name="held_on" type="date" required max={today} defaultValue={today} />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Participants</legend>
        <ul className="grid gap-1 sm:grid-cols-2">
          {reps.map((rep) => (
            <li key={rep.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-(--radius-control) border border-line bg-surface px-3 has-checked:border-forest has-checked:bg-fluo/30">
                <input
                  type="checkbox"
                  name="member_ids"
                  value={rep.id}
                  defaultChecked={rep.id === defaultMemberId}
                  className="size-5 accent-(--color-forest)"
                />
                {rep.name}
              </label>
            </li>
          ))}
        </ul>
        {errors.member_ids ? (
          <p className="mt-2 text-sm font-medium text-danger">{errors.member_ids}</p>
        ) : null}
      </fieldset>

      {scenarios.length ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Scénario joué</legend>
          <div className="flex flex-col gap-1">
            {scenarios.map((title, i) => (
              <label
                key={i}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-(--radius-control) border border-line bg-surface px-3 has-checked:border-forest has-checked:bg-fluo/30"
              >
                <input
                  type="radio"
                  name="scenario"
                  value={i + 1}
                  className="size-4 accent-(--color-forest)"
                />
                <span>
                  <span className="font-semibold">Scénario {i + 1}</span> · {title}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <Field label="Ce qui a bien marché" htmlFor="went_well" error={errors.went_well}>
        <Textarea id="went_well" name="went_well" maxLength={2000} />
      </Field>
      <Field label="Axe prioritaire" htmlFor="priority_axis" error={errors.priority_axis}>
        <Textarea id="priority_axis" name="priority_axis" maxLength={1000} />
      </Field>
      <Field
        label="Engagement pris"
        htmlFor="commitment"
        hint="Ce que le ou les commerciaux s'engagent à faire"
        error={errors.commitment}
      >
        <Textarea id="commitment" name="commitment" maxLength={1000} />
      </Field>

      <FormFeedback state={state} />
      <div>
        <SubmitButton className="w-full sm:w-auto" pendingLabel="Enregistrement…">
          Enregistrer la séance
        </SubmitButton>
      </div>
    </form>
  );
}
