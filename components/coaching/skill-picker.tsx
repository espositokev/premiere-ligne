"use client";

import { X } from "lucide-react";
import { useState } from "react";

import type { EditorBlock } from "@/components/evaluation/evaluation-editor";
import { cn } from "@/lib/utils";

/**
 * Choix de 1 à `max` sous-compétences, rangées par compétence (accordéons) : pratique au pouce.
 * Les choix partent dans le formulaire sous le nom `name` (plusieurs valeurs).
 */
export function SkillPicker({
  blocks,
  name = "skill_ids",
  max = 3,
  defaultSelected = [],
  error,
  self = false,
}: {
  blocks: EditorBlock[];
  name?: string;
  max?: number;
  defaultSelected?: string[];
  error?: string;
  self?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected.slice(0, max));
  const names = new Map(
    blocks.flatMap((b) =>
      b.competencies.flatMap((c) => c.skills.map((s) => [s.id, s.name] as const)),
    ),
  );
  const full = selected.length >= max;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((s) => s !== id)
        : current.length >= max
          ? current
          : [...current, id],
    );
  }

  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1 text-sm font-semibold">
        Compétences à travailler <span className="font-normal text-muted">(1 à {max})</span>
      </legend>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <div className="mb-3 flex min-h-9 flex-wrap gap-2">
        {selected.length === 0 ? (
          <p className="text-sm text-muted">
            {self ? "Choisis dans la liste ci-dessous." : "Choisissez dans la liste ci-dessous."}
          </p>
        ) : (
          selected.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-fluo px-3 text-sm font-semibold text-forest-deep"
              aria-label={`Retirer ${names.get(id) ?? ""}`}
            >
              {names.get(id)}
              <X aria-hidden="true" className="size-4" />
            </button>
          ))
        )}
      </div>
      <div className="flex flex-col gap-4 rounded-(--radius-card) border border-line bg-surface p-2">
        {blocks.map((block) => (
          <div key={block.id}>
            <p className="px-2 pt-1 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">
              {block.name}
            </p>
            {block.competencies.map((competency) => {
              const count = competency.skills.filter((s) => selected.includes(s.id)).length;
              return (
                <details
                  key={competency.id}
                  className="group rounded-(--radius-control)"
                  open={count > 0}
                >
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-(--radius-control) px-2 font-medium hover:bg-bone">
                    {competency.name}
                    {count > 0 ? (
                      <span className="rounded-full bg-forest px-2 text-xs font-bold text-bone">
                        {count}
                      </span>
                    ) : null}
                  </summary>
                  <ul className="pb-2 pl-2">
                    {competency.skills.map((skill) => {
                      const checked = selected.includes(skill.id);
                      const disabled = !checked && full;
                      return (
                        <li key={skill.id}>
                          <label
                            className={cn(
                              "flex min-h-11 cursor-pointer items-center gap-3 rounded-(--radius-control) px-2 text-sm hover:bg-bone",
                              disabled && "cursor-not-allowed opacity-50",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="size-5 accent-(--color-forest)"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggle(skill.id)}
                            />
                            {skill.name}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })}
          </div>
        ))}
      </div>
      {error ? (
        <p id={`${name}-error`} className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
