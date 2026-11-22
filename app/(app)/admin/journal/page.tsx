import type { Metadata } from "next";

import { AuditTable } from "@/components/org/audit-table";
import { PageHeader } from "@/components/ui/page";
import { requireSuperAdmin } from "@/lib/auth/current-user";
import { listAudit } from "@/lib/data/audit-log";
import { AUDIT_FILTERS } from "@/lib/domain/audit-labels";

export const metadata: Metadata = { title: "Journal d'activité" };

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/journal">) {
  const { famille, avant } = await searchParams;
  await requireSuperAdmin();
  const prefix = AUDIT_FILTERS.some((f) => f.value === famille) ? String(famille) : "";
  const before = Number.isInteger(Number(avant)) && Number(avant) > 0 ? Number(avant) : undefined;
  const { entries, nextBefore } = await listAudit({ prefix, before });
  return (
    <>
      <PageHeader title="Journal d'activité" description="Toutes les entreprises" />
      <AuditTable
        entries={entries}
        baseHref="/admin/journal"
        prefix={prefix}
        nextBefore={nextBefore}
        showOrganization
      />
    </>
  );
}
