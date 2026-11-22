import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActionCard } from "@/components/actions/action-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-controls";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireCoach } from "@/lib/auth/require-org";
import { now as currentTime } from "@/lib/clock";
import { listActions } from "@/lib/data/actions";
import { listCoachableReps } from "@/lib/data/coachings";
import { loadOrganizationTree } from "@/lib/data/framework";
import { skillGroups } from "@/lib/data/progress";
import { groupActions } from "@/lib/domain/actions";
import { todayInZone } from "@/lib/domain/coaching";
import { uuidSchema } from "@/lib/validation/schemas";

export const metadata: Metadata = { title: "Actions de l'équipe" };

/** Actions de toute l'équipe (§4.8), filtrables : en retard, par commercial, par compétence. */
export default async function TeamActionsPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/equipe/actions">) {
  const { slug } = await params;
  const { commercial, competence, retard, terminees } = await searchParams;
  const context = await requireCoach(slug);
  const orgId = context.organization.id;
  const memberId = uuidSchema.safeParse(commercial).success ? String(commercial) : undefined;
  const skillId = uuidSchema.safeParse(competence).success ? String(competence) : undefined;
  const onlyOverdue = retard === "1";
  const withClosed = terminees === "1";

  const [actions, reps, framework] = await Promise.all([
    listActions(orgId, { memberId, skillId }),
    listCoachableReps(orgId),
    loadOrganizationTree(orgId),
  ]);
  const today = todayInZone(currentTime());
  const managed = new Set(reps.map((r) => r.id));
  const groups = groupActions(
    actions.filter((a) => managed.has(a.subjectMembershipId)),
    today,
  );
  const visible = onlyOverdue
    ? groups.overdue
    : [
        ...groups.overdue,
        ...groups.inProgress,
        ...groups.todo,
        ...(withClosed ? [...groups.done, ...groups.abandoned] : []),
      ];
  const groupsForSelect = framework ? skillGroups(framework.tree) : [];
  const overdueCount = groups.overdue.length;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link
          href={`/e/${slug}/equipe`}
          className="font-semibold text-forest-light hover:text-forest-deep"
        >
          ← Équipe
        </Link>
      </p>
      <PageHeader
        title="Actions de l'équipe"
        description={`${groups.overdue.length + groups.inProgress.length + groups.todo.length} en cours${overdueCount ? ` · ${overdueCount} en retard` : ""}`}
      />

      <form className="mb-6 grid gap-3 rounded-(--radius-card) border border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Commercial
          <Select name="commercial" defaultValue={memberId ?? ""}>
            <option value="">Tous</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Compétence
          <Select name="competence" defaultValue={skillId ?? ""}>
            <option value="">Toutes</option>
            {groupsForSelect.map((g) => (
              <optgroup key={g.competency} label={g.competency}>
                {g.skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </label>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="retard"
              value="1"
              defaultChecked={onlyOverdue}
              className="size-4 accent-(--color-forest)"
            />
            En retard seulement
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="terminees"
              value="1"
              defaultChecked={withClosed}
              className="size-4 accent-(--color-forest)"
            />
            Voir les terminées
          </label>
          <Button type="submit" variant="secondary" size="sm">
            Filtrer
          </Button>
        </div>
      </form>

      {visible.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={onlyOverdue ? "Aucune action en retard" : "Aucune action"}
          text="Les actions décidées en coaching apparaissent ici automatiquement."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((a) => (
            <li key={a.id}>
              <ActionCard
                action={a}
                today={today}
                slug={slug}
                organizationId={orgId}
                skillGroups={groupsForSelect}
                self={false}
                canManage
                showSubject
                memberHref={`/e/${slug}/equipe/${a.subjectMembershipId}?vue=plan`}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
