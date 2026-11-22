"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { createCoachingRequest } from "@/app/actions/coaching-requests";
import type { EditorBlock } from "@/components/evaluation/evaluation-editor";
import { Field, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { Textarea } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

import { SkillPicker } from "./skill-picker";

export function RequestForm({
  slug,
  organizationId,
  memberId,
  blocks,
  defaultSkillIds,
}: {
  slug: string;
  organizationId: string;
  memberId: string;
  blocks: EditorBlock[];
  defaultSkillIds: string[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(createCoachingRequest, initialFormState);
  useEffect(() => {
    if (state.status === "success") router.push(`/e/${slug}/coachings`);
  }, [state.status, state.nonce, router, slug]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="member_id" value={memberId} />
      <SkillPicker
        blocks={blocks}
        defaultSelected={defaultSkillIds}
        error={state.fieldErrors?.skill_ids}
        self
      />
      <Field
        label="Ton message"
        htmlFor="message"
        hint="Facultatif — une situation précise, un client difficile…"
        error={state.fieldErrors?.message}
      >
        <Textarea id="message" name="message" maxLength={2000} />
      </Field>
      <FormFeedback state={state} />
      <div>
        <SubmitButton className="w-full sm:w-auto" pendingLabel="Envoi…">
          Envoyer ma demande
        </SubmitButton>
      </div>
    </form>
  );
}
