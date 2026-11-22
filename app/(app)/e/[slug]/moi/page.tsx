import { TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmptyState, PageHeader } from "@/components/ui/page";
import { getOrgContext } from "@/lib/auth/org-context";

export const metadata: Metadata = { title: "Ma progression" };

/** Espace du commercial (§4.9). Contenu à l'étape 5 ; tutoiement côté commercial (§10.1). */
export default async function MyProgressPage({ params }: PageProps<"/e/[slug]/moi">) {
  const { slug } = await params;
  const context = await getOrgContext(slug);
  if (context.role !== "sales_rep") redirect(`/e/${slug}`);

  return (
    <>
      <PageHeader
        title={`Salut ${context.user.firstName} !`}
        description={context.organization.name}
      />
      <EmptyState
        icon={TrendingUp}
        title="Ta progression arrive bientôt"
        text="Ici, tu verras ta matrice de compétences, tes coachings, ton plan d'action et tes Dojos."
      />
    </>
  );
}
