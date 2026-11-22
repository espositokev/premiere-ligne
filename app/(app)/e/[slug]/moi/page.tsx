import { ClipboardPen, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { startEvaluation } from "@/app/actions/evaluations";
import { EvaluationHistory } from "@/components/evaluation/evaluation-history";
import { MemberProgress } from "@/components/evaluation/member-progress";
import { ProgressSummary } from "@/components/evaluation/progress-summary";
import { RepTodo, type TodoItem } from "@/components/evaluation/rep-todo";
import { SubmitButton } from "@/components/ui/form-controls";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { TabsNav } from "@/components/ui/tabs-nav";
import { getOrgContext } from "@/lib/auth/org-context";
import { now as currentTime } from "@/lib/clock";
import { listActions } from "@/lib/data/actions";
import { listCoachings } from "@/lib/data/coachings";
import { formatShortDate, loadProgress } from "@/lib/data/progress";
import { countOverdue, isDueSoon, reportsToRead } from "@/lib/domain/actions";
import { formatShortDay, formatWhen, groupCoachings, todayInZone } from "@/lib/domain/coaching";
import { activeSkillsOf } from "@/lib/domain/evaluation";

export const metadata: Metadata = { title: "Ma progression" };

/** Espace du commercial (§4.9) : sa matrice, son radar, ses évaluations. Tutoiement (§10.1). */
export default async function MyProgressPage({ params, searchParams }: PageProps<"/e/[slug]/moi">) {
  const { slug } = await params;
  const { vue } = await searchParams;
  const context = await getOrgContext(slug);
  if (context.role !== "sales_rep" || !context.membershipId) redirect(`/e/${slug}`);
  const tab = vue === "historique" ? "historique" : "matrice";

  const [progress, coachings, actions] = await Promise.all([
    loadProgress(context.organization.id, context.membershipId),
    listCoachings(context.organization.id, { memberId: context.membershipId }),
    listActions(context.organization.id, { memberId: context.membershipId }),
  ]);
  const now = currentTime();
  const today = todayInZone(now);
  const nextCoaching = groupCoachings(coachings, now).upcoming[0];
  const overdue = countOverdue(actions, today);
  const dueSoon = actions.filter((a) => isDueSoon(a, today)).length;
  const todo: TodoItem[] = [
    ...reportsToRead(coachings, now)
      .slice(0, 2)
      .map((c) => ({
        icon: "report" as const,
        title: "Nouveau compte rendu à lire",
        text: `Coaching du ${formatShortDay(c.scheduledAt)} avec ${c.coachName}`,
        href: `/e/${slug}/coachings/${c.id}`,
      })),
    ...(overdue
      ? [
          {
            icon: "late" as const,
            title: `${overdue} action${overdue > 1 ? "s" : ""} en retard`,
            text: "Fais le point sur ton plan de progrès",
            href: `/e/${slug}/moi/plan`,
            urgent: true,
          },
        ]
      : dueSoon
        ? [
            {
              icon: "late" as const,
              title: `${dueSoon} action${dueSoon > 1 ? "s" : ""} à faire cette semaine`,
              text: "Ton plan de progrès",
              href: `/e/${slug}/moi/plan`,
            },
          ]
        : []),
    ...(nextCoaching
      ? [
          {
            icon: "coaching" as const,
            title: "Prochain coaching",
            text: `${formatWhen(nextCoaching.scheduledAt)} avec ${nextCoaching.coachName}`,
            href: `/e/${slug}/coachings/${nextCoaching.id}`,
          },
        ]
      : []),
    ...(progress.selfDraft
      ? [
          {
            icon: "self" as const,
            title: "Termine ton auto-évaluation",
            text: "Tu l'as commencée, il ne reste que quelques notes",
            href: `/e/${slug}/moi/evaluations/${progress.selfDraft.id}`,
          },
        ]
      : []),
  ];
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

      <RepTodo items={todo} />

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
