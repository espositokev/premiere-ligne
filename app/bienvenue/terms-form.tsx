"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Checkbox, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { initialFormState } from "@/lib/forms";

import { acceptTerms } from "./actions";

export function TermsForm() {
  const [state, action] = useActionState(acceptTerms, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex items-start gap-3 text-sm leading-relaxed">
        <Checkbox name="accept_terms" required className="mt-0.5" />
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
      <FormFeedback state={state} toastOnSuccess={false} />
      <SubmitButton className="w-full">Continuer</SubmitButton>
    </form>
  );
}
