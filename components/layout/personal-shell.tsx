import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth/current-user";

import { AppShell, type ShellNavItem } from "./app-shell";

/** Cadre des pages personnelles (profil, choix d'espace), hors d'un espace entreprise. */
export async function PersonalShell({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const nav: ShellNavItem[] = [];
  if (user.isSuperAdmin)
    nav.push({ label: "Administration", href: "/admin", icon: "home", exact: true });
  nav.push({ label: "Mes espaces", href: "/espaces", icon: "building" });
  nav.push({ label: "Profil", href: "/profil", icon: "profile" });

  return (
    <AppShell
      nav={nav}
      contextLabel="Mon compte"
      userName={`${user.firstName} ${user.lastName}`}
      showSpacesLink={false}
    >
      {children}
    </AppShell>
  );
}
