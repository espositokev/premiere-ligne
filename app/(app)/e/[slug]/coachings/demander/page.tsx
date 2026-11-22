import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RequestForm } from "@/components/coaching/request-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { getOrgContext } from "@/lib/auth/org-context";
import { loadOrganizationTree } from "@/lib/data/framework";
import { editorBlocks } from "@/lib/data/progress";
import { getOrgSettings } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Demander un coaching" };

/** Le commercial demande un coaching sur une ou plusieurs compétences (§4.7). */
export default async function RequestCoachingPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/coachings/demander">) {
  const { slug } = await params;
  const { competence } = await searchParams;
  const context = await getOrgContext(slug);
  if (context.role !== "sales_rep" || !context.membershipId) redirect(`/e/${slug}/coachings`);
  const [framework, settings] = await Promise.all([
    loadOrganizationTree(context.organization.id),
    getOrgSettings(context.organization.id),
  ]);
  if (!framework || !settings.allowCoachingRequests) redirect(`/e/${slug}/coachings`);

  return (
    <>
      <p className="mb-2 text-sm">
        <Link
          href={`/e/${slug}/coachings`}
          className="font-semibold text-forest-light hover:text-forest-deep"
        >
          ← Mes coachings
        </Link>
      </p>
      <PageHeader
        title="Demander un coaching"
        description="Choisis ce que tu veux travailler : ton manager reçoit ta demande par email."
      />
      <Card className="max-w-2xl">
        <RequestForm
          slug={slug}
          organizationId={context.organization.id}
          memberId={context.membershipId}
          blocks={editorBlocks(framework.tree)}
          defaultSkillIds={typeof competence === "string" ? [competence] : []}
        />
      </Card>
    </>
  );
}
