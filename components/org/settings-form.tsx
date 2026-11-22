"use client";

import { useActionState } from "react";

import { updateOrgSettings } from "@/app/actions/settings";
import { Field, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import type { OrgSettings } from "@/lib/domain/settings";
import { initialFormState } from "@/lib/forms";

export function SettingsForm({
  slug,
  organizationId,
  settings,
}: {
  slug: string;
  organizationId: string;
  settings: OrgSettings;
}) {
  const [state, action] = useActionState(updateOrgSettings, initialFormState);
  const toggle = (name: keyof OrgSettings, label: string, hint: string, checked: boolean) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-(--radius-control) border border-line bg-surface p-4 has-checked:border-forest">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="mt-1 size-5 accent-(--color-forest)"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="organization_id" value={organizationId} />
      <Field
        label="Alerte « sans coaching depuis »"
        htmlFor="daysWithoutCoaching"
        hint="Nombre de jours sans coaching clôturé avant qu'un commercial soit signalé aux managers."
        error={state.fieldErrors?.daysWithoutCoaching}
      >
        <Input
          id="daysWithoutCoaching"
          name="daysWithoutCoaching"
          type="number"
          inputMode="numeric"
          min={7}
          max={365}
          defaultValue={settings.daysWithoutCoaching}
          className="max-w-32"
        />
      </Field>
      {toggle(
        "allowSelfEvaluation",
        "Auto-évaluation",
        "Les commerciaux peuvent s'évaluer eux-mêmes.",
        settings.allowSelfEvaluation,
      )}
      {toggle(
        "allowCoachingRequests",
        "Demandes de coaching",
        "Les commerciaux peuvent demander un coaching à leur manager.",
        settings.allowCoachingRequests,
      )}
      <FormFeedback state={state} />
      <div>
        <SubmitButton>Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
