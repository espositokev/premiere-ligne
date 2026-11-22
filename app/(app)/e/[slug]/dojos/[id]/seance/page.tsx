import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionForm } from "@/components/dojo/session-form";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireCoach } from "@/lib/auth/require-org";
import { now as currentTime } from "@/lib/clock";
import { listCoachableReps } from "@/lib/data/coachings";
import { getDojo } from "@/lib/data/dojos";
import { todayInZone } from "@/lib/domain/coaching";
import { uuidSchema } from "@/lib/validation/schemas";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Noter une séance" };

export default async function DojoSessionPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/dojos/[id]/seance">) {
  const { slug, id } = await params;
  const { commercial } = await searchParams;
  if (!uuidSchema.safeParse(id).success) notFound();
  const context = await requireCoach(slug);
  const [dojo, reps] = await Promise.all([
    getDojo(context.organization.id, id),
    listCoachableReps(context.organization.id),
  ]);
  if (!dojo) notFound();

  return (
    <>
      <Link
        href={`/e/${slug}/dojos/${dojo.id}`}
        className="text-sm font-semibold text-forest-light hover:underline"
      >
        ← {dojo.title}
      </Link>
      <div className="mt-3">
        <PageHeader title="Noter une séance" description={dojo.title} />
      </div>
      {reps.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun commercial"
          text="Les commerciaux de vos équipes apparaîtront ici."
        />
      ) : (
        <Card className="max-w-2xl">
          <SessionForm
            slug={slug}
            organizationId={context.organization.id}
            dojoId={dojo.id}
            reps={reps}
            scenarios={dojo.content.offline.scenarios.map((s) => s.title)}
            today={todayInZone(currentTime())}
            defaultMemberId={typeof commercial === "string" ? commercial : undefined}
          />
        </Card>
      )}
    </>
  );
}
