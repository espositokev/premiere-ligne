"use client";

import { useActionState } from "react";

import { createTemplate } from "@/app/actions/frameworks";
import { Field, FormFeedback, Select, SubmitButton } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

export function NewTemplateForm({ templates }: { templates: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createTemplate, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nom du modèle" htmlFor="template-name" error={errors.name}>
        <Input id="template-name" name="name" required placeholder="Vente en boutique" />
      </Field>
      <Field
        label="Description (facultatif)"
        htmlFor="template-description"
        error={errors.description}
      >
        <Textarea id="template-description" name="description" className="min-h-16" />
      </Field>
      <Field
        label="Partir de"
        htmlFor="template-source"
        hint="Copier un modèle existant fait gagner du temps."
      >
        <Select id="template-source" name="source_id" defaultValue="">
          <option value="">Un modèle vide</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              Copie de « {template.name} »
            </option>
          ))}
        </Select>
      </Field>
      <FormFeedback state={state} />
      <div>
        <SubmitButton pendingLabel="Création…">Créer le modèle</SubmitButton>
      </div>
    </form>
  );
}
