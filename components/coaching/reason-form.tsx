"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { Textarea } from "@/components/ui/input";
import { initialFormState, type FormState } from "@/lib/forms";

/** Petit formulaire « avec motif » (annuler, rouvrir, refuser), replié derrière un bouton. */
export function ReasonForm({
  action,
  hidden,
  openLabel,
  label,
  submitLabel,
  placeholder,
  variant = "outline",
  fieldName = "reason",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  hidden: Record<string, string>;
  openLabel: string;
  label: string;
  submitLabel: string;
  placeholder?: string;
  variant?: "outline" | "ghost" | "danger";
  fieldName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, initialFormState);
  if (!open || state.status === "success") {
    return (
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        {openLabel}
      </Button>
    );
  }
  const id = `reason-${openLabel.replace(/\W+/g, "-")}`;
  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-3 rounded-(--radius-card) border border-line bg-surface p-4"
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <Textarea
        id={id}
        name={fieldName}
        required
        maxLength={2000}
        placeholder={placeholder}
        autoFocus
      />
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant={variant === "danger" ? "danger" : "primary"}>
          {submitLabel}
        </SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Retour
        </Button>
      </div>
    </form>
  );
}
