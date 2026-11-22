import { CalendarClock, MapPin, Target, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { cancelCoaching, reopenCoaching } from "@/app/actions/coachings";
import { ReasonForm } from "@/components/coaching/reason-form";
import { RepCommentForm } from "@/components/coaching/rep-comment-form";
import { ReportEditor } from "@/components/coaching/report-editor";
import { ReportView } from "@/components/coaching/report-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { getOrgContext } from "@/lib/auth/org-context";
import { now as currentTime } from "@/lib/clock";
import { getCoaching } from "@/lib/data/coachings";
import { canManageMember } from "@/lib/data/evaluations";
import { loadOrganizationTree } from "@/lib/data/framework";
import { editorBlocks } from "@/lib/data/progress";
import {
  canClose,
  COACHING_MODE_LABELS,
  COACHING_STATUS_LABELS,
  displayStatus,
  formatTimeRange,
  formatWhen,
} from "@/lib/domain/coaching";
import { canAdministerOrg } from "@/lib/domain/roles";

export const metadata: Metadata = { title: "Coaching" };

/** Un coaching : informations, compte rendu (saisie ou lecture), commentaire du commercial. */
export default async function CoachingPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/coachings/[id]">) {
  const { slug, id } = await params;
  const { planifie } = await searchParams;
  const context = await getOrgContext(slug);
  const coaching = await getCoaching(id);
  if (!coaching || coaching.organizationId !== context.organization.id) notFound();

  const coach = await canManageMember(coaching.subjectMembershipId);
  const admin = canAdministerOrg(context.role);
  const now = currentTime();
  const status = displayStatus(coaching, now);
  const framework = await loadOrganizationTree(context.organization.id);
  const blocks = framework ? editorBlocks(framework.tree) : [];
  const allSkills = blocks.flatMap((b) => b.competencies.flatMap((c) => c.skills));
  const skillNames = new Map(allSkills.map((s) => [s.id, s.name]));
  const backHref = coach ? `/e/${slug}/coachings` : `/e/${slug}/coachings`;
  const ModeIcon = coaching.mode === "distance" ? Video : MapPin;
  const started = Date.parse(coaching.scheduledAt) <= now.getTime();

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={backHref} className="font-semibold text-forest-light hover:text-forest-deep">
          ← {coach ? "Coachings" : "Mes coachings"}
        </Link>
      </p>
      <PageHeader
        title={
          coach ? `Coaching de ${coaching.subjectName}` : `Coaching avec ${coaching.coachName}`
        }
        description={coach ? `Par ${coaching.coachName}` : undefined}
        action={
          <Badge
            tone={
              status === "a_rediger"
                ? "danger"
                : status === "cloture"
                  ? "success"
                  : status === "annule"
                    ? "muted"
                    : "accent"
            }
          >
            {COACHING_STATUS_LABELS[status]}
          </Badge>
        }
      />

      {planifie && coach ? (
        <p className="mb-4 rounded-(--radius-card) bg-fluo/40 px-4 py-3 text-sm" role="status">
          Coaching planifié : {coaching.subjectName} a reçu un email avec l&apos;invitation pour son
          agenda.
        </p>
      ) : null}

      <Card className="mb-6 flex flex-col gap-2">
        <p className="flex items-center gap-2">
          <CalendarClock aria-hidden="true" className="size-4 text-muted" />
          <span className="first-letter:uppercase">{formatWhen(coaching.scheduledAt)}</span>
          <span className="text-muted">
            ({formatTimeRange(coaching.scheduledAt, coaching.durationMinutes)})
          </span>
        </p>
        <p className="flex items-center gap-2">
          <ModeIcon aria-hidden="true" className="size-4 text-muted" />
          {COACHING_MODE_LABELS[coaching.mode]}
          {coaching.location ? ` · ${coaching.location}` : ""}
        </p>
        {coaching.objective ? (
          <p className="flex items-start gap-2">
            <Target aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted" />
            <span className="whitespace-pre-line">{coaching.objective}</span>
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-2">
          {coaching.skills.map((s) => (
            <span key={s.id} className="rounded-full bg-forest/8 px-3 py-1 text-sm font-medium">
              {s.name}
            </span>
          ))}
        </div>
        {coaching.status === "annule" ? (
          <p className="mt-2 text-sm text-danger">Annulé : {coaching.cancelReason}</p>
        ) : null}
        {coaching.reopenedAt && coaching.status === "planifie" ? (
          <p className="mt-2 text-sm text-warning">
            Compte rendu rouvert : {coaching.reopenReason}
          </p>
        ) : null}
        {coach && coaching.status === "planifie" ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            {!started ? (
              <Button asChild variant="outline">
                <Link href={`/e/${slug}/coachings/${coaching.id}/modifier`}>Modifier</Link>
              </Button>
            ) : null}
            <ReasonForm
              action={cancelCoaching}
              hidden={{ slug, coaching_id: coaching.id }}
              openLabel="Annuler le coaching"
              label="Motif de l'annulation"
              submitLabel="Confirmer l'annulation"
              placeholder="Ex. : Commercial en congé"
              variant="ghost"
            />
          </div>
        ) : null}
      </Card>

      {coach && coaching.status === "planifie" ? (
        <ReportEditor
          slug={slug}
          coachingId={coaching.id}
          targetSkills={coaching.skills.map((s) => ({
            id: s.id,
            name: s.name,
            levels: allSkills.find((k) => k.id === s.id)?.levels ?? [],
          }))}
          skillOptions={allSkills.map((s) => ({ id: s.id, name: s.name }))}
          initialTexts={{
            context: coaching.report?.context ?? "",
            strengths: coaching.report?.strengths ?? "",
            improvements: coaching.report?.improvements ?? "",
          }}
          initialObservations={coaching.observations}
          initialPlan={coaching.report?.actionPlan ?? []}
          canCloseNow={canClose(coaching, now)}
          backHref={backHref}
        />
      ) : null}

      {!coach && coaching.status === "planifie" ? (
        <p className="text-muted">Le compte rendu sera disponible ici après le coaching.</p>
      ) : null}

      {coaching.status === "cloture" ? (
        <div className="flex flex-col gap-4">
          <ReportView
            report={coaching.report}
            skills={coaching.skills}
            observations={coaching.observations}
            skillNames={skillNames}
          />
          {coach ? (
            <Card>
              <h2 className="mb-1 font-display font-semibold">
                Commentaire de {coaching.subjectName}
              </h2>
              <p className="whitespace-pre-line text-forest-light">
                {coaching.repComment ?? "Pas encore de commentaire."}
              </p>
            </Card>
          ) : (
            <Card>
              <RepCommentForm
                slug={slug}
                coachingId={coaching.id}
                defaultValue={coaching.repComment}
              />
            </Card>
          )}
          {coach && admin ? (
            <div>
              <ReasonForm
                action={reopenCoaching}
                hidden={{ slug, coaching_id: coaching.id }}
                openLabel="Rouvrir le compte rendu"
                label="Motif de la réouverture (inscrit au journal)"
                submitLabel="Rouvrir"
                variant="ghost"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
