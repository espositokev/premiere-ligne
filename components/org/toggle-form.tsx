"use client";

import { useActionState } from "react";

import { ConfirmSubmitButton, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { initialFormState, type FormState } from "@/lib/forms";

type ToggleFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>;
  label: string;
  /** Si présent, le bouton demande une confirmation (action destructive). */
  confirmLabel?: string;
  variant?: "outline" | "danger" | "ghost" | "secondary";
};

/** Petit formulaire à un bouton : désactiver, réactiver, suspendre… */
export function ToggleForm({
  action,
  fields,
  label,
  confirmLabel,
  variant = "outline",
}: ToggleFormProps) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {confirmLabel ? (
        <ConfirmSubmitButton
          label={label}
          confirmLabel={confirmLabel}
          variant={variant === "secondary" ? "outline" : variant}
        />
      ) : (
        <SubmitButton variant={variant} size="sm">
          {label}
        </SubmitButton>
      )}
      <FormFeedback state={state} />
    </form>
  );
}
