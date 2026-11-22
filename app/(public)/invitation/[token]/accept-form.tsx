"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  Checkbox,
  Field,
  FieldError,
  FormFeedback,
  SubmitButton,
} from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

import { acceptInvitation } from "./actions";

export function AcceptForm({
  token,
  firstName,
  lastName,
}: {
  token: string;
  firstName: string;
  lastName: string;
}) {
  const [state, action] = useActionState(acceptInvitation, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="first_name" error={errors.first_name}>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={firstName}
            autoComplete="given-name"
            required
            aria-invalid={Boolean(errors.first_name)}
            aria-describedby="first_name-error"
          />
        </Field>
        <Field label="Nom" htmlFor="last_name" error={errors.last_name}>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={lastName}
            autoComplete="family-name"
            required
            aria-invalid={Boolean(errors.last_name)}
            aria-describedby="last_name-error"
          />
        </Field>
      </div>
      <div>
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <Checkbox
            name="accept_terms"
            required
            className="mt-0.5"
            aria-describedby="accept_terms-error"
          />
          <span>
            J&apos;accepte les{" "}
            <Link href="/cgu" target="_blank" className="font-semibold text-forest-light underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link
              href="/confidentialite"
              target="_blank"
              className="font-semibold text-forest-light underline"
            >
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        <FieldError id="accept_terms-error" message={errors.accept_terms} />
      </div>
      <FormFeedback state={state} toastOnSuccess={false} />
      <SubmitButton pendingLabel="Création de votre accès…" className="w-full">
        Rejoindre l&apos;espace
      </SubmitButton>
    </form>
  );
}
