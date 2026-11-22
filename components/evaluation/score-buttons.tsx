"use client";

import { levelTone, SCORE_VALUES, type LevelTone } from "@/lib/domain/levels";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const selectedTone: Record<LevelTone, string> = {
  low: "border-level-low bg-level-low text-white",
  mid: "border-level-mid bg-level-mid text-forest-deep",
  good: "border-level-good bg-level-good text-white",
  expert: "border-level-expert bg-level-expert text-white",
  none: "",
};

/**
 * Notes 0 à 4 en gros boutons (§4.5 : pas de liste déroulante), faciles au pouce.
 * Toucher la note déjà choisie l'efface (la sous-compétence redevient « non évaluée »).
 */
export function ScoreButtons({
  value,
  onChange,
  labelledBy,
  className,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  labelledBy: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn("grid grid-cols-5 gap-2", className)}
    >
      {SCORE_VALUES.map((score) => {
        const selected = value === score;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${score} : ${fr.levels[score]}`}
            title={fr.levels[score]}
            onClick={() => onChange(selected ? null : score)}
            className={cn(
              "min-h-12 rounded-(--radius-control) border-2 font-display text-lg font-semibold tabular-nums transition-colors focus-visible:ring-3 focus-visible:ring-forest/25 focus-visible:outline-none",
              selected
                ? selectedTone[levelTone(score)]
                : "border-line bg-surface text-forest-deep hover:border-forest",
            )}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}
