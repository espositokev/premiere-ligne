import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

/** En-tête et pied de page des pages publiques (accueil, pages légales, connexion). */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label={`${fr.brand.name}, accueil`}>
            <Logo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/connexion"
              className="px-2 py-2 text-sm font-medium text-forest-deep transition-colors hover:text-forest-light"
            >
              {fr.home.login}
            </Link>
            <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
              <a href={`mailto:${fr.home.contactEmail}`}>{fr.home.contact}</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {fr.brand.name} · {fr.brand.tagline}
          </p>
          <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/mentions-legales" className="hover:text-forest-deep hover:underline">
              {fr.legal.notice}
            </Link>
            <Link href="/confidentialite" className="hover:text-forest-deep hover:underline">
              {fr.legal.privacy}
            </Link>
            <Link href="/cgu" className="hover:text-forest-deep hover:underline">
              {fr.legal.terms}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
