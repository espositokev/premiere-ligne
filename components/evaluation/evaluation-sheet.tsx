import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/score-badge";
import { fr } from "@/lib/i18n/fr";

import type { EditorBlock } from "./evaluation-editor";

/** Lecture d'une évaluation validée : chaque note avec son niveau et le commentaire éventuel. */
export function EvaluationSheet({
  blocks,
  scores,
  comments,
  generalComment,
}: {
  blocks: EditorBlock[];
  scores: Record<string, number | null>;
  comments: Record<string, string | null>;
  generalComment: string | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      {generalComment ? (
        <Card>
          <h2 className="mb-1 font-display font-semibold">Commentaire général</h2>
          <p className="whitespace-pre-line text-forest-deep">{generalComment}</p>
        </Card>
      ) : null}
      {blocks.map((block) => (
        <section key={block.id}>
          <h2 className="mb-3 text-lg font-semibold">{block.name}</h2>
          <div className="flex flex-col gap-3">
            {block.competencies.map((competency) => (
              <Card key={competency.id} className="p-0">
                <h3 className="border-b border-line px-4 py-3 font-display font-semibold">
                  {competency.name}
                </h3>
                <ul className="divide-y divide-line">
                  {competency.skills.map((skill) => {
                    const score = scores[skill.id] ?? null;
                    const comment = comments[skill.id];
                    return (
                      <li key={skill.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{skill.name}</p>
                          <p className="text-xs text-muted">
                            {score === null
                              ? fr.levels.none
                              : fr.levels[score as 0 | 1 | 2 | 3 | 4]}
                          </p>
                          {comment ? (
                            <p className="mt-1 text-sm whitespace-pre-line text-forest-light">
                              {comment}
                            </p>
                          ) : null}
                        </div>
                        <ScoreBadge score={score} />
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
