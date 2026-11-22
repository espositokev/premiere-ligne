import { levelTone, type LevelTone } from "@/lib/domain/levels";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const toneClasses: Record<LevelTone, string> = {
  low: "bg-level-low text-white",
  mid: "bg-level-mid text-forest-deep",
  good: "bg-level-good text-white",
  expert: "bg-level-expert text-white",
  none: "bg-level-none/25 text-muted",
};

type ScoreBadgeProps = {
  score: number | null;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Pastille de note (§6.4). Le chiffre est toujours affiché avec la couleur :
 * la couleur seule ne porte jamais l'information.
 */
export function ScoreBadge({ score, size = "md", className }: ScoreBadgeProps) {
  const tone = levelTone(score);
  const label =
    score === null ? fr.levels.none : `Niveau ${score} : ${fr.levels[score as 0 | 1 | 2 | 3 | 4]}`;

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold tabular-nums",
        size === "md" ? "size-8 text-sm" : "size-6 text-xs",
        toneClasses[tone],
        className,
      )}
    >
      {score === null ? "–" : score}
    </span>
  );
}
