"use client";

import { useActionState, useState } from "react";

import { Input } from "@/components/ui/input";
import { Field, FormFeedback, SubmitButton } from "@/components/ui/form-controls";

import { requestCode, verifyCode, type LoginState } from "./actions";

const initial: LoginState = { status: "idle", step: "email" };

export function LoginForm({ next }: { next: string | null }) {
  const [requestState, requestAction] = useActionState(requestCode, initial);
  const [verifyState, verifyAction] = useActionState(verifyCode, initial);
  const [editingEmail, setEditingEmail] = useState(false);

  const codeSent = requestState.step === "code" && !editingEmail;
  const email = requestState.email ?? "";

  if (!codeSent) {
    return (
      <form
        action={requestAction}
        className="flex flex-col gap-4"
        onSubmit={() => setEditingEmail(false)}
      >
        <Field
          label="Adresse email professionnelle"
          htmlFor="email"
          error={requestState.fieldErrors?.email}
        >
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            defaultValue={email}
            placeholder="prenom.nom@entreprise.fr"
            aria-invalid={Boolean(requestState.fieldErrors?.email)}
            aria-describedby="email-error"
          />
        </Field>
        <FormFeedback state={requestState} toastOnSuccess={false} />
        <SubmitButton pendingLabel="Envoi du code…" className="w-full">
          Recevoir mon code
        </SubmitButton>
        <p className="text-center text-sm text-muted">
          Pas de mot de passe à retenir : un code à usage unique vous est envoyé par email.
        </p>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="flex flex-col gap-4">
      <p className="rounded-(--radius-control) bg-fluo/40 px-3 py-2.5 text-sm">
        Si <strong className="break-all">{email}</strong> a un compte, un code à 6 chiffres vient
        d&apos;y être envoyé. Pensez à regarder dans les indésirables.
      </p>
      <input type="hidden" name="email" value={email} />
      {next ? <input type="hidden" name="suivant" value={next} /> : null}
      <Field label="Code reçu par email" htmlFor="code" error={verifyState.fieldErrors?.code}>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="123456"
          className="text-center font-display text-2xl tracking-[0.4em]"
          aria-invalid={Boolean(verifyState.fieldErrors?.code)}
          aria-describedby="code-error"
        />
      </Field>
      <FormFeedback state={verifyState} toastOnSuccess={false} />
      <SubmitButton pendingLabel="Vérification…" className="w-full">
        Me connecter
      </SubmitButton>
      <button
        type="button"
        className="text-sm font-semibold text-forest-light hover:underline"
        onClick={() => setEditingEmail(true)}
      >
        Changer d&apos;adresse ou renvoyer un code
      </button>
    </form>
  );
}
