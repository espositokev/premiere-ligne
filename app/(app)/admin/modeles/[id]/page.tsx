import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteTemplate, setTemplatePublished } from "@/app/actions/frameworks";
import { FrameworkEditor } from "@/components/framework/framework-editor";
import { ToggleForm } from "@/components/org/toggle-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireSuperAdmin } from "@/lib/auth/current-user";
import { loadTemplateTree } from "@/lib/data/framework";
import { countTree } from "@/lib/domain/framework";
import { uuidSchema } from "@/lib/validation/schemas";

import { TemplateMetaForm } from "./template-meta-form";

export const metadata: Metadata = { title: "Modèle de matrice" };

export default async function TemplatePage({ params }: PageProps<"/admin/modeles/[id]">) {
  await requireSuperAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const loaded = await loadTemplateTree(id);
  if (!loaded) notFound();
  const { template, tree } = loaded;
  const counts = countTree(tree, true);

  return (
    <>
      <Link
        href="/admin/modeles"
        className="text-sm font-semibold text-forest-light hover:underline"
      >
        ← Modèles
      </Link>
      <PageHeader
        className="mt-3"
        title={template.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={template.published ? "success" : "muted"}>
              {template.published ? "Publié" : "Brouillon"}
            </Badge>
            <span>
              {counts.blocks} blocs · {counts.competencies} compétences · {counts.skills}{" "}
              sous-compétences
            </span>
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <FrameworkEditor tree={tree} scope="template" path={`/admin/modeles/${template.id}`} />
        <aside className="flex flex-col gap-4">
          <Card>
            <CardTitle>Informations</CardTitle>
            <div className="mt-4">
              <TemplateMetaForm
                id={template.id}
                name={template.name}
                description={template.description}
              />
            </div>
          </Card>
          <Card>
            <CardTitle>{template.published ? "Publié" : "Non publié"}</CardTitle>
            <CardDescription className="mt-2 mb-4 text-sm">
              {template.published
                ? "Ce modèle est proposé à la création d'une entreprise. Les entreprises qui l'utilisent déjà ont leur propre copie."
                : "Publiez le modèle pour le proposer à la création d'une entreprise."}
            </CardDescription>
            <ToggleForm
              action={setTemplatePublished}
              fields={{ id: template.id, published: template.published ? "false" : "true" }}
              label={template.published ? "Retirer des propositions" : "Publier le modèle"}
              variant={template.published ? "outline" : "secondary"}
            />
          </Card>
          <Card>
            <CardTitle>Supprimer le modèle</CardTitle>
            <CardDescription className="mt-2 mb-4 text-sm">
              Les entreprises qui l&apos;ont déjà utilisé gardent leur matrice.
            </CardDescription>
            <ToggleForm
              action={deleteTemplate}
              fields={{ id: template.id }}
              label="Supprimer"
              confirmLabel="Confirmer la suppression"
              variant="ghost"
            />
          </Card>
        </aside>
      </div>
    </>
  );
}
