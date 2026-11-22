import { ClipboardPen, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { startEvaluation } from "@/app/actions/evaluations";
import { EvaluationHistory } from "@/components/evaluation/evaluation-history";
import { MemberProgress } from "@/components/evaluation/member-progress";
import { ProgressSummary } from "@/components/evaluation/progress-summary";
import { SubmitButton } from "@/components/ui/form-controls";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { TabsNav } from "@/components/ui/tabs-nav";
import { getOrgContext } from "@/lib/auth/org-context";
import { formatShortDate, loadProgress } from "@/lib/data/progress";
import { activeSkillsOf } from "@/lib/domain/evaluation";

export const metadata: Metadata = { title: "Ma progression" };

/** Espace du commercial (§4.9) : sa matrice, son radar, ses évaluations. Tutoiement (§10.1). */
export default async function MyProgressPage({ params, searchParams }: PageProps<"/e/[slug]/moi">) {
  const { slug } = await params;
  const { vue } = await searchParams;
  const context = await getOrgContext(slug);
  if (context.role !== "sales_rep" || !context.membershipId) redirect(`/e/${slug}`);
  const tab = vue === "historique" ? "historique" : "matrice";

  const progress = await loadProgress(context.organization.id, context.membershipId);
  const total = activeSkillsOf(progress.tree).length;
  const base = `/e/${slug}/moi`;

  return (
    <>
      <PageHeader
        title={`Salut ${context.user.firstName} !`}
        description={context.organization.name}
        action={
          progress.hasFramework ? (
            <form action={startEvaluation}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="member_id" value={context.membershipId} />
              <input type="hidden" name="kind" value="self" />
              <SubmitButton
                variant="secondary"
                pendingLabel="Ouverture…"
                className="w-full sm:w-auto"
              >
                <ClipboardPen aria-hidden="true" />
                {progress.selfDraft ? "Reprendre mon auto-évaluation" : "Faire mon auto-évaluation"}
              </SubmitButton>
            </form>
          ) : undefined
        }
      />

      {!progress.hasFramework ? (
        <EmptyState
          icon={Settings2}
          title="Ta matrice de compétences arrive bientôt"
          text="Dès qu'elle sera en place, tu verras ici ta progression."
        />
      ) : (
        <>
          <ProgressSummary
            items={[
              {
                label: "Maîtrise",
                value: progress.mastery === null ? "–" : `${progress.mastery} %`,
                hint: "compétences à 3 ou plus",
              },
              {
                label: "Dernière évaluation",
                value: progress.lastEvaluatedAt
                  ? formatShortDate(progress.lastEvaluatedAt)
                  : "Aucune",
              },
              { label: "Évaluées", value: `${progress.latest.size}`, hint: `sur ${total}` },
              { label: "Auto-évaluation", value: progress.self.size > 0 ? "Faite" : "Pas encore" },
            ]}
          />
          <div className="mt-6">
            <TabsNav
              label="Sections"
              current={tab}
              tabs={[
                { key: "matrice", label: "Ma matrice", href: base },
                { key: "historique", label: "Historique", href: `${base}?vue=historique` },
              ]}
            />
          </div>
          {tab === "matrice" ? (
            progress.latest.size === 0 && progress.self.size === 0 ? (
              <>
                <p className="mb-6 rounded-(--radius-card) bg-fluo/40 px-4 py-3 text-sm">
                  Ton manager ne t&apos;a pas encore évalué. Tu peux commencer par ton
                  auto-évaluation : c&apos;est une bonne base pour en parler ensemble.
                </p>
                <MemberProgress
                  tree={progress.tree}
                  radar={progress.radar}
                  latest={progress.latest}
                  self={progress.self}
                  selfVoice
                />
              </>
            ) : (
              <MemberProgress
                tree={progress.tree}
                radar={progress.radar}
                latest={progress.latest}
                self={progress.self}
                selfVoice
              />
            )
          ) : (
            <EvaluationHistory
              self
              evaluations={progress.evaluations}
              hrefFor={(e) => `${base}/evaluations/${e.id}`}
            />
          )}
        </>
      )}
    </>
  );
}
