"use client";

import { useActionState } from "react";

import { updateTemplate } from "@/app/actions/frameworks";
import { Field, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

export function TemplateMetaForm({
  id,
  name,
  description,
}: {
  id: string;
  name: string;
  description: string | null;
}) {
  const [state, action] = useActionState(updateTemplate, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Nom" htmlFor="meta-name" error={errors.name}>
        <Input id="meta-name" name="name" defaultValue={name} required />
      </Field>
      <Field label="Description" htmlFor="meta-description" error={errors.description}>
        <Textarea
          id="meta-description"
          name="description"
          defaultValue={description ?? ""}
          className="min-h-16"
        />
      </Field>
      <FormFeedback state={state} />
      <div>
        <SubmitButton size="sm">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
