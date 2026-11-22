"use client";

import { useActionState } from "react";

import { purgeOrganization } from "@/app/actions/rgpd";
import { Field, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

/** Suppression définitive d'une entreprise : il faut retaper son adresse pour confirmer. */
export function PurgeForm({ organizationId, slug }: { organizationId: string; slug: string }) {
  const [state, action] = useActionState(purgeOrganization, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="organization_id" value={organizationId} />
      <Field
        label={`Tapez « ${slug} » pour confirmer`}
        htmlFor="purge-confirmation"
        error={state.fieldErrors?.confirmation}
      >
        <Input id="purge-confirmation" name="confirmation" autoComplete="off" required />
      </Field>
      <FormFeedback state={state} />
      <div>
        <SubmitButton variant="danger" pendingLabel="Suppression…">
          Supprimer définitivement
        </SubmitButton>
      </div>
    </form>
  );
}
