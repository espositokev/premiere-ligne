import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EvaluationScreen } from "@/components/evaluation/evaluation-screen";
import { PageHeader } from "@/components/ui/page";
import { getOrgContext } from "@/lib/auth/org-context";
import { getEvaluation, listEvaluations } from "@/lib/data/evaluations";
import { loadOrganizationTree } from "@/lib/data/framework";
import { formatDate } from "@/lib/data/progress";
import { canEditEvaluation } from "@/lib/domain/evaluation";

export const metadata: Metadata = { title: "Évaluation" };

/** Auto-évaluation (saisie) ou lecture d'une évaluation, côté commercial. */
export default async function MyEvaluationPage({
  params,
}: PageProps<"/e/[slug]/moi/evaluations/[evaluationId]">) {
  const { slug, evaluationId } = await params;
  const context = await getOrgContext(slug);
  if (context.role !== "sales_rep" || !context.membershipId) redirect(`/e/${slug}`);

  const evaluation = await getEvaluation(evaluationId);
  if (!evaluation || evaluation.subjectMembershipId !== context.membershipId) notFound();
  const [framework, allEvaluations] = await Promise.all([
    loadOrganizationTree(context.organization.id),
    listEvaluations(context.membershipId),
  ]);
  if (!framework) notFound();

  const editable = canEditEvaluation({
    kind: evaluation.kind,
    status: evaluation.status,
    isSubject: true,
    canManage: false,
    isAdmin: false,
  });
  const backHref = `/e/${slug}/moi`;
  const title =
    evaluation.kind === "self" ? "Mon auto-évaluation" : `Évaluation par ${evaluation.authorName}`;
  const description = editable
    ? "Note-toi honnêtement, de 0 à 4. Tout est enregistré au fur et à mesure."
    : `Validée le ${formatDate(evaluation.validatedAt)}`;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={backHref} className="font-semibold text-forest-light hover:text-forest-deep">
          ← Ma progression
        </Link>
      </p>
      <PageHeader title={title} description={description} />
      <EvaluationScreen
        slug={slug}
        evaluation={evaluation}
        allEvaluations={allEvaluations}
        tree={framework.tree}
        editable={editable}
        backHref={backHref}
        self
      />
    </>
  );
}
