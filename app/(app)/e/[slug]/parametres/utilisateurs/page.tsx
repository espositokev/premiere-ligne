import type { Metadata } from "next";
import Link from "next/link";

import { InvitationList } from "@/components/org/invitation-list";
import { InviteForm } from "@/components/org/invite-form";
import { MemberList } from "@/components/org/member-list";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/ui/page";
import { requireOrgAdmin } from "@/lib/auth/require-org";
import { listInvitations, listMembers, listTeams } from "@/lib/data/organization";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Utilisateurs" };

const FILTERS = [
  { key: "tous", label: "Tous" },
  { key: "org_admin", label: "Responsables" },
  { key: "manager", label: "Managers" },
  { key: "sales_rep", label: "Commerciaux" },
  { key: "desactives", label: "Désactivés" },
] as const;

/** Gestion des utilisateurs de l'entreprise (§4.3). */
export default async function UsersPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/parametres/utilisateurs">) {
  const { slug } = await params;
  const { filtre, q } = await searchParams;
  const context = await requireOrgAdmin(slug);
  const orgId = context.organization.id;

  const [members, teams, invitations] = await Promise.all([
    listMembers(orgId),
    listTeams(orgId),
    listInvitations(orgId),
  ]);

  const filter = FILTERS.some((f) => f.key === filtre) ? (filtre as string) : "tous";
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const visible = members.filter((m) => {
    if (filter === "desactives" ? m.active : !m.active) return false;
    if (filter !== "tous" && filter !== "desactives" && m.role !== filter) return false;
    if (query && !`${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(query))
      return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description={`${members.filter((m) => m.active).length} accès actifs`}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="flex flex-col gap-8">
          <section>
            <form className="mb-3" role="search">
              {filter !== "tous" ? <input type="hidden" name="filtre" value={filter} /> : null}
              <label htmlFor="user-search" className="sr-only">
                Rechercher un utilisateur
              </label>
              <input
                id="user-search"
                name="q"
                defaultValue={query}
                placeholder="Rechercher un nom ou un email…"
                className="min-h-11 w-full rounded-(--radius-control) border border-line bg-surface px-3"
              />
            </form>
            <nav aria-label="Filtrer par rôle" className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={`?${new URLSearchParams({ ...(f.key !== "tous" ? { filtre: f.key } : {}), ...(query ? { q: query } : {}) })}`}
                  aria-current={filter === f.key ? "true" : undefined}
                  className={cn(
                    "flex min-h-9 shrink-0 items-center rounded-full border px-3 text-sm font-semibold",
                    filter === f.key
                      ? "border-forest bg-forest text-bone"
                      : "border-line bg-surface text-forest-deep",
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
            {visible.length === 0 ? (
              <p className="text-sm text-muted">Aucun utilisateur ne correspond.</p>
            ) : (
              <MemberList
                members={visible}
                hrefFor={(m) => `/e/${slug}/parametres/utilisateurs/${m.id}`}
              />
            )}
          </section>

          <section>
            <SectionTitle>Invitations en attente</SectionTitle>
            <InvitationList organizationId={orgId} invitations={invitations} />
          </section>
        </div>

        <aside>
          <SectionTitle>Inviter quelqu&apos;un</SectionTitle>
          <Card>
            <InviteForm
              organizationId={orgId}
              roles={["sales_rep", "manager", "org_admin"]}
              teams={teams.filter((t) => t.active).map((t) => ({ id: t.id, name: t.name }))}
            />
          </Card>
        </aside>
      </div>
    </>
  );
}
