import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireSuperAdmin } from "@/lib/auth/current-user";

import { NewOrganizationForm } from "./new-organization-form";

export const metadata: Metadata = { title: "Nouvelle entreprise" };

export default async function NewOrganizationPage() {
  await requireSuperAdmin();
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
        title="Nouvelle entreprise"
        description="Vous inviterez ensuite son responsable et ses managers."
      />
      <Card className="max-w-xl">
        <NewOrganizationForm />
      </Card>
    </>
  );
}
