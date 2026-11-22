"use client";

import { useActionState, useState } from "react";

import { createOrganization } from "@/app/actions/organizations";
import { Field, FormFeedback, Select, SubmitButton } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/domain/slug";
import { initialFormState } from "@/lib/forms";

export function NewOrganizationForm({ templates }: { templates: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createOrganization, initialFormState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nom de l'entreprise" htmlFor="org-name" error={errors.name}>
        <Input
          id="org-name"
          name="name"
          required
          value={name}
          placeholder="Garage du Chay"
          onChange={(event) => {
            setName(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
        />
      </Field>
      <Field
        label="Adresse de l'espace"
        htmlFor="org-slug"
        error={errors.slug}
        hint={`L'espace sera accessible à l'adresse …/e/${slug || "nom-de-l-entreprise"}`}
      >
        <Input
          id="org-slug"
          name="slug"
          required
          value={slug}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(slugify(event.target.value));
          }}
        />
      </Field>
      <Field
        label="Matrice de départ"
        htmlFor="org-template"
        hint="Copiée dans l'espace du client ; vous l'adapterez ensemble sur le terrain."
      >
        <Select id="org-template" name="template_id" defaultValue={templates[0]?.id ?? ""}>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
          <option value="">Aucune pour l&apos;instant</option>
        </Select>
      </Field>
      <FormFeedback state={state} />
      <div>
        <SubmitButton pendingLabel="Création…">Créer l&apos;entreprise</SubmitButton>
      </div>
    </form>
  );
}
