import { canAdministerOrg, type SpaceRole } from "./roles";

export type NavIcon = "home" | "users" | "teams" | "team" | "progress" | "profile";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  /** Le lien est actif seulement sur son adresse exacte (sinon aussi sur ses sous-pages). */
  exact?: boolean;
};

/**
 * Entrées de navigation d'un espace entreprise selon le rôle.
 * Sur mobile, la barre d'onglets en affiche au plus 4 (§10.4) : on les garde courtes.
 */
export function orgNavigation(slug: string, role: SpaceRole): NavItem[] {
  const base = `/e/${slug}`;

  if (role === "sales_rep") {
    return [
      { label: "Ma progression", href: `${base}/moi`, icon: "progress" },
      { label: "Profil", href: "/profil", icon: "profile" },
    ];
  }

  const items: NavItem[] = [
    { label: "Accueil", href: base, icon: "home", exact: true },
    {
      label: canAdministerOrg(role) ? "Commerciaux" : "Mon équipe",
      href: `${base}/equipe`,
      icon: "team",
    },
  ];

  if (canAdministerOrg(role)) {
    items.push({ label: "Utilisateurs", href: `${base}/parametres/utilisateurs`, icon: "users" });
    items.push({ label: "Équipes", href: `${base}/parametres/equipes`, icon: "teams" });
  } else {
    items.push({ label: "Profil", href: "/profil", icon: "profile" });
  }

  return items;
}

export function isNavItemActive(item: Pick<NavItem, "href" | "exact">, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Page d'arrivée après connexion. */
export function homePathFor(input: {
  isSuperAdmin: boolean;
  spaces: { slug: string; role: SpaceRole }[];
}): string {
  if (input.isSuperAdmin) return "/admin";
  const [first, ...others] = input.spaces;
  if (!first) return "/espaces";
  if (others.length > 0) return "/espaces";
  return first.role === "sales_rep" ? `/e/${first.slug}/moi` : `/e/${first.slug}`;
}
