import { UsersRound } from "lucide-react";
import type { Metadata } from "next";

import { setTeamActive } from "@/app/actions/teams";
import { TeamForm } from "@/components/org/team-form";
import { ToggleForm } from "@/components/org/toggle-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/page";
import { requireOrgAdmin } from "@/lib/auth/require-org";
import { listMembers, listTeams } from "@/lib/data/organization";

export const metadata: Metadata = { title: "Équipes" };

/** Équipes : nom, managers, membres (§4.3). */
export default async function TeamsPage({ params }: PageProps<"/e/[slug]/parametres/equipes">) {
  const { slug } = await params;
  const context = await requireOrgAdmin(slug);
  const orgId = context.organization.id;
  const [teams, members] = await Promise.all([listTeams(orgId), listMembers(orgId)]);

  const candidates = members
    .filter((m) => m.active && (m.role === "manager" || m.role === "org_admin"))
    .map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}` }));

  return (
    <>
      <PageHeader
        title="Équipes"
        description="Chaque commercial appartient à une équipe, suivie par un ou plusieurs managers."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section className="flex flex-col gap-3">
          {teams.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="Aucune équipe"
              text="Créez votre première équipe avec le formulaire."
            />
          ) : (
            teams.map((team) => (
              <details
                key={team.id}
                className="group rounded-(--radius-card) border border-line bg-surface"
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold">{team.name}</span>
                      {!team.active ? <Badge tone="muted">Désactivée</Badge> : null}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {team.memberCount} commercia{team.memberCount > 1 ? "ux" : "l"} ·{" "}
                      {team.managerNames.length ? team.managerNames.join(", ") : "aucun manager"}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-forest-light group-open:hidden">
                    Modifier
                  </span>
                  <span className="hidden text-sm font-semibold text-forest-light group-open:inline">
                    Fermer
                  </span>
                </summary>
                <div className="flex flex-col gap-5 border-t border-line p-4">
                  <TeamForm
                    organizationId={orgId}
                    candidates={candidates}
                    team={{ id: team.id, name: team.name, managerIds: team.managerIds }}
                  />
                  <ToggleForm
                    action={setTeamActive}
                    fields={{
                      organization_id: orgId,
                      team_id: team.id,
                      active: team.active ? "false" : "true",
                    }}
                    label={team.active ? "Désactiver l'équipe" : "Réactiver l'équipe"}
                    confirmLabel={team.active ? "Confirmer la désactivation" : undefined}
                    variant="ghost"
                  />
                </div>
              </details>
            ))
          )}
        </section>
        <aside>
          <SectionTitle>Nouvelle équipe</SectionTitle>
          <Card>
            <TeamForm organizationId={orgId} candidates={candidates} />
          </Card>
        </aside>
      </div>
    </>
  );
}
