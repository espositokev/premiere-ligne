import { ChevronRight, ClipboardList } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/page";
import type { EvaluationDetail } from "@/lib/data/evaluations";
import { formatDate } from "@/lib/data/progress";

/** Historique des évaluations (manager et auto-évaluations), les plus récentes d'abord. */
export function EvaluationHistory({
  evaluations,
  hrefFor,
  self = false,
}: {
  evaluations: EvaluationDetail[];
  hrefFor: (evaluation: EvaluationDetail) => string;
  self?: boolean;
}) {
  if (evaluations.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Aucune évaluation pour l'instant"
        text={
          self ? "Tes évaluations apparaîtront ici." : "Les évaluations validées apparaîtront ici."
        }
      />
    );
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-(--radius-card) border border-line bg-surface">
      {evaluations.map((evaluation) => {
        const rated = Object.values(evaluation.scores).filter((s) => s !== null).length;
        return (
          <li key={evaluation.id}>
            <Link
              href={hrefFor(evaluation)}
              className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-bone"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {evaluation.kind === "self"
                    ? self
                      ? "Mon auto-évaluation"
                      : "Auto-évaluation"
                    : `Évaluation par ${evaluation.authorName}`}
                </p>
                <p className="text-sm text-muted">
                  {evaluation.status === "validee"
                    ? formatDate(evaluation.validatedAt)
                    : `Commencée le ${formatDate(evaluation.createdAt)}`}
                  {` · ${rated} note${rated > 1 ? "s" : ""}`}
                </p>
              </div>
              {evaluation.status === "brouillon" ? <Badge tone="warning">Brouillon</Badge> : null}
              <ChevronRight aria-hidden="true" className="size-4 text-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
