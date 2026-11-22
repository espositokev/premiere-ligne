"use client";

import { useActionState } from "react";

import { applyTemplate } from "@/app/actions/frameworks";
import { Field, FormFeedback, Select, SubmitButton } from "@/components/ui/form-controls";
import { initialFormState } from "@/lib/forms";

export function ApplyTemplateForm({
  organizationId,
  templates,
}: {
  organizationId: string;
  templates: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(applyTemplate, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="organization_id" value={organizationId} />
      <Field
        label="Modèle de départ"
        htmlFor="apply-template"
        error={state.fieldErrors?.template_id}
      >
        <Select id="apply-template" name="template_id" required defaultValue="">
          <option value="">Choisir un modèle</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
      </Field>
      <FormFeedback state={state} />
      <div>
        <SubmitButton pendingLabel="Copie du modèle…">Créer la matrice</SubmitButton>
      </div>
    </form>
  );
}
