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
import { SCORE_VALUES } from "@/lib/domain/levels";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * Les 5 niveaux d'une sous-compétence (§4.9 : « les descripteurs de niveaux ») : le niveau actuel
 * est mis en avant, le suivant signalé comme prochaine marche.
 */
function LevelLadder({
  statement,
  levels,
  current,
}: {
  statement: string | null;
  levels: (string | null)[];
  current: number | null;
}) {
  const next = current === null ? 0 : current < 4 ? current + 1 : null;
  return (
    <div className="border-t border-line bg-bone/60 px-4 py-3">
      {statement ? <p className="mb-2 text-sm">{statement}</p> : null}
      <ol className="flex flex-col gap-1.5">
        {SCORE_VALUES.map((level) => (
          <li
            key={level}
            className={cn(
              "flex gap-2 rounded-(--radius-control) px-2 py-1.5 text-sm",
              level === current && "bg-fluo/50 font-semibold",
              level === next && "border border-dashed border-forest",
            )}
          >
            <span className="w-4 shrink-0 font-display font-semibold tabular-nums">{level}</span>
            <span>
              {levels[level] ?? fr.levels[level]}
              {level === current ? " · niveau actuel" : level === next ? " · prochaine marche" : ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

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
  observed,
}: {
  tree: FrameworkTree;
  latest: Map<string, LatestScore>;
  self: Map<string, LatestScore>;
  selfLabel?: string;
  /** Dernière note « observée en coaching » (affichée à part, ne compte pas comme évaluation). */
  observed?: Map<string, { score: number }>;
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
                            "rounded-full px-2.5 py-1 font-display text-sm font-semibold tabular-nums",
                            average.value === null
                              ? "bg-level-none/25 text-muted"
                              : "bg-forest/8 text-forest-deep",
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
                            <li key={skill.id}>
                              <details className="group">
                                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 hover:bg-bone [&::-webkit-details-marker]:hidden">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{skill.name}</p>
                                    <p className="text-xs text-muted">
                                      {current ? shortDate(current.evaluatedAt) : "Jamais évaluée"}
                                      {own ? ` · ${selfLabel} : ${own.score}` : ""}
                                      {observed?.get(skill.id)
                                        ? ` · Coaching : ${observed.get(skill.id)?.score}`
                                        : ""}
                                    </p>
                                  </div>
                                  <TrendIcon
                                    value={trend(current?.score, current?.previousScore)}
                                  />
                                  <ScoreBadge score={current?.score ?? null} />
                                </summary>
                                <LevelLadder
                                  statement={skill.statement}
                                  levels={[
                                    skill.levels.level_0,
                                    skill.levels.level_1,
                                    skill.levels.level_2,
                                    skill.levels.level_3,
                                    skill.levels.level_4,
                                  ]}
                                  current={current?.score ?? null}
                                />
                              </details>
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
