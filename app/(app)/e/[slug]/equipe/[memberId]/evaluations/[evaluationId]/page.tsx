import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EvaluationScreen } from "@/components/evaluation/evaluation-screen";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { requireCoach } from "@/lib/auth/require-org";
import {
  canManageMember,
  getEvaluation,
  listEvaluations,
  loadMemberProfile,
} from "@/lib/data/evaluations";
import { loadOrganizationTree } from "@/lib/data/framework";
import { formatDate } from "@/lib/data/progress";
import { canEditEvaluation } from "@/lib/domain/evaluation";
import { canAdministerOrg } from "@/lib/domain/roles";

export const metadata: Metadata = { title: "Évaluation" };

/** Saisie ou lecture d'une évaluation, vue manager (§4.5). */
export default async function EvaluationPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/equipe/[memberId]/evaluations/[evaluationId]">) {
  const { slug, memberId, evaluationId } = await params;
  const { corriger } = await searchParams;
  const context = await requireCoach(slug);
  const orgId = context.organization.id;

  const [member, evaluation, canManage] = await Promise.all([
    loadMemberProfile(orgId, memberId),
    getEvaluation(evaluationId),
    canManageMember(memberId),
  ]);
  if (!member || !evaluation || !canManage || evaluation.subjectMembershipId !== memberId)
    notFound();

  const [framework, allEvaluations] = await Promise.all([
    loadOrganizationTree(orgId),
    listEvaluations(memberId),
  ]);
  if (!framework) notFound();

  const admin = canAdministerOrg(context.role);
  const canEdit = canEditEvaluation({
    kind: evaluation.kind,
    status: evaluation.status,
    isSubject: false,
    canManage,
    isAdmin: admin,
  });
  // Une évaluation validée ne s'ouvre en correction que sur demande explicite.
  const editable = canEdit && (evaluation.status === "brouillon" || corriger === "1");
  const backHref = `/e/${slug}/equipe/${memberId}`;
  const name = `${member.firstName} ${member.lastName}`;

  const title =
    evaluation.kind === "self" ? `Auto-évaluation de ${member.firstName}` : `Évaluation de ${name}`;
  const description =
    evaluation.status === "validee"
      ? `Validée le ${formatDate(evaluation.validatedAt)} · ${evaluation.authorName}`
      : `Brouillon commencé le ${formatDate(evaluation.createdAt)}`;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={backHref} className="font-semibold text-forest-light hover:text-forest-deep">
          ← {name}
        </Link>
      </p>
      <PageHeader
        title={title}
        description={description}
        action={
          canEdit && !editable ? (
            <Button asChild variant="outline">
              <Link href={`?corriger=1`}>Corriger</Link>
            </Button>
          ) : undefined
        }
      />
      <EvaluationScreen
        slug={slug}
        evaluation={evaluation}
        allEvaluations={allEvaluations}
        tree={framework.tree}
        editable={editable}
        backHref={backHref}
        self={false}
      />
    </>
  );
}
