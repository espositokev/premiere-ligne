import { ArrowRight, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { setOrganizationStatus } from "@/app/actions/organizations";
import { InvitationList } from "@/components/org/invitation-list";
import { InviteForm } from "@/components/org/invite-form";
import { MemberList } from "@/components/org/member-list";
import { ToggleForm } from "@/components/org/toggle-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/page";
import { requireSuperAdmin } from "@/lib/auth/current-user";
import { listTemplates, loadOrganizationTree } from "@/lib/data/framework";
import { listInvitations, listMembers, listTeams } from "@/lib/data/organization";
import { countTree } from "@/lib/domain/framework";
import { uuidSchema } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/server";

import { ApplyTemplateForm } from "@/components/framework/apply-template-form";
import { STATUS_LABELS } from "../../organization-table";

export const metadata: Metadata = { title: "Fiche entreprise" };

export default async function OrganizationDetailPage({
  params,
}: PageProps<"/admin/entreprises/[id]">) {
  await requireSuperAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug, status, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!organization) notFound();

  const [members, invitations, teams, framework, templates] = await Promise.all([
    listMembers(organization.id),
    listInvitations(organization.id),
    listTeams(organization.id),
    loadOrganizationTree(organization.id),
    listTemplates({ publishedOnly: true }),
  ]);
  const frameworkCounts = framework ? countTree(framework.tree) : null;
  const leaders = members.filter((m) => m.role !== "sales_rep");
  const repCount = members.filter((m) => m.role === "sales_rep" && m.active).length;

  return (
    <>
      <Link
        href="/admin/entreprises"
        className="text-sm font-semibold text-forest-light hover:underline"
      >
        ← Entreprises
      </Link>
      <PageHeader
        className="mt-3"
        title={organization.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={organization.status === "actif" ? "success" : "warning"}>
              {STATUS_LABELS[organization.status]}
            </Badge>
            <span>/e/{organization.slug}</span>
          </span>
        }
        action={
          <Button asChild variant="secondary">
            <Link href={`/e/${organization.slug}`}>
              Entrer dans l&apos;espace
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-8">
          <section>
            <SectionTitle>Inviter un responsable ou un manager</SectionTitle>
            <Card>
              <InviteForm
                organizationId={organization.id}
                roles={["org_admin", "manager"]}
                teams={teams.filter((t) => t.active).map((t) => ({ id: t.id, name: t.name }))}
              />
            </Card>
          </section>

          <section>
            <SectionTitle>Invitations en attente</SectionTitle>
            <InvitationList organizationId={organization.id} invitations={invitations} />
          </section>

          <section>
            <SectionTitle
              aside={<span className="text-sm text-muted">{repCount} commerciaux actifs</span>}
            >
              Responsables et managers
            </SectionTitle>
            {leaders.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="Personne pour l'instant"
                text="Invitez le responsable de l'entreprise : il pourra ensuite inviter ses équipes."
              />
            ) : (
              <MemberList
                members={leaders}
                hrefFor={(member) => `/e/${organization.slug}/parametres/utilisateurs/${member.id}`}
              />
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardTitle>Matrice de compétences</CardTitle>
            {framework && frameworkCounts ? (
              <>
                <CardDescription className="mt-2 mb-4 text-sm">
                  {frameworkCounts.competencies} compétences · {frameworkCounts.skills}{" "}
                  sous-compétences
                </CardDescription>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/e/${organization.slug}/parametres/referentiel`}>
                    Adapter la matrice
                  </Link>
                </Button>
              </>
            ) : (
              <div className="mt-3">
                <ApplyTemplateForm
                  organizationId={organization.id}
                  templates={templates.map((t) => ({ id: t.id, name: t.name }))}
                />
              </div>
            )}
          </Card>
          <Card>
            <CardTitle>Statut de l&apos;espace</CardTitle>
            <CardDescription className="mt-2 mb-4 text-sm">
              Une entreprise suspendue ou archivée n&apos;est plus accessible à ses utilisateurs.
              Ses données sont conservées.
            </CardDescription>
            <div className="flex flex-col gap-2">
              {organization.status !== "actif" ? (
                <ToggleForm
                  action={setOrganizationStatus}
                  fields={{ organization_id: organization.id, status: "actif" }}
                  label="Réactiver l'espace"
                  variant="secondary"
                />
              ) : null}
              {organization.status !== "suspendu" ? (
                <ToggleForm
                  action={setOrganizationStatus}
                  fields={{ organization_id: organization.id, status: "suspendu" }}
                  label="Suspendre l'espace"
                  confirmLabel="Confirmer la suspension"
                />
              ) : null}
              {organization.status !== "archive" ? (
                <ToggleForm
                  action={setOrganizationStatus}
                  fields={{ organization_id: organization.id, status: "archive" }}
                  label="Archiver l'espace"
                  confirmLabel="Confirmer l'archivage"
                  variant="ghost"
                />
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
