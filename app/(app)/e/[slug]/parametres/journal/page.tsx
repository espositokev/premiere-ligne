import type { Metadata } from "next";
import Link from "next/link";

import { AuditTable } from "@/components/org/audit-table";
import { PageHeader } from "@/components/ui/page";
import { requireOrgAdmin } from "@/lib/auth/require-org";
import { listAudit } from "@/lib/data/audit-log";
import { AUDIT_FILTERS } from "@/lib/domain/audit-labels";

export const metadata: Metadata = { title: "Journal d'activité" };

export default async function OrgAuditPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/parametres/journal">) {
  const { slug } = await params;
  const { famille, avant } = await searchParams;
  const context = await requireOrgAdmin(slug);
  const prefix = AUDIT_FILTERS.some((f) => f.value === famille) ? String(famille) : "";
  const before = Number.isInteger(Number(avant)) && Number(avant) > 0 ? Number(avant) : undefined;
  const { entries, nextBefore } = await listAudit({
    organizationId: context.organization.id,
    prefix,
    before,
  });
  return (
    <>
      <Link
        href={`/e/${slug}/parametres`}
        className="text-sm font-semibold text-forest-light hover:underline"
      >
        ← Paramètres
      </Link>
      <PageHeader
        className="mt-3"
        title="Journal d'activité"
        description={context.organization.name}
      />
      <AuditTable
        entries={entries}
        baseHref={`/e/${slug}/parametres/journal`}
        prefix={prefix}
        nextBefore={nextBefore}
      />
    </>
  );
}
