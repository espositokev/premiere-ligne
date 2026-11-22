import { Building2, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PersonalShell } from "@/components/layout/personal-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { getMySpaces, requireUser } from "@/lib/auth/current-user";
import { ROLE_LABELS } from "@/lib/domain/roles";

export const metadata: Metadata = { title: "Mes espaces" };

export default async function SpacesPage() {
  const user = await requireUser();
  const spaces = await getMySpaces();

  // Un seul espace et pas super admin : pas besoin de choisir.
  const [only] = spaces;
  if (only && spaces.length === 1 && !user.isSuperAdmin) {
    redirect(only.role === "sales_rep" ? `/e/${only.slug}/moi` : `/e/${only.slug}`);
  }

  return (
    <PersonalShell>
      <PageHeader
        title="Mes espaces"
        description="Choisissez l'entreprise dans laquelle travailler."
      />
      {spaces.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun espace pour le moment"
          text={
            user.isSuperAdmin
              ? "Vous n'êtes membre d'aucune entreprise. Gérez-les depuis l'administration."
              : "Votre accès a peut-être été désactivé. Contactez votre responsable."
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {spaces.map((space) => (
            <li key={space.membershipId}>
              <Link
                href={space.role === "sales_rep" ? `/e/${space.slug}/moi` : `/e/${space.slug}`}
                className="flex min-h-16 items-center justify-between gap-4 rounded-(--radius-card) border border-line bg-surface px-5 py-4 shadow-(--shadow-card) hover:border-forest"
              >
                <span className="font-display font-semibold">{space.name}</span>
                <span className="flex items-center gap-3">
                  <Badge>{ROLE_LABELS[space.role]}</Badge>
                  <ChevronRight aria-hidden="true" className="size-5 text-muted" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PersonalShell>
  );
}
