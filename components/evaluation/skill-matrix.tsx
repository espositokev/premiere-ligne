import { ArrowDown, ArrowUp, Equal } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/score-badge";
import {
  activeSkills,
  averageOf,
  formatAverage,
  scoreReader,
  trend,
  type LatestScore,
} from "@/lib/domain/evaluation";
import type { FrameworkTree } from "@/lib/domain/framework";
import { cn } from "@/lib/utils";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function TrendIcon({ value }: { value: ReturnType<typeof trend> }) {
  if (value === "up") return <ArrowUp aria-label="En progrès" className="size-4 text-level-good" />;
  if (value === "down")
    return <ArrowDown aria-label="En baisse" className="size-4 text-level-low" />;
  if (value === "same") return <Equal aria-label="Stable" className="size-4 text-muted" />;
  return <span className="size-4" aria-hidden="true" />;
}

/**
 * Matrice (§4.6) : par bloc et par compétence, la dernière note de chaque sous-compétence,
 * son évolution depuis la note précédente et sa date ; l'auto-évaluation en petit à côté.
 */
export function SkillMatrix({
  tree,
  latest,
  self,
  selfLabel = "Auto",
}: {
  tree: FrameworkTree;
  latest: Map<string, LatestScore>;
  self: Map<string, LatestScore>;
  selfLabel?: string;
}) {
  const read = scoreReader(latest);
  return (
    <div className="flex flex-col gap-6">
      {tree.blocks
        .filter((b) => b.active)
        .map((block) => (
          <section key={block.id}>
            <h3 className="mb-3 text-base font-semibold text-muted">{block.name}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {block.competencies
                .filter((c) => c.active && activeSkills(c).length > 0)
                .map((competency) => {
                  const skills = activeSkills(competency);
                  const average = averageOf(skills, read);
                  return (
                    <Card key={competency.id} className="p-0">
                      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                        <div className="min-w-0">
                          <h4 className="font-display font-semibold">{competency.name}</h4>
                          {average.unrated > 0 ? (
                            <p className="text-xs text-muted">
                              {average.unrated} non évaluée{average.unrated > 1 ? "s" : ""}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 font-display text-sm font-bold tabular-nums",
                            average.value === null
                              ? "bg-level-none/25 text-muted"
                              : "bg-fluo text-forest-deep",
                          )}
                          aria-label={`Moyenne ${formatAverage(average.value)} sur 4`}
                        >
                          {formatAverage(average.value)}
                        </span>
                      </div>
                      <ul className="divide-y divide-line">
                        {skills.map((skill) => {
                          const current = latest.get(skill.id);
                          const own = self.get(skill.id);
                          return (
                            <li key={skill.id} className="flex items-center gap-3 px-4 py-2.5">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{skill.name}</p>
                                <p className="text-xs text-muted">
                                  {current ? shortDate(current.evaluatedAt) : "Jamais évaluée"}
                                  {own ? ` · ${selfLabel} : ${own.score}` : ""}
                                </p>
                              </div>
                              <TrendIcon value={trend(current?.score, current?.previousScore)} />
                              <ScoreBadge score={current?.score ?? null} />
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  );
                })}
            </div>
          </section>
        ))}
    </div>
  );
}
