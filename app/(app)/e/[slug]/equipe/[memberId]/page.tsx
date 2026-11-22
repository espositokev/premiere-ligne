import { ClipboardCheck, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { startEvaluation } from "@/app/actions/evaluations";
import { EvaluationHistory } from "@/components/evaluation/evaluation-history";
import { ManagerNotes } from "@/components/evaluation/manager-notes";
import { MemberProgress } from "@/components/evaluation/member-progress";
import { ProgressSummary } from "@/components/evaluation/progress-summary";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/form-controls";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { TabsNav } from "@/components/ui/tabs-nav";
import { requireCoach } from "@/lib/auth/require-org";
import { canManageMember, listManagerNotes, loadMemberProfile } from "@/lib/data/evaluations";
import { formatDate, formatShortDate, loadProgress } from "@/lib/data/progress";
import { activeSkillsOf } from "@/lib/domain/evaluation";
import { canAdministerOrg } from "@/lib/domain/roles";

export const metadata: Metadata = { title: "Fiche commercial" };

const TABS = ["matrice", "historique", "notes"] as const;
type Tab = (typeof TABS)[number];

function seniority(hiredAt: string | null) {
  if (!hiredAt) return null;
  const months = Math.max(
    0,
    Math.floor(
      (Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(hiredAt)) /
        (30.44 * 86_400_000),
    ),
  );
  if (months < 1) return "Arrivé ce mois-ci";
  if (months < 12) return `${months} mois d'ancienneté`;
  const years = Math.floor(months / 12);
  return `${years} an${years > 1 ? "s" : ""} d'ancienneté`;
}

/** Fiche commercial, vue manager (§4.6). */
export default async function MemberPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/equipe/[memberId]">) {
  const { slug, memberId } = await params;
  const { vue } = await searchParams;
  const tab: Tab = TABS.includes(vue as Tab) ? (vue as Tab) : "matrice";
  const context = await requireCoach(slug);
  const orgId = context.organization.id;

  const member = await loadMemberProfile(orgId, memberId);
  if (!member || member.role !== "sales_rep" || !(await canManageMember(memberId))) notFound();

  const [progress, notes] = await Promise.all([
    loadProgress(orgId, memberId),
    tab === "notes" ? listManagerNotes(memberId) : Promise.resolve([]),
  ]);
  const admin = canAdministerOrg(context.role);
  const base = `/e/${slug}/equipe/${memberId}`;
  const total = activeSkillsOf(progress.tree).length;
  const unrated = activeSkillsOf(progress.tree).filter((s) => !progress.latest.has(s.id)).length;

  const subtitle = [
    member.jobTitle,
    member.teamName,
    member.managerNames.join(", ") || null,
    seniority(member.hiredAt),
  ]
    .filter(Boolean)
    .join(" · ");

  const action = progress.hasFramework ? (
    <form action={startEvaluation}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="member_id" value={memberId} />
      <input type="hidden" name="kind" value="manager" />
      <SubmitButton pendingLabel="Ouverture…" className="w-full sm:w-auto">
        <ClipboardCheck aria-hidden="true" />
        {progress.managerDraft ? "Reprendre l'évaluation" : "Nouvelle évaluation"}
      </SubmitButton>
    </form>
  ) : null;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link
          href={`/e/${slug}/equipe`}
          className="font-semibold text-forest-light hover:text-forest-deep"
        >
          ← {admin ? "Commerciaux" : "Mon équipe"}
        </Link>
      </p>
      <PageHeader
        title={`${member.firstName} ${member.lastName}`}
        description={subtitle || member.email}
        action={action}
      />

      {!progress.hasFramework ? (
        <EmptyState
          icon={Settings2}
          title="Pas encore de matrice de compétences"
          text="L'évaluation sera possible dès que la matrice de l'entreprise sera en place."
        />
      ) : (
        <>
          <ProgressSummary
            items={[
              {
                label: "Maîtrise",
                value: progress.mastery === null ? "–" : `${progress.mastery} %`,
                hint: "sous-compétences à 3 ou plus",
              },
              {
                label: "Dernière évaluation",
                value: progress.lastEvaluatedAt
                  ? formatShortDate(progress.lastEvaluatedAt)
                  : "Aucune",
              },
              { label: "Non évaluées", value: `${unrated}`, hint: `sur ${total}` },
              {
                label: "Auto-évaluation",
                value: progress.self.size > 0 ? "Faite" : "Pas encore",
              },
            ]}
          />

          <div className="mt-6">
            <TabsNav
              label="Sections de la fiche"
              current={tab}
              tabs={[
                { key: "matrice", label: "Matrice", href: base },
                { key: "historique", label: "Historique", href: `${base}?vue=historique` },
                { key: "notes", label: "Notes privées", href: `${base}?vue=notes` },
              ]}
            />
          </div>

          {tab === "matrice" ? (
            <MemberProgress
              tree={progress.tree}
              radar={progress.radar}
              latest={progress.latest}
              self={progress.self}
            />
          ) : null}
          {tab === "historique" ? (
            <EvaluationHistory
              evaluations={progress.evaluations}
              hrefFor={(e) => `${base}/evaluations/${e.id}`}
            />
          ) : null}
          {tab === "notes" ? (
            <ManagerNotes
              slug={slug}
              organizationId={orgId}
              memberId={memberId}
              notes={notes.map((n) => ({
                id: n.id,
                body: n.body,
                authorName: n.authorName,
                date: formatDate(n.createdAt),
                canDelete: admin || n.authorUserId === context.user.id,
              }))}
            />
          ) : null}
        </>
      )}

      {admin ? (
        <p className="mt-10 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/e/${slug}/parametres/utilisateurs/${memberId}`}>Modifier le compte</Link>
          </Button>
        </p>
      ) : null}
    </>
  );
}
