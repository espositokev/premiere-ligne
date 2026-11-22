"use client";

import {
  BookOpen,
  Building2,
  Grid3x3,
  Settings,
  House,
  LogOut,
  TrendingUp,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/brand/logo";
import { activeNavHref, type NavIcon, type NavItem } from "@/lib/domain/navigation";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon | "building", LucideIcon> = {
  home: House,
  users: UserRound,
  teams: UsersRound,
  team: Users,
  progress: TrendingUp,
  profile: UserRound,
  building: Building2,
  matrix: Grid3x3,
  dojo: BookOpen,
  settings: Settings,
};

export type ShellNavItem = Omit<NavItem, "icon"> & { icon: NavIcon | "building" };

type AppShellProps = {
  nav: ShellNavItem[];
  /** Nom affiché sous le logo : l'entreprise, ou « Administration ». */
  contextLabel: string;
  userName: string;
  /** Lien « Changer d'espace » quand l'utilisateur a plusieurs espaces. */
  showSpacesLink: boolean;
  banner?: ReactNode;
  children: ReactNode;
};

/**
 * Cadre des pages connectées : barre latérale sur ordinateur,
 * en-tête compact et barre d'onglets en bas sur mobile (§10.4).
 */
export function AppShell({
  nav,
  contextLabel,
  userName,
  showSpacesLink,
  banner,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const mobileNav = nav.slice(0, 4);
  const currentHref = activeNavHref(nav, pathname);

  return (
    <div className="flex min-h-full flex-1">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-forest text-bone lg:flex">
        <div className="px-5 pt-6 pb-4">
          <Logo variant="dark" />
          <p className="mt-4 truncate text-sm font-semibold text-fluo" title={contextLabel}>
            {contextLabel}
          </p>
        </div>
        <nav aria-label="Navigation principale" className="flex-1 px-3">
          <ul className="flex flex-col gap-1">
            {nav.map((item) => {
              const Icon = ICONS[item.icon];
              const active = item.href === currentHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-(--radius-control) px-3 font-medium transition-colors",
                      active
                        ? "bg-fluo text-forest-deep"
                        : "text-bone/85 hover:bg-bone/10 hover:text-bone",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-bone/15 p-3">
          <UserMenu userName={userName} showSpacesLink={showSpacesLink} dark />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* En-tête (mobile) */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <Logo kind="mark" className="h-7" />
            <span className="truncate font-display text-sm font-semibold">{contextLabel}</span>
          </div>
          <details className="relative">
            <summary
              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full bg-forest font-display text-sm font-bold text-bone [&::-webkit-details-marker]:hidden"
              aria-label="Menu du compte"
            >
              {initials(userName)}
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-(--radius-card) border border-line bg-surface p-2 shadow-(--shadow-card)">
              <UserMenu userName={userName} showSpacesLink={showSpacesLink} />
            </div>
          </details>
        </header>

        {banner}

        <main className="flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>

        {/* Barre d'onglets (mobile) */}
        {mobileNav.length > 1 ? (
          <nav
            aria-label="Navigation principale"
            className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
          >
            <ul className="mx-auto flex max-w-lg">
              {mobileNav.map((item) => {
                const Icon = ICONS[item.icon];
                const active = item.href === currentHref;
                return (
                  <li key={item.href} className="flex-1">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                        active ? "text-forest-deep" : "text-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                          active && "bg-fluo",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function UserMenu({
  userName,
  showSpacesLink,
  dark = false,
}: {
  userName: string;
  showSpacesLink: boolean;
  dark?: boolean;
}) {
  const itemClass = cn(
    "flex min-h-11 w-full items-center gap-3 rounded-(--radius-control) px-3 text-left text-sm font-medium",
    dark ? "text-bone/85 hover:bg-bone/10 hover:text-bone" : "text-forest-deep hover:bg-bone",
  );
  return (
    <div className="flex flex-col gap-1">
      <p
        className={cn(
          "truncate px-3 py-2 text-sm font-semibold",
          dark ? "text-bone" : "text-forest-deep",
        )}
      >
        {userName}
      </p>
      <Link href="/profil" className={itemClass}>
        <UserRound aria-hidden="true" className="size-4" />
        Mon profil
      </Link>
      {showSpacesLink ? (
        <Link href="/espaces" className={itemClass}>
          <Building2 aria-hidden="true" className="size-4" />
          Changer d&apos;espace
        </Link>
      ) : null}
      <form action={signOut}>
        <button type="submit" className={itemClass}>
          <LogOut aria-hidden="true" className="size-4" />
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
