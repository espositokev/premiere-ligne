import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/ui/page";
import { requireSuperAdmin } from "@/lib/auth/current-user";
import { listTemplates } from "@/lib/data/framework";

import { NewTemplateForm } from "./new-template-form";

export const metadata: Metadata = { title: "Modèles de matrice" };

export default async function TemplatesPage() {
  await requireSuperAdmin();
  const templates = await listTemplates();

  return (
    <>
      <PageHeader
        title="Modèles de matrice"
        description="Les matrices de référence de Première Ligne. Un modèle publié est proposé à la création d'une entreprise, puis copié chez le client."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="flex flex-col gap-3">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/admin/modeles/${template.id}`}
                className="flex items-center gap-4 rounded-(--radius-card) border border-line bg-surface p-4 shadow-(--shadow-card) hover:border-forest"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-semibold">{template.name}</span>
                    <Badge tone={template.published ? "success" : "muted"}>
                      {template.published ? "Publié" : "Brouillon"}
                    </Badge>
                  </span>
                  {template.description ? (
                    <span className="mt-1 block text-sm text-muted">{template.description}</span>
                  ) : null}
                  <span className="mt-1 block text-xs font-semibold text-muted">
                    {template.skillCount} sous-compétences
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
        <aside>
          <SectionTitle>Nouveau modèle</SectionTitle>
          <Card>
            <NewTemplateForm templates={templates.map((t) => ({ id: t.id, name: t.name }))} />
          </Card>
        </aside>
      </div>
    </>
  );
}
