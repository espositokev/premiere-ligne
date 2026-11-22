import { ChevronRight, Grid3x3, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/ui/page";
import { requireOrgAdmin } from "@/lib/auth/require-org";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage({ params }: PageProps<"/e/[slug]/parametres">) {
  const { slug } = await params;
  await requireOrgAdmin(slug);
  const base = `/e/${slug}/parametres`;

  const entries: { href: string; icon: LucideIcon; title: string; text: string }[] = [
    {
      href: `${base}/utilisateurs`,
      icon: UserRound,
      title: "Utilisateurs",
      text: "Inviter, modifier un rôle, désactiver un accès.",
    },
    {
      href: `${base}/equipes`,
      icon: UsersRound,
      title: "Équipes",
      text: "Créer les équipes et leur attribuer des managers.",
    },
    {
      href: `${base}/referentiel`,
      icon: Grid3x3,
      title: "Matrice de compétences",
      text: "Adapter les compétences au métier de l'entreprise.",
    },
  ];

  return (
    <>
      <PageHeader title="Paramètres" />
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.href}>
            <Link
              href={entry.href}
              className="flex min-h-18 items-center gap-4 rounded-(--radius-card) border border-line bg-surface p-4 shadow-(--shadow-card) hover:border-forest"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-(--radius-control) bg-fluo text-forest-deep">
                <entry.icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display font-semibold">{entry.title}</span>
                <span className="block text-sm text-muted">{entry.text}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
