"use client";

import { FilePen, Sparkles } from "lucide-react";
import { useActionState, useState } from "react";

import { createDojo } from "@/app/actions/dojos";
import { Field, FormFeedback, Select, SubmitButton } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

type Option = { label: string; skills: { id: string; name: string }[] };

export function NewDojoForm({
  organizationId,
  options,
  defaultSkillId,
  generationAvailable,
}: {
  organizationId: string;
  options: Option[];
  defaultSkillId?: string;
  generationAvailable: boolean;
}) {
  const [state, action] = useActionState(createDojo, initialFormState);
  const [mode, setMode] = useState<"ia" | "manuel">(generationAvailable ? "ia" : "manuel");
  const errors = state.fieldErrors ?? {};

  const modes = [
    {
      value: "ia" as const,
      icon: Sparkles,
      title: "Générer selon la méthode",
      text: generationAvailable
        ? "Décrivez le sujet : le Dojo complet est rédigé en suivant la structure Première Ligne. Vous le relisez ensuite."
        : "Bientôt disponible sur votre espace.",
      disabled: !generationAvailable,
    },
    {
      value: "manuel" as const,
      icon: FilePen,
      title: "Partir d'une page structurée",
      text: "Les 3 phases sont prêtes à remplir : standard, critères, scénarios, grille d'observation.",
      disabled: false,
    },
  ];

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="mode" value={mode} />

      <Field label="Sous-compétence visée" htmlFor="dojo-skill" error={errors.skill_id}>
        <Select id="dojo-skill" name="skill_id" required defaultValue={defaultSkillId ?? ""}>
          <option value="">Choisir dans la matrice</option>
          {options.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Comment créer le Dojo ?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              aria-pressed={mode === option.value}
              onClick={() => setMode(option.value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-(--radius-card) border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                mode === option.value
                  ? "border-forest bg-forest/5 ring-2 ring-forest"
                  : "border-line bg-surface",
              )}
            >
              <option.icon aria-hidden="true" className="size-5 text-forest-light" />
              <span className="font-semibold">{option.title}</span>
              <span className="text-sm text-muted">{option.text}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {mode === "ia" ? (
        <Field
          label="Sujet du Dojo"
          htmlFor="dojo-subject"
          error={errors.subject}
          hint="Ex. « Relancer un client qui a demandé à réfléchir après un essai »"
        >
          <Textarea id="dojo-subject" name="subject" required className="min-h-20" />
        </Field>
      ) : (
        <Field label="Titre du Dojo" htmlFor="dojo-title" error={errors.title}>
          <Input id="dojo-title" name="title" required placeholder="Accueillir un client pressé" />
        </Field>
      )}

      <FormFeedback state={state} />
      <div>
        <SubmitButton
          pendingLabel={mode === "ia" ? "Rédaction du Dojo… (jusqu'à une minute)" : "Création…"}
        >
          {mode === "ia" ? "Générer le Dojo" : "Créer le Dojo"}
        </SubmitButton>
      </div>
    </form>
  );
}
