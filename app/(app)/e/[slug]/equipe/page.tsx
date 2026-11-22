import { ListChecks, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { InvitationList } from "@/components/org/invitation-list";
import { InviteForm } from "@/components/org/invite-form";
import { MemberList } from "@/components/org/member-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/page";
import { requireCoach } from "@/lib/auth/require-org";
import {
  listInvitations,
  listManagedTeamIds,
  listMembers,
  listTeams,
} from "@/lib/data/organization";
import { canAdministerOrg } from "@/lib/domain/roles";

export const metadata: Metadata = { title: "Équipe" };

/**
 * Commerciaux suivis : ceux de ses équipes pour un manager, tous pour un responsable (§11).
 * Le manager peut inviter des commerciaux dans ses équipes (§2.2).
 */
export default async function TeamPage({ params }: PageProps<"/e/[slug]/equipe">) {
  const { slug } = await params;
  const context = await requireCoach(slug);
  const admin = canAdministerOrg(context.role);
  const orgId = context.organization.id;

  const [members, teams, invitations, managedTeamIds] = await Promise.all([
    listMembers(orgId),
    listTeams(orgId),
    listInvitations(orgId),
    context.membershipId ? listManagedTeamIds(context.membershipId) : Promise.resolve([]),
  ]);

  const reps = members.filter((m) => m.role === "sales_rep");
  const invitableTeams = teams
    .filter((t) => t.active && (admin || managedTeamIds.includes(t.id)))
    .map((t) => ({ id: t.id, name: t.name }));
  const repInvitations = invitations.filter((i) => i.role === "sales_rep");

  // Regroupement par équipe, pour une lecture rapide sur téléphone.
  const groups = teams
    .map((team) => ({ team, reps: reps.filter((r) => r.teamId === team.id) }))
    .filter((group) => group.reps.length > 0);

  return (
    <>
      <PageHeader
        title={admin ? "Commerciaux" : "Mon équipe"}
        description={`${reps.filter((r) => r.active).length} commercia${reps.filter((r) => r.active).length > 1 ? "ux" : "l"} actif${reps.filter((r) => r.active).length > 1 ? "s" : ""}`}
        action={
          reps.length ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/e/${slug}/equipe/actions`}>
                <ListChecks aria-hidden="true" /> Actions de l&apos;équipe
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="flex flex-col gap-8">
          {groups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun commercial pour l'instant"
              text={
                invitableTeams.length > 0
                  ? "Invitez vos commerciaux : ils recevront un email pour rejoindre l'espace."
                  : admin
                    ? "Créez d'abord une équipe dans les paramètres, puis invitez vos commerciaux."
                    : "Vous ne managez encore aucune équipe. Demandez à votre responsable de vous en attribuer une."
              }
            />
          ) : (
            groups.map((group) => (
              <section key={group.team.id}>
                <SectionTitle
                  aside={
                    group.team.managerNames.length ? (
                      <span className="text-sm text-muted">
                        {group.team.managerNames.join(", ")}
                      </span>
                    ) : undefined
                  }
                >
                  {group.team.name}
                </SectionTitle>
                <MemberList
                  members={group.reps}
                  showRole={false}
                  hrefFor={(m) => `/e/${slug}/equipe/${m.id}`}
                />
              </section>
            ))
          )}

          {repInvitations.length > 0 ? (
            <section>
              <SectionTitle>Invitations en attente</SectionTitle>
              <InvitationList organizationId={orgId} invitations={repInvitations} />
            </section>
          ) : null}
        </div>

        {invitableTeams.length > 0 ? (
          <aside>
            <SectionTitle>Inviter un commercial</SectionTitle>
            <Card>
              <InviteForm organizationId={orgId} roles={["sales_rep"]} teams={invitableTeams} />
            </Card>
          </aside>
        ) : null}
      </div>
    </>
  );
}
