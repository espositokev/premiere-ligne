import { BookOpen, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { getOrgContext } from "@/lib/auth/org-context";
import { loadOrganizationTree } from "@/lib/data/framework";
import { listDojos, type DojoSummary } from "@/lib/data/dojos";
import { canCreateDojo, DOJO_STATUS_LABELS } from "@/lib/domain/dojo";

export const metadata: Metadata = { title: "Dojos" };

const STATUS_TONES = {
  brouillon: "muted",
  a_tester: "warning",
  valide: "success",
  archive: "muted",
} as const;

/** Bibliothèque de Dojos de l'entreprise, rangée comme la matrice (§ décision Dojos). */
export default async function DojosPage({ params, searchParams }: PageProps<"/e/[slug]/dojos">) {
  const { slug } = await params;
  const { q } = await searchParams;
  const context = await getOrgContext(slug);
  const orgId = context.organization.id;
  const [dojos, framework] = await Promise.all([listDojos(orgId), loadOrganizationTree(orgId)]);

  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const matches = (dojo: DojoSummary) =>
    !query || `${dojo.title} ${dojo.tagline ?? ""}`.toLowerCase().includes(query);

  const groups = (framework?.tree.blocks ?? [])
    .flatMap((block) => block.competencies)
    .map((competency) => ({
      competency,
      skills: competency.skills
        .map((skill) => ({
          skill,
          dojos: dojos.filter((d) => d.skillId === skill.id && matches(d)),
        }))
        .filter((entry) => entry.dojos.length > 0),
    }))
    .filter((group) => group.skills.length > 0);

  const total = dojos.filter(matches).length;
  const base = `/e/${slug}/dojos`;

  return (
    <>
      <PageHeader
        title="Dojos"
        description="Des exercices en 3 phases pour faire progresser un geste : Théorie, Offline, Online."
        action={
          canCreateDojo(context.role) ? (
            <Button asChild>
              <Link href={`${base}/nouveau`}>
                <Plus aria-hidden="true" />
                Nouveau Dojo
              </Link>
            </Button>
          ) : undefined
        }
      />

      <form role="search" className="mb-6">
        <label htmlFor="dojo-search" className="sr-only">
          Rechercher un Dojo
        </label>
        <input
          id="dojo-search"
          name="q"
          defaultValue={query}
          placeholder={`Rechercher parmi ${dojos.length} Dojos…`}
          className="min-h-11 w-full rounded-(--radius-control) border border-line bg-surface px-3"
        />
      </form>

      {total === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={query ? "Aucun Dojo ne correspond" : "Pas encore de Dojo"}
          text={
            query
              ? "Essayez un autre mot."
              : "Les Dojos arrivent avec la matrice de l'entreprise. Vous pouvez aussi en créer."
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(({ competency, skills }) => (
            <section key={competency.id}>
              <h2 className="mb-1 text-lg font-semibold">{competency.name}</h2>
              {competency.statement ? (
                <p className="mb-3 text-sm text-muted">{competency.statement}</p>
              ) : null}
              <ul className="divide-y divide-line rounded-(--radius-card) border border-line bg-surface">
                {skills.flatMap(({ skill, dojos: skillDojos }) =>
                  skillDojos.map((dojo) => (
                    <li key={dojo.id}>
                      <Link
                        href={`${base}/${dojo.id}`}
                        className="flex items-center gap-3 p-4 hover:bg-bone/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{dojo.title}</span>
                          {dojo.tagline ? (
                            <span className="block text-sm text-muted">{dojo.tagline}</span>
                          ) : null}
                          <span className="mt-1.5 flex flex-wrap gap-2">
                            <Badge tone="muted">{skill.name}</Badge>
                            {dojo.status !== "valide" ? (
                              <Badge tone={STATUS_TONES[dojo.status]}>
                                {DOJO_STATUS_LABELS[dojo.status]}
                              </Badge>
                            ) : null}
                          </span>
                        </span>
                        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
                      </Link>
                    </li>
                  )),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
