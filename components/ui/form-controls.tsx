"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

import { Button } from "./button";

/** Bouton d'envoi qui se désactive pendant l'envoi. */
export function SubmitButton({
  children,
  pendingLabel = "Enregistrement…",
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Message d'erreur d'un champ, relié au champ par aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-medium text-danger">
      {message}
    </p>
  );
}

/** Bloc champ : libellé, contrôle, aide et erreur. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-forest-deep">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-sm text-muted">{hint}</p> : null}
      <FieldError id={`${htmlFor}-error`} message={error} />
    </div>
  );
}

/** Liste déroulante native (fiable sur mobile), aux couleurs de la marque. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-(--radius-control) border border-line bg-surface px-3 text-base text-forest-deep",
        "focus-visible:border-forest focus-visible:ring-3 focus-visible:ring-forest/15 focus-visible:outline-none",
        "disabled:opacity-60 aria-invalid:border-danger",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn("size-5 shrink-0 rounded border-line accent-forest", className)}
      {...props}
    />
  );
}

/** Affiche le message global d'un formulaire et un toast quand l'envoi réussit. */
export function FormFeedback({
  state,
  toastOnSuccess = true,
}: {
  state: FormState;
  toastOnSuccess?: boolean;
}) {
  const lastNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      toastOnSuccess &&
      state.status === "success" &&
      state.message &&
      state.nonce !== lastNonce.current
    ) {
      lastNonce.current = state.nonce;
      toast.success(state.message);
    }
  }, [state, toastOnSuccess]);

  if (state.status !== "error" || !state.message) return null;
  return (
    <p
      role="alert"
      className="rounded-(--radius-control) border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm font-medium text-forest-deep"
    >
      {state.message}
    </p>
  );
}

/**
 * Bouton d'action destructive en deux temps : un premier appui demande confirmation,
 * le second envoie. Plus rapide qu'une fenêtre modale sur téléphone.
 */
export function ConfirmSubmitButton({
  label,
  confirmLabel,
  variant = "outline",
  size = "sm",
}: {
  label: string;
  confirmLabel: string;
  variant?: "outline" | "danger" | "ghost";
  size?: "sm" | "default";
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <Button type="button" variant={variant} size={size} onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }
  return (
    <Button type="submit" variant="danger" size={size} disabled={pending} autoFocus>
      {pending ? "…" : confirmLabel}
    </Button>
  );
}
