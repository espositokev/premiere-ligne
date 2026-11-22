import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { deleteDojo, setDojoStatus } from "@/app/actions/dojos";
import { DojoEditor } from "@/components/dojo/dojo-editor";
import { ToggleForm } from "@/components/org/toggle-form";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { getOrgContext } from "@/lib/auth/org-context";
import { getDojo } from "@/lib/data/dojos";
import { loadOrganizationTree } from "@/lib/data/framework";
import { canEditDojo } from "@/lib/domain/dojo";
import { uuidSchema } from "@/lib/validation/schemas";

export const metadata: Metadata = { title: "Modifier le Dojo" };

export default async function EditDojoPage({ params }: PageProps<"/e/[slug]/dojos/[id]/modifier">) {
  const { slug, id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const context = await getOrgContext(slug);
  const [dojo, framework] = await Promise.all([
    getDojo(context.organization.id, id),
    loadOrganizationTree(context.organization.id),
  ]);
  if (!dojo) notFound();
  if (!canEditDojo(context.role, context.user.id, dojo)) redirect(`/e/${slug}/dojos/${id}`);

  const skills = (framework?.tree.blocks ?? [])
    .flatMap((b) => b.competencies)
    .map((c) => ({
      label: c.name,
      skills: c.skills
        .filter((s) => s.active || s.id === dojo.skillId)
        .map((s) => ({ id: s.id, name: s.name })),
    }))
    .filter((group) => group.skills.length > 0);
  const admin = context.role === "org_admin" || context.role === "super_admin";

  return (
    <>
      <Link
        href={`/e/${slug}/dojos/${id}`}
        className="text-sm font-semibold text-forest-light hover:underline"
      >
        ← Voir le Dojo
      </Link>
      <PageHeader
        className="mt-3"
        title="Modifier le Dojo"
        description={`${dojo.skill.competencyName} · ${dojo.skill.name}`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <DojoEditor
          dojo={{ id: dojo.id, title: dojo.title, skillId: dojo.skillId, content: dojo.content }}
          skills={skills}
        />
        <aside id="actions" className="flex flex-col gap-4">
          <Card>
            <CardTitle>Cycle de vie</CardTitle>
            <CardDescription className="mt-2 mb-4 text-sm">
              Brouillon → À tester (le faire jouer une première fois avec un commercial volontaire)
              → Validé (visible par les commerciaux).
            </CardDescription>
            <div className="flex flex-col gap-2">
              {dojo.status !== "a_tester" ? (
                <ToggleForm
                  action={setDojoStatus}
                  fields={{ id: dojo.id, status: "a_tester" }}
                  label="Passer « à tester »"
                />
              ) : null}
              {dojo.status !== "valide" ? (
                <ToggleForm
                  action={setDojoStatus}
                  fields={{ id: dojo.id, status: "valide" }}
                  label="Valider"
                  variant="secondary"
                />
              ) : null}
              {dojo.status !== "archive" ? (
                <ToggleForm
                  action={setDojoStatus}
                  fields={{ id: dojo.id, status: "archive" }}
                  label="Archiver"
                  confirmLabel="Confirmer l'archivage"
                  variant="ghost"
                />
              ) : (
                <ToggleForm
                  action={setDojoStatus}
                  fields={{ id: dojo.id, status: "brouillon" }}
                  label="Sortir des archives"
                />
              )}
            </div>
          </Card>
          {admin || dojo.status === "brouillon" ? (
            <Card>
              <CardTitle>Supprimer</CardTitle>
              <CardDescription className="mt-2 mb-4 text-sm">
                Définitif. Préférez l&apos;archivage pour un Dojo déjà joué.
              </CardDescription>
              <ToggleForm
                action={deleteDojo}
                fields={{ id: dojo.id }}
                label="Supprimer le Dojo"
                confirmLabel="Confirmer la suppression"
                variant="ghost"
              />
            </Card>
          ) : null}
        </aside>
      </div>
    </>
  );
}
