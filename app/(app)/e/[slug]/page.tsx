import { ArrowRight, Circle, CircleCheck, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CoachingList } from "@/components/coaching/coaching-list";
import { CoachingsChart } from "@/components/dashboard/coachings-chart";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { TeamTable } from "@/components/dashboard/team-table";
import { WeakestSkills } from "@/components/dashboard/weakest-skills";
import { SkillRadar } from "@/components/evaluation/skill-radar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/ui/page";
import { requireCoach } from "@/lib/auth/require-org";
import type { CoachingSummary } from "@/lib/data/coachings";
import { loadDashboard } from "@/lib/data/dashboard";
import { listInvitations, listMembers, listTeams } from "@/lib/data/organization";
import { canAdministerOrg } from "@/lib/domain/roles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Accueil" };

/**
 * Tableau de bord (§4.10) : manager (son équipe) ou responsable (toute l'entreprise, par équipe,
 * avec les indicateurs de pilotage). Premiers pas tant que l'espace n'est pas en place.
 */
export default async function OrgHomePage({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const context = await requireCoach(slug);
  const admin = canAdministerOrg(context.role);
  const orgId = context.organization.id;

  const [members, teams, invitations] = await Promise.all([
    listMembers(orgId),
    listTeams(orgId),
    listInvitations(orgId),
  ]);

  const reps = members.filter((m) => m.role === "sales_rep" && m.active);
  const managers = members.filter((m) => m.role === "manager" && m.active);
  const activeTeams = teams.filter((t) => t.active);
  const base = `/e/${slug}`;

  const steps = admin
    ? [
        {
          done: activeTeams.length > 0,
          label: "Créer une première équipe",
          href: `${base}/parametres/equipes`,
        },
        {
          done: activeTeams.some((t) => t.managerIds.length > 0),
          label: "Lui attribuer un manager",
          href: `${base}/parametres/equipes`,
        },
        {
          done: reps.length > 0 || invitations.some((i) => i.role === "sales_rep"),
          label: "Inviter les commerciaux",
          href: `${base}/equipe`,
        },
      ]
    : [
        {
          done: reps.length > 0 || invitations.length > 0,
          label: "Inviter les commerciaux de mon équipe",
          href: `${base}/equipe`,
        },
      ];
  const remaining = steps.filter((s) => !s.done);
  const data = await loadDashboard(orgId, context.role);
  const hrefCoaching = (c: CoachingSummary) => `${base}/coachings/${c.id}`;

  return (
    <>
      <PageHeader
        title={context.organization.name}
        description={admin ? "Pilotage de l'entreprise" : "Votre équipe"}
        action={
          data.rows.length ? (
            <Button asChild variant="outline" size="sm">
              <a href={`${base}/export/commerciaux`} download>
                <Download aria-hidden="true" /> Exporter (CSV)
              </a>
            </Button>
          ) : undefined
        }
      />

      {remaining.length > 0 ? (
        <section className="mb-8">
          <SectionTitle>Pour bien démarrer</SectionTitle>
          <Card className="p-2">
            <ul>
              {steps.map((step) => (
                <li key={step.label}>
                  <Link
                    href={step.href}
                    className="flex min-h-14 items-center gap-3 rounded-(--radius-control) px-3 hover:bg-bone"
                  >
                    {step.done ? (
                      <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success" />
                    ) : (
                      <Circle aria-hidden="true" className="size-5 shrink-0 text-subtle" />
                    )}
                    <span className={cn("flex-1", step.done && "text-muted line-through")}>
                      {step.label}
                    </span>
                    {!step.done ? (
                      <ArrowRight aria-hidden="true" className="size-4 text-muted" />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <StatTiles
        className="mb-4"
        tiles={[
          {
            label: "Comptes rendus à rédiger",
            value: data.toWrite.length,
            href: `${base}/coachings`,
            alert: data.toWrite.length > 0,
          },
          {
            label: "Coachings à venir",
            value: data.upcoming.length,
            hint: "sur 14 jours",
            href: `${base}/coachings?vue=semaine`,
          },
          {
            label: "Demandes de coaching",
            value: data.requests.length,
            href: `${base}/coachings?vue=demandes`,
          },
          {
            label: "Sans coaching",
            value: data.withoutCoaching.length,
            hint: `depuis plus de ${data.settings.daysWithoutCoaching} jours`,
            alert: data.withoutCoaching.length > 0,
          },
        ]}
      />
      {admin ? (
        <StatTiles
          className="mb-8"
          tiles={[
            {
              label: "Maîtrise moyenne",
              value: data.mastery === null ? "–" : `${data.mastery} %`,
              hint: "compétences à 3 ou plus",
            },
            {
              label: "Couverture",
              value: data.coverage === null ? "–" : `${data.coverage} %`,
              hint: "commerciaux évalués depuis 90 jours",
            },
            {
              label: "CR sous 48 h",
              value: data.onTimeRate === null ? "–" : `${data.onTimeRate} %`,
              hint: "sur les 90 derniers jours",
            },
            {
              label: "Commerciaux",
              value: reps.length,
              hint: `${managers.length} manager${managers.length > 1 ? "s" : ""} · ${activeTeams.length} équipe${activeTeams.length > 1 ? "s" : ""}`,
              href: `${base}/equipe`,
            },
          ]}
        />
      ) : (
        <div className="mb-8" />
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle>Comptes rendus à rédiger</SectionTitle>
          {data.toWrite.length ? (
            <CoachingList
              coachings={data.toWrite.slice(0, 5)}
              now={data.now}
              hrefFor={hrefCoaching}
            />
          ) : (
            <p className="text-muted">Aucun compte rendu en retard</p>
          )}
        </section>
        <section>
          <SectionTitle>À suivre en priorité</SectionTitle>
          {data.withoutCoaching.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-(--radius-card) border border-line bg-surface">
              {data.withoutCoaching.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`${base}/equipe/${r.id}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-bone"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{r.name}</span>
                      <span className="block text-sm text-danger">
                        {r.daysSinceCoaching === null
                          ? "Jamais coaché"
                          : `Pas de coaching depuis ${r.daysSinceCoaching} jours`}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-forest-light">Planifier</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Tous les commerciaux ont été coachés récemment.</p>
          )}
        </section>
      </div>

      {data.hasFramework && data.rows.length ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-display text-lg font-semibold">Radar de l&apos;équipe</h2>
            <p className="text-sm text-muted">Moyenne des commerciaux par compétence, sur 4.</p>
            {data.radar.some((p) => p.current !== null) ? (
              <SkillRadar points={data.radar} />
            ) : (
              <p className="mt-4 text-sm text-muted">
                Le radar apparaîtra après les premières évaluations.
              </p>
            )}
          </Card>
          <WeakestSkills skills={data.weakest} />
        </div>
      ) : null}

      {admin && data.teams.length > 1 ? (
        <section className="mt-8">
          <SectionTitle
            aside={
              <a
                href={`${base}/export/equipes`}
                download
                className="text-sm font-semibold text-forest-light hover:underline"
              >
                Exporter (CSV)
              </a>
            }
          >
            Par équipe
          </SectionTitle>
          <div className="overflow-x-auto rounded-(--radius-card) border border-line bg-surface">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-line bg-bone text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Équipe</th>
                  <th className="px-4 py-3 font-semibold">Commerciaux</th>
                  <th className="px-4 py-3 font-semibold">Maîtrise</th>
                  <th className="px-4 py-3 font-semibold">Couverture 90 j</th>
                  <th className="px-4 py-3 font-semibold">Sans coaching</th>
                  <th className="px-4 py-3 font-semibold">Actions en retard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.teams.map((t) => (
                  <tr key={t.name}>
                    <td className="px-4 py-3 font-semibold">{t.name}</td>
                    <td className="px-4 py-3 tabular-nums">{t.reps}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {t.mastery === null ? "–" : `${t.mastery} %`}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {t.coverage === null ? "–" : `${t.coverage} %`}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 tabular-nums",
                        t.withoutCoaching > 0 && "font-semibold text-danger",
                      )}
                    >
                      {t.withoutCoaching}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 tabular-nums",
                        t.overdueActions > 0 && "font-semibold text-danger",
                      )}
                    >
                      {t.overdueActions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {admin ? (
        <Card className="mt-8">
          <h2 className="font-display text-lg font-semibold">Coachings clôturés par mois</h2>
          <p className="mb-2 text-sm text-muted">Par manager, sur les 6 derniers mois.</p>
          <CoachingsChart coaches={data.perMonth.coaches} rows={data.perMonth.rows} />
        </Card>
      ) : null}

      {data.rows.length ? (
        <section className="mt-8">
          <SectionTitle>{admin ? "Tous les commerciaux" : "Mon équipe"}</SectionTitle>
          <TeamTable
            rows={data.rows}
            slug={slug}
            showTeam={admin}
            daysWithoutCoaching={data.settings.daysWithoutCoaching}
          />
        </section>
      ) : null}
    </>
  );
}
