"use client";

import { useActionState } from "react";

import { createCoaching, updateCoachingPlanning } from "@/app/actions/coachings";
import type { EditorBlock } from "@/components/evaluation/evaluation-editor";
import { Checkbox, Field, FormFeedback, Select, SubmitButton } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import { COACHING_DURATIONS } from "@/lib/domain/coaching";
import { initialFormState } from "@/lib/forms";

import { SkillPicker } from "./skill-picker";

type Defaults = {
  memberId?: string;
  scheduledLocal?: string;
  durationMinutes?: number;
  mode?: "terrain" | "distance";
  location?: string | null;
  objective?: string | null;
  skillIds?: string[];
};

/** Planification d'un coaching, ou modification d'un coaching à venir. */
export function CoachingForm({
  slug,
  organizationId,
  reps,
  blocks,
  defaults = {},
  requestId,
  coachingId,
  minLocal,
}: {
  slug: string;
  organizationId: string;
  reps: { id: string; name: string }[];
  blocks: EditorBlock[];
  defaults?: Defaults;
  requestId?: string;
  /** Présent : modification d'un coaching existant. */
  coachingId?: string;
  minLocal?: string;
}) {
  const editing = Boolean(coachingId);
  const [state, action] = useActionState(
    editing ? updateCoachingPlanning : createCoaching,
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="organization_id" value={organizationId} />
      {requestId ? <input type="hidden" name="request_id" value={requestId} /> : null}
      {coachingId ? <input type="hidden" name="coaching_id" value={coachingId} /> : null}

      {editing || reps.length === 1 ? (
        <input type="hidden" name="member_id" value={defaults.memberId ?? reps[0]?.id ?? ""} />
      ) : (
        <Field label="Commercial" htmlFor="member_id" error={errors.member_id}>
          <Select id="member_id" name="member_id" required defaultValue={defaults.memberId ?? ""}>
            <option value="" disabled>
              Choisir un commercial
            </option>
            {reps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date et heure" htmlFor="scheduled_local" error={errors.scheduled_local}>
          <Input
            id="scheduled_local"
            name="scheduled_local"
            type="datetime-local"
            required
            min={editing ? undefined : minLocal}
            defaultValue={defaults.scheduledLocal}
            step={900}
          />
        </Field>
        <Field label="Durée" htmlFor="duration_minutes">
          <Select
            id="duration_minutes"
            name="duration_minutes"
            defaultValue={String(defaults.durationMinutes ?? 120)}
          >
            {COACHING_DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Format</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["terrain", "Sur le terrain"],
              ["distance", "À distance"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-12 cursor-pointer items-center gap-2 rounded-(--radius-control) border-2 border-line bg-surface px-3 font-medium has-checked:border-forest has-checked:bg-fluo/30"
            >
              <input
                type="radio"
                name="mode"
                value={value}
                defaultChecked={(defaults.mode ?? "terrain") === value}
                className="size-4 accent-(--color-forest)"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Lieu" htmlFor="location" hint="Facultatif — concession, ville, lien visio…">
        <Input
          id="location"
          name="location"
          maxLength={200}
          defaultValue={defaults.location ?? ""}
        />
      </Field>

      <Field
        label="Objectif"
        htmlFor="objective"
        error={errors.objective}
        hint="Une phrase suffit."
      >
        <Textarea
          id="objective"
          name="objective"
          maxLength={500}
          defaultValue={defaults.objective ?? ""}
          placeholder="Ex. : Mieux découvrir les besoins avant de présenter un véhicule"
        />
      </Field>

      <SkillPicker
        blocks={blocks}
        defaultSelected={defaults.skillIds ?? []}
        error={errors.skill_ids}
      />

      {editing ? (
        <label className="flex items-center gap-3 text-sm">
          <Checkbox name="notify" defaultChecked />
          Prévenir le commercial par email (avec l&apos;invitation agenda mise à jour)
        </label>
      ) : null}

      <FormFeedback state={state} />
      <div>
        <SubmitButton className="w-full sm:w-auto" pendingLabel="Enregistrement…">
          {editing ? "Enregistrer les modifications" : "Planifier le coaching"}
        </SubmitButton>
      </div>
    </form>
  );
}
