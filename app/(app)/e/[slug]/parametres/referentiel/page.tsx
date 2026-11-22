import { Grid3x3 } from "lucide-react";
import type { Metadata } from "next";

import { FrameworkEditor } from "@/components/framework/framework-editor";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireCoach } from "@/lib/auth/require-org";
import { listTemplates, loadOrganizationTree } from "@/lib/data/framework";
import { countTree } from "@/lib/domain/framework";

import { ApplyTemplateForm } from "@/components/framework/apply-template-form";

export const metadata: Metadata = { title: "Matrice de compétences" };

/** Matrice sur mesure de l'entreprise, ajustée sur le terrain (§4.4). */
export default async function FrameworkPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/parametres/referentiel">) {
  const { slug } = await params;
  const { desactives } = await searchParams;
  // Responsable et managers font évoluer la matrice ; la mettre en place reste au super admin.
  const context = await requireCoach(slug);
  const loaded = await loadOrganizationTree(context.organization.id);
  const path = `/e/${slug}/parametres/referentiel`;

  if (!loaded) {
    const templates =
      context.role === "super_admin" ? await listTemplates({ publishedOnly: true }) : [];
    return (
      <>
        <PageHeader title="Matrice de compétences" />
        {context.role === "super_admin" ? (
          <Card className="max-w-xl">
            <p className="mb-4 text-muted">
              Cette entreprise n&apos;a pas encore de matrice. Choisissez le modèle de départ : il
              sera copié ici, puis vous l&apos;adapterez avec le client.
            </p>
            <ApplyTemplateForm
              organizationId={context.organization.id}
              templates={templates.map((t) => ({ id: t.id, name: t.name }))}
            />
          </Card>
        ) : (
          <EmptyState
            icon={Grid3x3}
            title="Votre matrice arrive bientôt"
            text="Première Ligne la construit avec vous lors de la première journée terrain."
          />
        )}
      </>
    );
  }

  const counts = countTree(loaded.tree);
  return (
    <>
      <PageHeader
        title="Matrice de compétences"
        description={`${counts.competencies} compétences · ${counts.skills} sous-compétences notées de 0 à 4. Elle s'applique à tous les commerciaux de l'entreprise.`}
      />
      <FrameworkEditor
        tree={loaded.tree}
        scope="org"
        path={path}
        usedSkillIds={loaded.usedSkillIds}
        showInactive={desactives === "1"}
      />
    </>
  );
}
