import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { generationAvailable } from "@/lib/ai/dojo-generator";
import { getOrgContext } from "@/lib/auth/org-context";
import { loadOrganizationTree } from "@/lib/data/framework";
import { canCreateDojo } from "@/lib/domain/dojo";

import { NewDojoForm } from "./new-dojo-form";

export const metadata: Metadata = { title: "Nouveau Dojo" };

export default async function NewDojoPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/dojos/nouveau">) {
  const { slug } = await params;
  const { competence } = await searchParams;
  const context = await getOrgContext(slug);
  if (!canCreateDojo(context.role)) redirect(`/e/${slug}/dojos`);
  const framework = await loadOrganizationTree(context.organization.id);

  const options = (framework?.tree.blocks ?? [])
    .filter((b) => b.active)
    .flatMap((b) => b.competencies.filter((c) => c.active))
    .map((competency) => ({
      label: competency.name,
      skills: competency.skills.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name })),
    }))
    .filter((group) => group.skills.length > 0);

  return (
    <>
      <Link
        href={`/e/${slug}/dojos`}
        className="text-sm font-semibold text-forest-light hover:underline"
      >
        ← Dojos
      </Link>
      <PageHeader
        className="mt-3"
        title="Nouveau Dojo"
        description="Un Dojo répond toujours à un besoin repéré sur la matrice : choisissez d'abord la sous-compétence à faire progresser."
      />
      <Card className="max-w-2xl">
        {options.length === 0 ? (
          <p className="text-muted">
            La matrice de l&apos;entreprise n&apos;est pas encore en place.
          </p>
        ) : (
          <NewDojoForm
            organizationId={context.organization.id}
            options={options}
            defaultSkillId={typeof competence === "string" ? competence : undefined}
            generationAvailable={generationAvailable()}
          />
        )}
      </Card>
    </>
  );
}
