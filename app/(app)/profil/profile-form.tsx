"use client";

import { useActionState } from "react";

import { Field, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

import { updateProfile } from "./actions";

export function ProfileForm({
  firstName,
  lastName,
  phone,
}: {
  firstName: string;
  lastName: string;
  phone: string | null;
}) {
  const [state, action] = useActionState(updateProfile, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="first_name" error={errors.first_name}>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={firstName}
            required
            autoComplete="given-name"
          />
        </Field>
        <Field label="Nom" htmlFor="last_name" error={errors.last_name}>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={lastName}
            required
            autoComplete="family-name"
          />
        </Field>
      </div>
      <Field label="Téléphone (facultatif)" htmlFor="phone" error={errors.phone}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          autoComplete="tel"
          inputMode="tel"
        />
      </Field>
      <FormFeedback state={state} />
      <div>
        <SubmitButton>Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
