import { Card } from "@/components/ui/card";
import { formatAverage } from "@/lib/domain/evaluation";
import { levelTone } from "@/lib/domain/levels";
import { cn } from "@/lib/utils";

const TONE = {
  low: "bg-level-low",
  mid: "bg-level-mid",
  good: "bg-level-good",
  expert: "bg-level-expert",
  none: "bg-level-none",
} as const;

/** Sous-compétences les plus faibles de l'équipe, pour orienter des formations collectives. */
export function WeakestSkills({
  skills,
}: {
  skills: { skillId: string; name: string; competency: string; average: number; rated: number }[];
}) {
  return (
    <Card>
      <h2 className="font-display text-lg font-semibold">Points faibles de l&apos;équipe</h2>
      <p className="mb-4 text-sm text-muted">
        Moyenne des dernières notes, sur 4. Idéal pour un Dojo collectif.
      </p>
      {skills.length === 0 ? (
        <p className="text-sm text-muted">Pas encore d&apos;évaluation validée.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {skills.map((s) => (
            <li key={s.skillId}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-sm font-semibold tabular-nums">{formatAverage(s.average)}</p>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <div
                  className={cn("h-full rounded-full", TONE[levelTone(Math.round(s.average))])}
                  style={{ width: `${(s.average / 4) * 100}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {s.competency} · {s.rated} commercia{s.rated > 1 ? "ux" : "l"} évalué
                {s.rated > 1 ? "s" : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
