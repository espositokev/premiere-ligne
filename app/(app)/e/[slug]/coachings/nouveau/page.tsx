import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CoachingForm } from "@/components/coaching/coaching-form";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireCoach } from "@/lib/auth/require-org";
import { now as currentTime } from "@/lib/clock";
import { listCoachableReps, listCoachingRequests } from "@/lib/data/coachings";
import { loadOrganizationTree } from "@/lib/data/framework";
import { editorBlocks } from "@/lib/data/progress";
import { utcToLocalInput } from "@/lib/domain/coaching";

export const metadata: Metadata = { title: "Planifier un coaching" };

/** Planifier un coaching, éventuellement à partir d'une demande ou de la fiche d'un commercial. */
export default async function NewCoachingPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/coachings/nouveau">) {
  const { slug } = await params;
  const { commercial, demande } = await searchParams;
  const context = await requireCoach(slug);
  const orgId = context.organization.id;

  const [reps, framework, requests] = await Promise.all([
    listCoachableReps(orgId),
    loadOrganizationTree(orgId),
    typeof demande === "string"
      ? listCoachingRequests(orgId, { pendingOnly: true })
      : Promise.resolve([]),
  ]);
  const request = requests.find((r) => r.id === demande);
  const memberId =
    request?.requesterMembershipId ?? (typeof commercial === "string" ? commercial : undefined);

  // Proposition par défaut : demain à 9 h.
  const now = currentTime();
  const tomorrow = utcToLocalInput(new Date(now.getTime() + 86_400_000).toISOString()).slice(0, 10);

  return (
    <>
      <p className="mb-2 text-sm">
        <Link
          href={`/e/${slug}/coachings`}
          className="font-semibold text-forest-light hover:text-forest-deep"
        >
          ← Coachings
        </Link>
      </p>
      <PageHeader
        title="Planifier un coaching"
        description={request ? `Suite à la demande de ${request.requesterName}` : undefined}
      />
      {reps.length === 0 || !framework ? (
        <EmptyState
          icon={Users}
          title={reps.length === 0 ? "Aucun commercial à coacher" : "Pas encore de matrice"}
          text={
            reps.length === 0
              ? "Les commerciaux de vos équipes apparaîtront ici."
              : "Le coaching s'appuie sur la matrice de compétences de l'entreprise."
          }
        />
      ) : (
        <Card className="max-w-2xl">
          <CoachingForm
            slug={slug}
            organizationId={orgId}
            reps={reps}
            blocks={editorBlocks(framework.tree)}
            requestId={request?.id}
            defaults={{
              memberId: reps.some((r) => r.id === memberId) ? memberId : undefined,
              scheduledLocal: `${tomorrow}T09:00`,
              skillIds: request?.skills.map((s) => s.id),
              objective: request?.message?.slice(0, 500),
            }}
          />
        </Card>
      )}
    </>
  );
}
