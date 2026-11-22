import { Copy, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { duplicateDojo, setDojoStatus } from "@/app/actions/dojos";
import { DojoView } from "@/components/dojo/dojo-view";
import { ToggleForm } from "@/components/org/toggle-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrgContext } from "@/lib/auth/org-context";
import { getDojo } from "@/lib/data/dojos";
import {
  canCreateDojo,
  canEditDojo,
  DOJO_PHASES,
  DOJO_SOURCE_LABELS,
  DOJO_STATUS_LABELS,
  type DojoPhase,
} from "@/lib/domain/dojo";
import { uuidSchema } from "@/lib/validation/schemas";

export const metadata: Metadata = { title: "Dojo" };

const STATUS_TONES = {
  brouillon: "muted",
  a_tester: "warning",
  valide: "success",
  archive: "muted",
} as const;

export default async function DojoPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/dojos/[id]">) {
  const { slug, id } = await params;
  const { phase } = await searchParams;
  if (!uuidSchema.safeParse(id).success) notFound();
  const context = await getOrgContext(slug);
  const dojo = await getDojo(context.organization.id, id);
  if (!dojo) notFound();

  const currentPhase: DojoPhase = DOJO_PHASES.some((p) => p.key === phase)
    ? (phase as DojoPhase)
    : "theorie";
  const editable = canEditDojo(context.role, context.user.id, dojo);
  const base = `/e/${slug}/dojos/${dojo.id}`;

  return (
    <>
      <Link
        href={`/e/${slug}/dojos`}
        className="text-sm font-semibold text-forest-light hover:underline"
      >
        ← Dojos
      </Link>
      <header className="mt-3 mb-6">
        <p className="text-sm font-semibold text-muted">
          {dojo.skill.competencyName} · {dojo.skill.name}
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{dojo.title}</h1>
        {dojo.tagline ? <p className="mt-1 text-muted">{dojo.tagline}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONES[dojo.status]}>{DOJO_STATUS_LABELS[dojo.status]}</Badge>
          <Badge tone="muted">{DOJO_SOURCE_LABELS[dojo.source]}</Badge>
          {dojo.content.hasPlaceholders ? (
            <Badge tone="warning">Modèle à compléter pour l&apos;entreprise</Badge>
          ) : null}
        </div>
        {canCreateDojo(context.role) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {editable ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`${base}/modifier`}>
                  <Pencil aria-hidden="true" />
                  Modifier
                </Link>
              </Button>
            ) : (
              <ToggleForm
                action={duplicateDojo}
                fields={{ id: dojo.id }}
                label="Copier pour l'adapter"
              />
            )}
            {editable && dojo.status === "brouillon" ? (
              <ToggleForm
                action={setDojoStatus}
                fields={{ id: dojo.id, status: "a_tester" }}
                label="Prêt à tester"
              />
            ) : null}
            {editable && dojo.status === "a_tester" ? (
              <ToggleForm
                action={setDojoStatus}
                fields={{ id: dojo.id, status: "valide" }}
                label="Testé : valider le Dojo"
                variant="secondary"
              />
            ) : null}
            {editable ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`${base}/modifier#actions`}>
                  <Copy aria-hidden="true" />
                  Autres actions
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      <DojoView content={dojo.content} phase={currentPhase} baseHref={base} />
    </>
  );
}
