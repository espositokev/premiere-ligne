import { deleteEvaluationDraft } from "@/app/actions/evaluations";
import { ConfirmSubmitButton } from "@/components/ui/form-controls";
import type { EvaluationDetail } from "@/lib/data/evaluations";
import { editorBlocks } from "@/lib/data/progress";
import { latestScores } from "@/lib/domain/evaluation";
import type { FrameworkTree } from "@/lib/domain/framework";

import { EvaluationEditor } from "./evaluation-editor";
import { EvaluationSheet } from "./evaluation-sheet";

/**
 * Écran d'une évaluation, partagé entre le manager et le commercial :
 * saisie si elle est modifiable, lecture sinon.
 */
export function EvaluationScreen({
  slug,
  evaluation,
  allEvaluations,
  tree,
  editable,
  backHref,
  self,
}: {
  slug: string;
  evaluation: EvaluationDetail;
  allEvaluations: EvaluationDetail[];
  tree: FrameworkTree;
  editable: boolean;
  backHref: string;
  self: boolean;
}) {
  const blocks = editorBlocks(tree);

  if (!editable) {
    return (
      <EvaluationSheet
        blocks={blocks}
        scores={evaluation.scores}
        comments={evaluation.comments}
        generalComment={evaluation.generalComment}
      />
    );
  }

  // « Note précédente » : la dernière note validée du même type, hors de cette évaluation.
  const previous = latestScores(
    allEvaluations.filter((e) => e.id !== evaluation.id),
    evaluation.kind,
  );
  const initialScores = Object.fromEntries(
    Object.keys({ ...evaluation.scores, ...evaluation.comments }).map((id) => [
      id,
      { score: evaluation.scores[id] ?? null, comment: evaluation.comments[id] ?? null },
    ]),
  );

  return (
    <>
      <EvaluationEditor
        slug={slug}
        evaluationId={evaluation.id}
        mode={evaluation.status === "validee" ? "correction" : "draft"}
        blocks={blocks}
        initialScores={initialScores}
        previousScores={Object.fromEntries([...previous].map(([id, s]) => [id, s.score]))}
        initialGeneralComment={evaluation.generalComment}
        backHref={backHref}
        self={self}
      />
      {evaluation.status === "brouillon" ? (
        <form action={deleteEvaluationDraft} className="-mt-16 mb-8 flex justify-center">
          <input type="hidden" name="evaluation_id" value={evaluation.id} />
          <input type="hidden" name="slug" value={slug} />
          <ConfirmSubmitButton
            label="Supprimer le brouillon"
            confirmLabel="Confirmer la suppression"
            variant="ghost"
          />
        </form>
      ) : null}
    </>
  );
}
