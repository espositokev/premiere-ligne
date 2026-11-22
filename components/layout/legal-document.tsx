import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { fr } from "@/lib/i18n/fr";

export type LegalSection = { title: string; paragraphs: string[] };

/** Met en évidence chaque zone [À COMPLÉTER] pour qu'aucune ne soit oubliée. */
function highlightPlaceholders(text: string): ReactNode {
  const parts = text.split(/(\[À COMPLÉTER[^\]]*\])/g);
  return parts.map((part, index) =>
    part.startsWith("[À COMPLÉTER") ? (
      <mark key={index} className="rounded bg-fluo px-1 font-semibold text-forest-deep">
        {part}
      </mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function LegalDocument({
  title,
  updatedAt,
  sections,
}: {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-forest-light hover:underline">
        ← {fr.legal.backHome}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        Dernière mise à jour : {highlightPlaceholders(updatedAt)}
      </p>
      <p
        role="note"
        className="mt-6 rounded-(--radius-control) border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
      >
        {fr.legal.draftWarning}
      </p>
      {sections.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index} className="mt-3 leading-relaxed text-forest-deep/90">
              {highlightPlaceholders(paragraph)}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
