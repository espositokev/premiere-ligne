import type { Metadata } from "next";
import Link from "next/link";

import { AiUsageSummary } from "@/components/ai/ai-usage-summary";
import { SettingsForm } from "@/components/org/settings-form";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireOrgAdmin } from "@/lib/auth/require-org";
import { loadAiOverview } from "@/lib/data/ai-usage";
import { getOrgSettings } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Paramètres de l'entreprise" };

export default async function OrgSettingsPage({
  params,
}: PageProps<"/e/[slug]/parametres/entreprise">) {
  const { slug } = await params;
  const context = await requireOrgAdmin(slug);
  const [settings, aiOverview] = await Promise.all([
    getOrgSettings(context.organization.id),
    loadAiOverview(context.organization.id),
  ]);
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
      <Card className="mt-6 max-w-2xl">
        <CardTitle>Options IA</CardTitle>
        <div className="mt-3">
          <AiUsageSummary overview={aiOverview} />
        </div>
      </Card>
    </>
  );
}
