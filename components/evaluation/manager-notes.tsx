"use client";

import { Lock } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { addManagerNote, deleteManagerNote } from "@/app/actions/evaluations";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton, FormFeedback, SubmitButton } from "@/components/ui/form-controls";
import { Textarea } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";

export type NoteItem = {
  id: string;
  body: string;
  authorName: string;
  date: string;
  canDelete: boolean;
};

/** Notes privées du manager (§4.6) : jamais visibles par le commercial. */
export function ManagerNotes({
  slug,
  organizationId,
  memberId,
  notes,
}: {
  slug: string;
  organizationId: string;
  memberId: string;
  notes: NoteItem[];
}) {
  const [state, action] = useActionState(addManagerNote, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.nonce, state.status]);

  return (
    <div className="flex flex-col gap-4">
      <p className="inline-flex items-center gap-2 text-sm text-muted">
        <Lock aria-hidden="true" className="size-4" />
        Visibles uniquement par les managers et responsables, jamais par le commercial.
      </p>
      <Card>
        <form ref={formRef} action={action} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="organization_id" value={organizationId} />
          <input type="hidden" name="member_id" value={memberId} />
          <label htmlFor="note-body" className="text-sm font-semibold">
            Nouvelle note
          </label>
          <Textarea
            id="note-body"
            name="body"
            required
            maxLength={5000}
            placeholder="Observation, contexte, point à suivre…"
          />
          <FormFeedback state={state} />
          <div>
            <SubmitButton variant="secondary">Ajouter la note</SubmitButton>
          </div>
        </form>
      </Card>
      {notes.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id}>
              <Card className="p-4">
                <p className="whitespace-pre-line">{note.body}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    {note.authorName} · {note.date}
                  </p>
                  {note.canDelete ? (
                    <form action={deleteManagerNote}>
                      <input type="hidden" name="note_id" value={note.id} />
                      <input type="hidden" name="slug" value={slug} />
                      <ConfirmSubmitButton
                        label="Supprimer"
                        confirmLabel="Confirmer"
                        variant="ghost"
                      />
                    </form>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
