import type { Metadata } from "next";
import Link from "next/link";

import { SettingsForm } from "@/components/org/settings-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireOrgAdmin } from "@/lib/auth/require-org";
import { getOrgSettings } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Paramètres de l'entreprise" };

export default async function OrgSettingsPage({
  params,
}: PageProps<"/e/[slug]/parametres/entreprise">) {
  const { slug } = await params;
  const context = await requireOrgAdmin(slug);
  const settings = await getOrgSettings(context.organization.id);
  return (
    <>
      <Link
        href={`/e/${slug}/parametres`}
        className="text-sm font-semibold text-forest-light hover:underline"
      >
        ← Paramètres
      </Link>
      <PageHeader className="mt-3" title="Fonctionnement" description={context.organization.name} />
      <Card className="max-w-2xl">
        <SettingsForm slug={slug} organizationId={context.organization.id} settings={settings} />
      </Card>
    </>
  );
}
