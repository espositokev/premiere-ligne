import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ActionPlan } from "@/components/actions/action-plan";
import { PageHeader } from "@/components/ui/page";
import { getOrgContext } from "@/lib/auth/org-context";
import { now as currentTime } from "@/lib/clock";
import { listActions } from "@/lib/data/actions";
import { loadOrganizationTree } from "@/lib/data/framework";
import { skillGroups } from "@/lib/data/progress";
import { countOverdue } from "@/lib/domain/actions";
import { todayInZone } from "@/lib/domain/coaching";

export const metadata: Metadata = { title: "Mon plan" };

/** Plan de progrès du commercial (§4.8, §4.9). */
export default async function MyPlanPage({ params }: PageProps<"/e/[slug]/moi/plan">) {
  const { slug } = await params;
  const context = await getOrgContext(slug);
  if (context.role !== "sales_rep" || !context.membershipId) redirect(`/e/${slug}`);

  const [actions, framework] = await Promise.all([
    listActions(context.organization.id, { memberId: context.membershipId }),
    loadOrganizationTree(context.organization.id),
  ]);
  const today = todayInZone(currentTime());
  const open = actions.filter((a) => a.status === "a_faire" || a.status === "en_cours").length;
  const overdue = countOverdue(actions, today);

  return (
    <>
      <PageHeader
        title="Mon plan de progrès"
        description={
          open === 0
            ? "Tes actions pour progresser."
            : `${open} action${open > 1 ? "s" : ""} en cours${overdue ? ` dont ${overdue} en retard` : ""}`
        }
      />
      <ActionPlan
        actions={actions}
        today={today}
        slug={slug}
        organizationId={context.organization.id}
        memberId={context.membershipId}
        skillGroups={framework ? skillGroups(framework.tree) : []}
        self
        canManage={false}
      />
    </>
  );
}
