import { CircleCheck, Circle, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/ui/page";
import { requireCoach } from "@/lib/auth/require-org";
import { listInvitations, listMembers, listTeams } from "@/lib/data/organization";
import { canAdministerOrg } from "@/lib/domain/roles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Accueil" };

/**
 * Tableau de bord provisoire (étape 1) : chiffres de l'équipe et premiers pas.
 * Les indicateurs de coaching arrivent aux étapes 4 et 6.
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

  const stats = [
    {
      label: admin ? "Commerciaux" : "Commerciaux de mon équipe",
      value: reps.length,
      href: `${base}/equipe`,
    },
    ...(admin
      ? [
          { label: "Managers", value: managers.length, href: `${base}/parametres/utilisateurs` },
          { label: "Équipes", value: activeTeams.length, href: `${base}/parametres/equipes` },
        ]
      : []),
    {
      label: "Invitations en attente",
      value: invitations.length,
      href: admin ? `${base}/parametres/utilisateurs` : `${base}/equipe`,
    },
  ];

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

  return (
    <>
      <PageHeader
        title={`Bonjour ${context.user.firstName}`}
        description={context.organization.name}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="h-full transition-colors group-hover:border-forest">
              <p className="font-display text-3xl font-bold sm:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </Card>
          </Link>
        ))}
      </div>

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

      <Card className="border-dashed">
        <CardTitle>Bientôt ici</CardTitle>
        <CardDescription className="mt-2">
          Les coachings à rédiger, ceux à venir et les commerciaux à suivre en priorité apparaîtront
          sur cette page.
        </CardDescription>
      </Card>
    </>
  );
}
