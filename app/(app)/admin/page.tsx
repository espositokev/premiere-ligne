import { Building2, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/page";
import { requireSuperAdmin } from "@/lib/auth/current-user";
import { getOrganizationActivity, getPlatformStats } from "@/lib/data/platform";

import { OrganizationTable } from "./organization-table";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminDashboardPage() {
  const user = await requireSuperAdmin();
  const [{ organizations, activeUsers, pendingInvitations }, activity] = await Promise.all([
    getPlatformStats(),
    getOrganizationActivity(),
  ]);

  const activeOrganizations = organizations.filter((o) => o.status === "actif").length;

  const stats = [
    { label: "Entreprises actives", value: activeOrganizations },
    { label: "Utilisateurs actifs sur 30 jours", value: activeUsers },
    { label: "Invitations en attente", value: pendingInvitations },
  ];

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.firstName}`}
        description="Vue d'ensemble de la plateforme."
        action={
          <Button asChild>
            <Link href="/admin/entreprises/nouvelle">
              <Plus aria-hidden="true" />
              Nouvelle entreprise
            </Link>
          </Button>
        }
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="font-display text-4xl font-bold">{stat.value}</p>
            <p className="mt-1 text-sm text-muted">{stat.label}</p>
          </Card>
        ))}
      </div>
      {activity.length ? (
        <section className="mb-8">
          <SectionTitle
            aside={
              <a
                href="/admin/export"
                download
                className="text-sm font-semibold text-forest-light hover:underline"
              >
                Exporter (CSV)
              </a>
            }
          >
            Activité par entreprise
          </SectionTitle>
          <div className="overflow-x-auto rounded-(--radius-card) border border-line bg-surface">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-line bg-bone text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Entreprise</th>
                  <th className="px-4 py-3 font-semibold">Connectés 30 j</th>
                  <th className="px-4 py-3 font-semibold">Coachings du mois</th>
                  <th className="px-4 py-3 font-semibold">Évaluations du mois</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {activity.map((o) => (
                  <tr key={o.id} className="hover:bg-bone">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/entreprises/${o.id}`}
                        className="font-semibold hover:underline"
                      >
                        {o.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {o.activeUsers30d} <span className="text-muted">/ {o.members}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{o.coachingsThisMonth}</td>
                    <td className="px-4 py-3 tabular-nums">{o.evaluationsThisMonth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <SectionTitle>Entreprises</SectionTitle>
      {organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune entreprise cliente"
          text="Créez le premier espace client, puis invitez son responsable."
          action={
            <Button asChild>
              <Link href="/admin/entreprises/nouvelle">Créer une entreprise</Link>
            </Button>
          }
        />
      ) : (
        <OrganizationTable />
      )}
    </>
  );
}
