import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CoachingForm } from "@/components/coaching/coaching-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireCoach } from "@/lib/auth/require-org";
import { getCoaching } from "@/lib/data/coachings";
import { canManageMember } from "@/lib/data/evaluations";
import { loadOrganizationTree } from "@/lib/data/framework";
import { editorBlocks } from "@/lib/data/progress";
import { utcToLocalInput } from "@/lib/domain/coaching";

export const metadata: Metadata = { title: "Modifier le coaching" };

export default async function EditCoachingPage({
  params,
}: PageProps<"/e/[slug]/coachings/[id]/modifier">) {
  const { slug, id } = await params;
  const context = await requireCoach(slug);
  const coaching = await getCoaching(id);
  if (!coaching || !(await canManageMember(coaching.subjectMembershipId))) notFound();
  if (coaching.status !== "planifie") redirect(`/e/${slug}/coachings/${id}`);
  const framework = await loadOrganizationTree(context.organization.id);
  if (!framework) notFound();

  return (
    <>
      <p className="mb-2 text-sm">
        <Link
          href={`/e/${slug}/coachings/${id}`}
          className="font-semibold text-forest-light hover:text-forest-deep"
        >
          ← Retour au coaching
        </Link>
      </p>
      <PageHeader title="Modifier le coaching" description={coaching.subjectName} />
      <Card className="max-w-2xl">
        <CoachingForm
          slug={slug}
          organizationId={context.organization.id}
          reps={[{ id: coaching.subjectMembershipId, name: coaching.subjectName }]}
          blocks={editorBlocks(framework.tree)}
          coachingId={coaching.id}
          defaults={{
            memberId: coaching.subjectMembershipId,
            scheduledLocal: utcToLocalInput(coaching.scheduledAt),
            durationMinutes: coaching.durationMinutes,
            mode: coaching.mode,
            location: coaching.location,
            objective: coaching.objective,
            skillIds: coaching.skills.map((s) => s.id),
          }}
        />
      </Card>
    </>
  );
}
