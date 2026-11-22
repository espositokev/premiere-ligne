"use client";

import { useActionState } from "react";

import { saveRepComment } from "@/app/actions/coachings";
import { FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { Textarea } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

/** Commentaire du commercial sur un compte rendu clôturé. */
export function RepCommentForm({
  slug,
  coachingId,
  defaultValue,
}: {
  slug: string;
  coachingId: string;
  defaultValue: string | null;
}) {
  const [state, action] = useActionState(saveRepComment, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="coaching_id" value={coachingId} />
      <label htmlFor="rep-comment" className="font-display font-semibold">
        Ton commentaire
      </label>
      <Textarea
        id="rep-comment"
        name="rep_comment"
        maxLength={2000}
        defaultValue={defaultValue ?? ""}
        placeholder="Ce que tu retiens, ce que tu vas mettre en place…"
      />
      <FormFeedback state={state} />
      <div>
        <SubmitButton variant="secondary">Enregistrer mon commentaire</SubmitButton>
      </div>
    </form>
  );
}
