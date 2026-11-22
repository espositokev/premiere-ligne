import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { setMemberActive } from "@/app/actions/members";
import { MemberEditForm } from "@/components/org/member-edit-form";
import { ToggleForm } from "@/components/org/toggle-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireOrgAdmin } from "@/lib/auth/require-org";
import { listMembers, listTeams } from "@/lib/data/organization";
import { ROLE_LABELS } from "@/lib/domain/roles";

export const metadata: Metadata = { title: "Utilisateur" };

export default async function MemberPage({
  params,
}: PageProps<"/e/[slug]/parametres/utilisateurs/[memberId]">) {
  const { slug, memberId } = await params;
  const context = await requireOrgAdmin(slug);
  const [members, teams] = await Promise.all([
    listMembers(context.organization.id),
    listTeams(context.organization.id),
  ]);
  const member = members.find((m) => m.id === memberId);
  if (!member) notFound();
  const isSelf = member.userId === context.user.id;

  return (
    <>
      <Link
        href={`/e/${slug}/parametres/utilisateurs`}
        className="text-sm font-semibold text-forest-light hover:underline"
      >
        ← Utilisateurs
      </Link>
      <PageHeader
        className="mt-3"
        title={`${member.firstName} ${member.lastName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="break-all">{member.email}</span>
            <Badge>{ROLE_LABELS[member.role]}</Badge>
            {!member.active ? <Badge tone="danger">Désactivé</Badge> : null}
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <MemberEditForm
            member={{
              id: member.id,
              role: member.role,
              teamId: member.teamId,
              jobTitle: member.jobTitle,
            }}
            teams={teams
              .filter((t) => t.active || t.id === member.teamId)
              .map((t) => ({ id: t.id, name: t.name }))}
            isSelf={isSelf}
          />
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Dernière connexion</CardTitle>
            <CardDescription className="mt-1">
              {member.lastSeenAt
                ? format(new Date(member.lastSeenAt), "dd/MM/yyyy 'à' HH:mm", { locale: fr })
                : "Jamais connecté"}
            </CardDescription>
          </Card>
          {!isSelf ? (
            <Card>
              <CardTitle>{member.active ? "Désactiver l'accès" : "Réactiver l'accès"}</CardTitle>
              <CardDescription className="mt-2 mb-4 text-sm">
                {member.active
                  ? "La personne ne pourra plus se connecter. Son historique est conservé."
                  : "La personne retrouvera son accès et son historique."}
              </CardDescription>
              <ToggleForm
                action={setMemberActive}
                fields={{ membership_id: member.id, active: member.active ? "false" : "true" }}
                label={member.active ? "Désactiver" : "Réactiver"}
                confirmLabel={member.active ? "Confirmer la désactivation" : undefined}
                variant={member.active ? "outline" : "secondary"}
              />
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
